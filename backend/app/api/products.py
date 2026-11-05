import asyncio
import urllib.parse
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Header, BackgroundTasks, status, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.supabase_client import supabase
from app.core.auth import get_current_user_id, verify_artisan_owner
from app.core.limiter import limiter
from app.services.ai_service import generate_product_listing, parse_search_intent
from app.services.storage_service import upload_image, save_product, upload_audio
from app.services.image_service import remove_background_with_fallback
from app.services.email_service import send_new_product_notification, send_back_in_stock_notification
from app.schemas.product import BatchProductResponse, GeneratedProduct, ProductPatchUpdate

router = APIRouter()


class PriceUpdate(BaseModel):
    price_inr: Optional[int] = None
    price: Optional[int] = None
    price_usd: Optional[float] = None
    suggested_usd_price: Optional[float] = None


class StockUpdate(BaseModel):
    stock_quantity: int = Field(..., ge=0)


class SearchIntentRequest(BaseModel):
    query: str
    language: Optional[str] = "en"


@router.post("/search-intent")
async def get_search_intent(req: SearchIntentRequest):
    """Semantic conversational search parser using Gemini Flash."""
    intent = await parse_search_intent(req.query, req.language or "en")
    return {"status": "success", "intent": intent}



def _build_whatsapp_link(product: dict, product_id: str) -> str:
    hashtags = " ".join(f"#{t.replace(' ', '')}" for t in product.get("tags", []))
    text = "\n".join([
        f"🛍️ *{product.get('ai_title_en', '')}*",
        product.get("ai_title_local", ""),
        "",
        f"*Price:* ₹{product.get('price_inr', 'N/A')}",
        "",
        product.get("ai_desc_en", ""),
        "",
        f"Tags: {hashtags}",
        "",
        f"Product ID: {product_id}",
        "Reply to order directly from the artisan!",
    ])
    return f"https://wa.me/?text={urllib.parse.quote(text)}"


async def _process_and_upload_image(img_file: UploadFile, remove_bg: bool = False) -> str:
    """Read image bytes, conditionally remove background, and upload to Supabase Storage."""
    image_bytes = await img_file.read()
    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded photo '{img_file.filename}' is corrupted or empty. Please upload a clear photo.",
        )
    if remove_bg:
        processed_bytes = await remove_background_with_fallback(image_bytes, timeout_seconds=8.0)
    else:
        processed_bytes = image_bytes

    return await asyncio.to_thread(upload_image, processed_bytes, "image/jpeg")


