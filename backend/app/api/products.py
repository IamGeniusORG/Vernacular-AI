import asyncio
import urllib.parse
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import List

from app.core.supabase_client import supabase
from app.services.ai_service import generate_product_listing
from app.services.storage_service import upload_image, save_product, upload_audio
from app.schemas.product import BatchProductResponse, GeneratedProduct

router = APIRouter()


class PriceUpdate(BaseModel):
    price_inr: int


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
) -> GeneratedProduct:
    """Upload image and audio to Supabase, call AI, save to DB, return product."""
    image_bytes = await image_file.read()
    image_mime = image_file.content_type or "image/jpeg"

    # 1. Upload image and audio to Supabase Storage CDN
    image_url = upload_image(image_bytes, image_mime)
    audio_url = upload_audio(audio_bytes, audio_mime)

    # 2. Call Gemini AI with this image + shared audio
    ai_data = await generate_product_listing(
        image_bytes=image_bytes,
        image_mime=image_mime,
        audio_bytes=audio_bytes,
        audio_mime=audio_mime,
    )

    # 3. Persist to Supabase DB (products table)
    saved = save_product(artisan_id, image_url, audio_url, ai_data)
    product_id = str(saved.get("id", ""))

    return GeneratedProduct(
        product_id=product_id,
        image_url=image_url,
        audio_url=audio_url,
        suggested_price_range=ai_data.get("suggested_price_range", ""),
        ai_title_en=ai_data.get("ai_title_en", ""),
        ai_title_local=ai_data.get("ai_title_local", ""),
        ai_desc_en=ai_data.get("ai_desc_en", ""),
        ai_desc_local=ai_data.get("ai_desc_local", ""),
        price_inr=ai_data.get("price_inr"),
        tags=ai_data.get("tags", []),
        whatsapp_link=_build_whatsapp_link(ai_data, product_id),
    )


@router.post("/generate", response_model=BatchProductResponse)
async def generate_listing(
    artisan_id: uuid.UUID = Form(...),
    images: List[UploadFile] = File(...),
    audio: UploadFile = File(...),
):
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required.")

    try:
        # Read audio once — shared across all image AI calls
        audio_bytes = await audio.read()
        audio_mime = audio.content_type or "audio/webm"

        # Process all images concurrently
        tasks = [
            _process_single_image(img, audio_bytes, audio_mime, str(artisan_id))
            for img in images
        ]
        products = await asyncio.gather(*tasks)

        return BatchProductResponse(
            status="success",
            products=list(products),
            count=len(products),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
async def update_product_price(product_id: str, update: PriceUpdate):
    try:
        response = (
            supabase.table("products")
            .update({"price_inr": update.price_inr})
            .eq("id", product_id)
            .execute()
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
