import asyncio
import urllib.parse
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional

from app.core.supabase_client import supabase
from app.core.auth import get_current_user_id, verify_artisan_owner
from app.services.ai_service import generate_product_listing
from app.services.storage_service import upload_image, save_product, upload_audio
from app.schemas.product import BatchProductResponse, GeneratedProduct

router = APIRouter()


class PriceUpdate(BaseModel):
    price_inr: Optional[int] = None
    price: Optional[int] = None
    price_usd: Optional[float] = None
    suggested_usd_price: Optional[float] = None


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
) -> GeneratedProduct:
    """Upload image to Supabase, call AI, save to DB, return product."""
    image_bytes = await image_file.read()
    image_mime = image_file.content_type or "image/jpeg"

    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded photo '{image_file.filename}' is corrupted or empty. Please upload a clear photo.",
        )

    # 1. Upload image to Supabase Storage CDN asynchronously
    image_url = await asyncio.to_thread(upload_image, image_bytes, image_mime)

    # 2. Call Gemini AI with this image + shared audio
    ai_data = await generate_product_listing(
        image_bytes=image_bytes,
        image_mime=image_mime,
        audio_bytes=audio_bytes,
        audio_mime=audio_mime,
    )

    # 3. Persist to Supabase DB (products table) asynchronously
    saved = await asyncio.to_thread(save_product, artisan_id, image_url, audio_url, ai_data)
    product_id = str(saved.get("id", ""))
    effective_price = saved.get("price") or saved.get("price_inr") or ai_data.get("price_inr")
    effective_usd = saved.get("price_usd") or ai_data.get("suggested_usd_price")
    export_desc = saved.get("export_description") or ai_data.get("export_description", "")

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
    )


@router.post("/generate", response_model=BatchProductResponse)
async def generate_listing(
    artisan_id: uuid.UUID = Form(...),
    images: List[UploadFile] = File(...),
    audio: UploadFile = File(...),
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
        tasks = [
            _process_single_image(img, audio_bytes, audio_mime, str(artisan_id), audio_url)
            for img in images
        ]
        products = await asyncio.gather(*tasks)

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
