import re
import uuid
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


def save_product(artisan_id: str, image_url: str, audio_url: str, ai_data: dict) -> dict:
    """Insert a generated product into Supabase products table. Returns inserted row."""
    # Determine default price: ai price -> parsed suggested price -> 1500 fallback
    ai_price = ai_data.get("price_inr")
    final_price = ai_price
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

    row = {
        "artisan_id": str(artisan_id),
        "image_url": image_url,
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
        "in_stock":       True,
        "tags":           ai_data.get("tags", []),
    }
    response = supabase.table("products").insert(row).execute()
    return response.data[0] if response.data else row

