import uuid
from app.core.supabase_client import supabase
from app.core.config import settings


def upload_image(image_bytes: bytes, mime_type: str) -> str:
    """Upload raw image bytes to Supabase Storage. Returns the public URL."""
    ext = mime_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"

    file_name = f"{uuid.uuid4()}.{ext}"
    bucket = settings.SUPABASE_BUCKET

    supabase.storage.from_(bucket).upload(
        path=file_name,
        file=image_bytes,
        file_options={"content-type": mime_type, "upsert": "false"}
    )

    return supabase.storage.from_(bucket).get_public_url(file_name)


def save_product(artisan_id: str, image_url: str, ai_data: dict) -> dict:
    """Insert a generated product into Supabase products table. Returns inserted row."""
    row = {
        "artisan_id": artisan_id,
        "image_url": image_url,
        "ai_title_en":    ai_data.get("ai_title_en", ""),
        "ai_title_local": ai_data.get("ai_title_local", ""),
        "ai_desc_en":     ai_data.get("ai_desc_en", ""),
        "ai_desc_local":  ai_data.get("ai_desc_local", ""),
        "price_inr":      ai_data.get("price_inr"),
        "tags":           ai_data.get("tags", []),
    }
    response = supabase.table("products").insert(row).execute()
    return response.data[0] if response.data else row