@router.post("/generate", response_model=BatchProductResponse)
@limiter.limit("5/minute")
async def generate_listing(
    request: Request,
    background_tasks: BackgroundTasks,
    artisan_id: uuid.UUID = Form(...),
    images: List[UploadFile] = File(...),
    audio: UploadFile = File(...),
    manual_price: Optional[int] = Form(None),
    stock_quantity: Optional[int] = Form(1),
    estimated_weaving_days: Optional[int] = Form(None),
    authorization: Optional[str] = Header(None),
):
    # Strict authentication: ensure the caller is authorized for this artisan_id
    await verify_artisan_owner(str(artisan_id), authorization)

    # Pre-flight check: images
    if not images:
        raise HTTPException(status_code=422, detail="At least one product image is required.")

    for i, img in enumerate(images):
        mime = (img.content_type or "").lower()
        if not mime.startswith("image/"):
            raise HTTPException(
                status_code=422,
                detail=f"File '{img.filename or f'image_{i+1}'}' is not a supported image format. Please upload JPEG, PNG, or WebP.",
            )

    # Pre-flight check: audio
    try:
        audio_bytes = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read audio file: {e}")

    if not audio_bytes or len(audio_bytes) < 512:
        raise HTTPException(
            status_code=422,
            detail="Voice note description is too short or silent. Please speak clearly while holding the microphone for at least 3 seconds.",
        )

    audio_mime = audio.content_type or "audio/webm"

    try:
        # 1. Upload audio to product-audio bucket asynchronously
        audio_url = await asyncio.to_thread(upload_audio, audio_bytes, audio_mime)
        effective_qty = stock_quantity if (stock_quantity is not None and stock_quantity >= 0) else 1

        # 2. Process primary image (images[0]) with background removal for cover photo
        primary_file = images[0]
        primary_bytes = await primary_file.read()
        if len(primary_bytes) < 100:
            raise HTTPException(
                status_code=422,
                detail=f"Uploaded photo '{primary_file.filename}' is corrupted or empty.",
            )
        processed_primary_bytes = await remove_background_with_fallback(primary_bytes, timeout_seconds=8.0)
        primary_image_url = await asyncio.to_thread(upload_image, processed_primary_bytes, "image/jpeg")

        # 3. Process remaining images concurrently without duplicate background removal
        async def _upload_secondary(img_file: UploadFile) -> str:
            raw_bytes = await img_file.read()
            if len(raw_bytes) >= 100:
                return await asyncio.to_thread(upload_image, raw_bytes, "image/jpeg")
            return ""

        secondary_tasks = [_upload_secondary(img) for img in images[1:]]
        secondary_urls = await asyncio.gather(*secondary_tasks) if secondary_tasks else []
        all_image_urls = [primary_image_url] + [u for u in secondary_urls if u]

        # 4. Call Gemini AI with primary studio image + shared audio note
        ai_data = await generate_product_listing(
            image_bytes=processed_primary_bytes,
            image_mime="image/jpeg",
            audio_bytes=audio_bytes,
            audio_mime=audio_mime,
        )

        # 5. Persist EXACTLY ONE product record to Supabase DB with ordered images array
        saved = await asyncio.to_thread(
            save_product,
            str(artisan_id),
            primary_image_url,
            audio_url,
            ai_data,
            manual_price,
            effective_qty,
            estimated_weaving_days,
            images=all_image_urls,
        )

        product_id = str(saved.get("id", ""))
        effective_price = saved.get("price") or saved.get("price_inr") or manual_price or ai_data.get("price_inr")
        effective_usd = saved.get("price_usd") or ai_data.get("suggested_usd_price")
        export_desc = saved.get("export_description") or ai_data.get("export_description", "")
        qty = saved.get("stock_quantity", effective_qty)
        weaving_days = saved.get("estimated_weaving_days", estimated_weaving_days)
        product_images = saved.get("images") or all_image_urls

        single_product = GeneratedProduct(
            product_id=product_id,
            image_url=primary_image_url,
            images=product_images,
            audio_url=audio_url,
            suggested_price_range=ai_data.get("suggested_price_range", ""),
            suggested_usd_price=effective_usd,
            price_usd=effective_usd,
            export_description=export_desc,
            ai_title_en=ai_data.get("ai_title_en", ""),
            ai_title_local=ai_data.get("ai_title_local", ""),
            ai_desc_en=ai_data.get("ai_desc_en", ""),
            ai_desc_local=ai_data.get("ai_desc_local", ""),
            translations=saved.get("translations") or ai_data.get("translations"),
            price_inr=effective_price,
            tags=ai_data.get("tags", []),
            whatsapp_link=_build_whatsapp_link(ai_data, product_id),
            stock_quantity=qty,
            in_stock=qty > 0,
            estimated_weaving_days=weaving_days,
        )

        # Background Task: Alert subscriber community of new handcrafted masterpiece
        try:
            artisan_res = supabase.table("artisans").select("full_name").eq("id", str(artisan_id)).execute()
            artisan_name = artisan_res.data[0]["full_name"] if (artisan_res.data and len(artisan_res.data) > 0) else "Artisan"
            background_tasks.add_task(
                send_new_product_notification,
                artisan_name=artisan_name,
                product_title=single_product.ai_title_en or "Heritage Handloom Creation",
                image_url=primary_image_url,
                product_id=product_id,
                price_inr=single_product.price_inr,
                artisan_id=str(artisan_id),
            )
        except Exception as bg_err:
            print(f"Notice: Background email scheduling deferred: {bg_err}")

        return BatchProductResponse(
            status="success",
            products=[single_product],
            count=1,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Catalog generation failed: {str(e)}",
        )


