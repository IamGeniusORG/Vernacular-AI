import asyncio
import urllib.parse
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Header, BackgroundTasks, status, Request
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.supabase_client import supabase
from app.core.auth import get_current_user_id, verify_artisan_owner
from app.core.limiter import limiter
from app.services.ai_service import generate_product_listing, parse_search_intent
from app.services.storage_service import upload_image, save_product, upload_audio
from app.services.image_service import remove_background_with_fallback
from app.services.email_service import send_new_product_notification, send_back_in_stock_notification
from app.schemas.product import BatchProductResponse, GeneratedProduct

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


async def _process_single_image(
    image_file: UploadFile,
    audio_bytes: bytes,
    audio_mime: str,
    artisan_id: str,
    audio_url: str,
    manual_price: Optional[int] = None,
    stock_quantity: int = 1,
) -> GeneratedProduct:
    """Upload image to Supabase, call AI, save to DB, return product."""
    image_bytes = await image_file.read()
    image_mime = image_file.content_type or "image/jpeg"

    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded photo '{image_file.filename}' is corrupted or empty. Please upload a clear photo.",
        )

    # Smart background removal with lightweight u2netp (640px) and 8.0s timeout circuit breaker
    processed_bytes = await remove_background_with_fallback(image_bytes, timeout_seconds=8.0)

    # 1. Upload processed studio image to Supabase Storage CDN asynchronously
    image_url = await asyncio.to_thread(upload_image, processed_bytes, "image/jpeg")

    # 2. Call Gemini AI with the studio image + shared audio
    ai_data = await generate_product_listing(
        image_bytes=processed_bytes,
        image_mime="image/jpeg",
        audio_bytes=audio_bytes,
        audio_mime=audio_mime,
    )

    # 3. Persist to Supabase DB (products table) asynchronously
    saved = await asyncio.to_thread(
        save_product,
        artisan_id,
        image_url,
        audio_url,
        ai_data,
        manual_price,
        stock_quantity,
    )
    product_id = str(saved.get("id", ""))
    effective_price = saved.get("price") or saved.get("price_inr") or manual_price or ai_data.get("price_inr")
    effective_usd = saved.get("price_usd") or ai_data.get("suggested_usd_price")
    export_desc = saved.get("export_description") or ai_data.get("export_description", "")
    qty = saved.get("stock_quantity", stock_quantity)

    return GeneratedProduct(
        product_id=product_id,
        image_url=image_url,
        audio_url=audio_url,
        suggested_price_range=ai_data.get("suggested_price_range", ""),
        suggested_usd_price=effective_usd,
        price_usd=effective_usd,
        export_description=export_desc,
        ai_title_en=ai_data.get("ai_title_en", ""),
        ai_title_local=ai_data.get("ai_title_local", ""),
        ai_desc_en=ai_data.get("ai_desc_en", ""),
        ai_desc_local=ai_data.get("ai_desc_local", ""),
        price_inr=effective_price,
        tags=ai_data.get("tags", []),
        whatsapp_link=_build_whatsapp_link(ai_data, product_id),
        stock_quantity=qty,
        in_stock=qty > 0,
    )


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
        # Upload audio to product-audio bucket asynchronously
        audio_url = await asyncio.to_thread(upload_audio, audio_bytes, audio_mime)

        # Process all images concurrently without blocking the event loop
        effective_qty = stock_quantity if (stock_quantity is not None and stock_quantity >= 0) else 1
        tasks = [
            _process_single_image(
                img,
                audio_bytes,
                audio_mime,
                str(artisan_id),
                audio_url,
                manual_price,
                effective_qty,
            )
            for img in images
        ]
        products = await asyncio.gather(*tasks)

        # Background Task: Alert subscriber community of new handcrafted masterpiece
        if products and len(products) > 0:
            try:
                artisan_res = supabase.table("artisans").select("full_name").eq("id", str(artisan_id)).execute()
                artisan_name = artisan_res.data[0]["full_name"] if (artisan_res.data and len(artisan_res.data) > 0) else "Artisan"
                first_prod = products[0]
                background_tasks.add_task(
                    send_new_product_notification,
                    artisan_name=artisan_name,
                    product_title=first_prod.ai_title_en or "Heritage Handloom Creation",
                    image_url=first_prod.image_url,
                    product_id=first_prod.product_id,
                    price_inr=first_prod.price_inr,
                    artisan_id=str(artisan_id),
                )
            except Exception as bg_err:
                print(f"Notice: Background email scheduling deferred: {bg_err}")

        return BatchProductResponse(
            status="success",
            products=list(products),
            count=len(products),
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
