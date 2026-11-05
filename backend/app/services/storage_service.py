import re
import uuid
from typing import Optional, List
from app.core.supabase_client import supabase
from app.core.config import settings


def upload_image(image_bytes: bytes, mime_type: str) -> str:
    """Upload raw image bytes to Supabase Storage. Returns the public URL."""
    clean_mime = mime_type.split(";")[0].strip() or "image/jpeg"
    ext = clean_mime.split("/")[-1].lower()
    if ext == "jpeg":
        ext = "jpg"
    elif not ext:
        ext = "jpg"

    file_name = f"{uuid.uuid4()}.{ext}"
    bucket = settings.SUPABASE_BUCKET

    supabase.storage.from_(bucket).upload(
        path=file_name,
        file=image_bytes,
        file_options={"content-type": clean_mime, "upsert": "true"}
    )

    return supabase.storage.from_(bucket).get_public_url(file_name)


def upload_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Upload raw audio bytes to Supabase Storage. Returns the public URL."""
    clean_mime = mime_type.split(";")[0].strip().lower() or "audio/webm"
    if clean_mime in ("audio/mp4", "audio/m4a"):
        ext = "m4a"
    elif clean_mime in ("audio/mpeg", "audio/mp3"):
        ext = "mp3"
    elif clean_mime == "audio/wav":
        ext = "wav"
    elif clean_mime == "audio/ogg":
        ext = "ogg"
    else:
        ext = "webm"
        clean_mime = "audio/webm"

    file_name = f"{uuid.uuid4()}.{ext}"
    bucket = "product-audio"

    try:
        supabase.storage.from_(bucket).upload(
            path=file_name,
            file=audio_bytes,
            file_options={"content-type": clean_mime, "upsert": "true"}
        )
    except Exception as e:
        print(f"Notice: Supabase audio upload exception (continuing): {e}")

    public_url = supabase.storage.from_(bucket).get_public_url(file_name)
    return public_url


def save_product(
    artisan_id: str,
    image_url: str,
    audio_url: str,
    ai_data: dict,
    manual_price: Optional[int] = None,
    stock_quantity: int = 1,
    estimated_weaving_days: Optional[int] = None,
    images: Optional[List[str]] = None,
) -> dict:
    """Insert a generated product into Supabase products table. Returns inserted row."""
    # Determine default price: manual price -> ai price -> parsed suggested price -> 1500 fallback
    final_price = manual_price if (manual_price is not None and manual_price > 0) else ai_data.get("price_inr")
    if final_price is None and ai_data.get("suggested_price_range"):
        matches = re.findall(r'\d+', str(ai_data.get("suggested_price_range", "")))
        if matches:
            try:
                final_price = int(matches[0])
            except (ValueError, TypeError):
                pass

    if final_price is None:
        final_price = 1500

    # Determine USD export price
    raw_usd = ai_data.get("suggested_usd_price")
    final_usd = None
    if raw_usd is not None:
        try:
            if isinstance(raw_usd, (int, float)):
                final_usd = round(float(raw_usd), 2)
            else:
                cleaned = re.sub(r'[^\d.]', '', str(raw_usd))
                if cleaned:
                    final_usd = round(float(cleaned), 2)
        except (ValueError, TypeError):
            pass

    if final_usd is None or final_usd <= 0:
        final_usd = round(max(25.0, final_price / 75.0), 2)

    export_desc = ai_data.get("export_description", "") or ai_data.get("ai_desc_en", "")

    # Realistic category placeholder fallback if image is missing, logo, or placeholder
    if not image_url or "logo" in image_url.lower() or "placeholder" in image_url.lower():
        title_lower = f"{ai_data.get('ai_title_en', '')} {ai_data.get('ai_title_local', '')}".lower()
        if "taant" in title_lower or "tant" in title_lower or "phulia" in title_lower:
            image_url = "/placeholders/taant.jpg"
        elif "jamdani" in title_lower or "dhakai" in title_lower:
            image_url = "/placeholders/jamdani.jpg"
        elif "baluchari" in title_lower or "murshidabad" in title_lower:
            image_url = "/placeholders/baluchari.jpg"
        elif "kantha" in title_lower:
            image_url = "/placeholders/kantha.jpg"
        else:
            image_url = "/placeholders/default-handloom.jpg"

    qty = max(0, stock_quantity)
    image_list = images if (images and len(images) > 0) else ([image_url] if image_url else [])
    row = {
        "artisan_id": str(artisan_id),
        "image_url": image_url,
        "images": image_list,
        "audio_url": audio_url,
        "suggested_price_range": ai_data.get("suggested_price_range", "") or "₹1500 - ₹2500",
        "suggested_usd_price": final_usd,
        "ai_title_en":    ai_data.get("ai_title_en", ""),
        "ai_title_local": ai_data.get("ai_title_local", ""),
        "ai_desc_en":     ai_data.get("ai_desc_en", ""),
        "ai_desc_local":  ai_data.get("ai_desc_local", ""),
        "export_description": export_desc,
        "price_inr":      final_price,
        "price":          final_price,
        "price_usd":      final_usd,
        "in_stock":       qty > 0,
        "stock_quantity": qty,
        "estimated_weaving_days": estimated_weaving_days if (estimated_weaving_days is not None and estimated_weaving_days > 0) else None,
        "tags":           ai_data.get("tags", []),
    }
    try:
        response = supabase.table("products").insert(row).execute()
        return response.data[0] if response.data else row
    except Exception as e:
        err_msg = str(e)
        if "PGRST204" in err_msg or "images" in err_msg or "export_description" in err_msg or "stock_quantity" in err_msg or "estimated_weaving_days" in err_msg or "schema cache" in err_msg:
            # Safe fallback if images / export_description / price_usd / stock_quantity / estimated_weaving_days column hasn't been added to remote DB yet
            safe_row = row.copy()
            for col in ["images", "export_description", "suggested_usd_price", "price_usd", "stock_quantity", "estimated_weaving_days"]:
                safe_row.pop(col, None)
            response = supabase.table("products").insert(safe_row).execute()
            saved = response.data[0] if response.data else safe_row
            saved["images"] = image_list
            saved["export_description"] = export_desc
            saved["suggested_usd_price"] = final_usd
            saved["price_usd"] = final_usd
            saved["stock_quantity"] = qty
            saved["estimated_weaving_days"] = estimated_weaving_days
            return saved
        raise e