@router.get("/shop/{artisan_id}")
async def get_artisan_products(artisan_id: str):
    """Fetch all products for a given artisan (used by the public storefront)."""
    try:
        response = (
            supabase.table("products")
            .select("*")
            .eq("artisan_id", artisan_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"status": "success", "products": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}")
async def get_single_product(product_id: str):
    """Fetch a single product along with artisan details for deep linking."""
    try:
        prod_res = (
            supabase.table("products")
            .select("*, artisan:artisans(*)")
            .eq("id", product_id)
            .execute()
        )
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"status": "success", "product": prod_res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{product_id}")
async def patch_product(
    product_id: str,
    update: ProductPatchUpdate,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    """
    Unified Product Patch Endpoint:
    Allows artisans to update price, stock_quantity, and estimated_weaving_days.
    """
    caller_id = await get_current_user_id(authorization)

    prod_res = (
        supabase.table("products")
        .select("artisan_id, stock_quantity, ai_title_en, image_url, price, price_inr")
        .eq("id", product_id)
        .execute()
    )
    if not prod_res.data:
        raise HTTPException(status_code=404, detail="Product not found")

    prod = prod_res.data[0]
    prod_owner = str(prod.get("artisan_id", ""))
    if caller_id != "service-role-admin" and prod_owner.lower() != caller_id.lower():
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only modify your own creations.",
        )

    patch_data = {}
    val = update.price if update.price is not None else update.price_inr
    if val is not None:
        patch_data["price_inr"] = val
        patch_data["price"] = val
    if update.price_usd is not None:
        patch_data["price_usd"] = update.price_usd
        patch_data["suggested_usd_price"] = update.price_usd
    if update.stock_quantity is not None:
        if update.stock_quantity < 0:
            raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")
        patch_data["stock_quantity"] = update.stock_quantity
        patch_data["in_stock"] = update.stock_quantity > 0
    if update.estimated_weaving_days is not None:
        patch_data["estimated_weaving_days"] = update.estimated_weaving_days if update.estimated_weaving_days > 0 else None

    if not patch_data:
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    try:
        supabase.table("products").update(patch_data).eq("id", product_id).execute()
        
        # Check restock trigger for notifications
        previous_stock = prod.get("stock_quantity") or 0
        new_stock = patch_data.get("stock_quantity")
        if new_stock is not None and previous_stock == 0 and new_stock > 0:
            try:
                artisan_res = supabase.table("artisans").select("full_name").eq("id", prod_owner).execute()
                artisan_name = artisan_res.data[0]["full_name"] if (artisan_res.data and len(artisan_res.data) > 0) else "Artisan"
                background_tasks.add_task(
                    send_back_in_stock_notification,
                    artisan_name=artisan_name,
                    product_title=prod.get("ai_title_en") or "Heritage Handloom Creation",
                    image_url=prod.get("image_url") or "",
                    product_id=product_id,
                    price_inr=prod.get("price") or prod.get("price_inr"),
                    artisan_id=prod_owner,
                )
            except Exception as bg_err:
                print(f"Notice: Restock email scheduling deferred: {bg_err}")

        return {"status": "success", "updated": patch_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{product_id}/price")
async def update_product_price(
    product_id: str,
    update: PriceUpdate,
    authorization: Optional[str] = Header(None)
):
    caller_id = await get_current_user_id(authorization)

    if caller_id != "service-role-admin":
        prod_res = supabase.table("products").select("artisan_id").eq("id", product_id).execute()
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Product not found")
        prod_owner = str(prod_res.data[0].get("artisan_id", ""))
        if prod_owner.lower() != caller_id.lower():
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You can only update prices for your own creations.",
            )

    try:
        val = update.price if update.price is not None else update.price_inr
        patch_data = {}
        if val is not None:
            patch_data["price_inr"] = val
            patch_data["price"] = val
        if update.price_usd is not None:
            patch_data["price_usd"] = update.price_usd
            patch_data["suggested_usd_price"] = update.price_usd

        if not patch_data:
            raise HTTPException(status_code=400, detail="Price or price_usd is required")

        try:
            supabase.table("products").update(patch_data).eq("id", product_id).execute()
        except Exception as e:
            if "PGRST204" in str(e) or "price_usd" in str(e) or "schema cache" in str(e):
                patch_data.pop("price_usd", None)
                patch_data.pop("suggested_usd_price", None)
                if patch_data:
                    supabase.table("products").update(patch_data).eq("id", product_id).execute()
            else:
                raise e
        return {"status": "success", "updated": patch_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{product_id}/decrement-stock")
async def decrement_product_stock_endpoint(product_id: str):
    """
    Atomic Stock Decrement Endpoint:
    Decrements product inventory by 1 atomically to prevent race condition overselling.
    Returns HTTP 409 Conflict if stock is 0 (sold out).
    """
    try:
        # 1. Try Supabase RPC atomic stored procedure
        try:
            rpc_res = supabase.rpc("decrement_product_stock", {"p_product_id": product_id}).execute()
            if rpc_res.data:
                res_obj = rpc_res.data
                if res_obj.get("success") is False:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Item has just sold out. Please explore other handloom creations."
                    )
                return {"status": "success", "remaining_stock": res_obj.get("remaining_stock", 0)}
        except HTTPException:
            raise
        except Exception as rpc_err:
            print(f"RPC decrement fallback to direct table operation: {rpc_err}")

        # 2. Resilient table fallback
        prod_res = supabase.table("products").select("stock_quantity, in_stock").eq("id", product_id).execute()
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Product not found")

        current_stock = prod_res.data[0].get("stock_quantity")
        if current_stock is None:
            current_stock = 1 if prod_res.data[0].get("in_stock", True) else 0

        if current_stock <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Item has just sold out. Please explore other handloom creations."
            )

        new_stock = max(0, current_stock - 1)
        supabase.table("products").update({
            "stock_quantity": new_stock,
            "in_stock": new_stock > 0,
        }).eq("id", product_id).execute()

        return {"status": "success", "remaining_stock": new_stock}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{product_id}/stock")
async def update_product_stock(
    product_id: str,
    update: StockUpdate,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    """
    Manual Stock Adjustment Endpoint:
    Artisan updates stock for their creation with strict JWT authorization.
    If restocked from 0 to >0, triggers a BackgroundTasks job to email the subscriber community.
    """
    if update.stock_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")

    caller_id = await get_current_user_id(authorization)

    prod_res = (
        supabase.table("products")
        .select("artisan_id, stock_quantity, ai_title_en, image_url, price, price_inr")
        .eq("id", product_id)
        .execute()
    )
    if not prod_res.data:
        raise HTTPException(status_code=404, detail="Product not found")

    prod = prod_res.data[0]
    prod_owner = str(prod.get("artisan_id", ""))
    if caller_id != "service-role-admin" and prod_owner.lower() != caller_id.lower():
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only adjust inventory for your own creations.",
        )

    previous_stock = prod.get("stock_quantity") or 0
    new_stock = update.stock_quantity

    try:
        supabase.table("products").update({
            "stock_quantity": new_stock,
            "in_stock": new_stock > 0,
        }).eq("id", product_id).execute()

        # If restocked from 0 to >0, alert subscriber community
        if previous_stock == 0 and new_stock > 0:
            try:
                artisan_res = supabase.table("artisans").select("full_name").eq("id", prod_owner).execute()
                artisan_name = artisan_res.data[0]["full_name"] if (artisan_res.data and len(artisan_res.data) > 0) else "Artisan"
                background_tasks.add_task(
                    send_back_in_stock_notification,
                    artisan_name=artisan_name,
                    product_title=prod.get("ai_title_en") or "Heritage Handloom Creation",
                    image_url=prod.get("image_url") or "",
                    product_id=product_id,
                    price_inr=prod.get("price") or prod.get("price_inr"),
                    artisan_id=prod_owner,
                )
            except Exception as bg_err:
                print(f"Notice: Restock email scheduling deferred: {bg_err}")

        return {"status": "success", "stock_quantity": new_stock, "in_stock": new_stock > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backfill-translations")
async def backfill_translations(
    artisan_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """
    Backfills missing multilingual translations (en, bn, hi) for existing products using Gemini 2.5 Flash.
    """
    from app.services.ai_service import translate_existing_product_text

    caller_id = await get_current_user_id(authorization)

    query = supabase.table("products").select("id, artisan_id, ai_title_en, ai_title_local, ai_desc_en, ai_desc_local, export_description, translations")
    if artisan_id:
        query = query.eq("artisan_id", artisan_id)
    elif caller_id != "service-role-admin" and caller_id:
        # By default, artisan backfills their own products unless admin
        query = query.eq("artisan_id", caller_id)

    res = query.execute()
    products = res.data or []

    updated_count = 0
    for prod in products:
        p_id = prod["id"]
        translations = prod.get("translations")
        has_full_translations = (
            isinstance(translations, dict)
            and translations.get("title", {}).get("en")
            and translations.get("title", {}).get("bn")
            and translations.get("title", {}).get("hi")
            and translations.get("description", {}).get("en")
            and translations.get("description", {}).get("bn")
            and translations.get("description", {}).get("hi")
        )
        if has_full_translations:
            continue

        title = prod.get("ai_title_local") or prod.get("ai_title_en") or "Handloom Creation"
        desc = prod.get("ai_desc_local") or prod.get("ai_desc_en") or prod.get("export_description") or ""

        try:
            new_translations = await translate_existing_product_text(title, desc)
            titles = new_translations.get("title", {})
            descriptions = new_translations.get("description", {})

            supabase.table("products").update({
                "translations": new_translations,
                "ai_title_en": titles.get("en") or prod.get("ai_title_en"),
                "ai_title_local": titles.get("bn") or prod.get("ai_title_local"),
                "ai_desc_en": descriptions.get("en") or prod.get("ai_desc_en"),
                "ai_desc_local": descriptions.get("bn") or prod.get("ai_desc_local"),
            }).eq("id", p_id).execute()
            updated_count += 1
        except Exception as err:
            print(f"Error backfilling product {p_id}: {err}")

    return {"status": "success", "updated_count": updated_count, "total_scanned": len(products)}
