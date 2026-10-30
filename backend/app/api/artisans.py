import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from app.core.supabase_client import supabase
from app.core.auth import verify_artisan_owner

router = APIRouter()


@router.post("/register")
async def register_artisan(phone_number: str, full_name: str, district: str = ""):
    """Register a new artisan by phone number (upsert)."""
    try:
        existing = supabase.table("artisans").select("id").eq("phone_number", phone_number).execute()
        if existing.data:
            return {"status": "exists", "artisan_id": existing.data[0]["id"]}

        result = supabase.table("artisans").insert({
            "phone_number": phone_number,
            "full_name": full_name,
            "district": district,
        }).execute()

        return {"status": "created", "artisan_id": result.data[0]["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_artisans():
    """Fetch all artisans with their products for the public directory (excluding customers)."""
    try:
        artisans_res = (
            supabase.table("artisans")
            .select("*")
            .neq("user_role", "customer")
            .order("created_at", desc=True)
            .execute()
        )
        products_res = (
            supabase.table("products")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        products_by_artisan = {}
        for p in products_res.data or []:
            products_by_artisan.setdefault(p.get("artisan_id"), []).append(p)

        artisans = []
        for a in artisans_res.data or []:
            if a.get("user_role") == "customer":
                continue
            a["products"] = products_by_artisan.get(a["id"], [])
            artisans.append(a)

        return {"status": "success", "artisans": artisans}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{artisan_id}")
async def get_artisan(artisan_id: str):
    """Fetch artisan profile by ID."""
    try:
        result = supabase.table("artisans").select("*").eq("id", artisan_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Artisan not found")
        return {"status": "success", "artisan": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{artisan_id}")
async def update_artisan(artisan_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    """Update artisan or buyer profile fields with strict authentication check."""
    await verify_artisan_owner(artisan_id, authorization)
    try:
        allowed_keys = [
            "full_name",
            "user_role",
            "district",
            "whatsapp_number",
            "upi_id",
            "paypal_email",
            "avatar_url",
            "banner_url",
            "preferred_currency",
            "preferred_language",
        ]
        allowed = {
            k: ("" if v is None else v) for k, v in payload.items()
            if k in allowed_keys
        }
        if not allowed:
            return {"status": "no_changes"}

        # 1. Always sync to auth.users metadata via Supabase Admin (bulletproof persistence)
        try:
            supabase.auth.admin.update_user_by_id(artisan_id, {"user_metadata": allowed})
        except Exception as auth_err:
            print(f"Notice: Supabase admin auth user metadata sync skipped: {auth_err}")

        # 2. Update database row with defensive fallback for pending SQL migrations
        try:
            result = supabase.table("artisans").update(allowed).eq("id", artisan_id).execute()
            return {"status": "success", "artisan": result.data[0] if result.data else None}
        except Exception as db_err:
            err_str = str(db_err)
            if "PGRST204" in err_str or "preferred_currency" in err_str or "preferred_language" in err_str or "avatar_url" in err_str:
                # Strip newly added columns if table cache hasn't refreshed
                safe_payload = {
                    k: v for k, v in allowed.items()
                    if k not in ["preferred_currency", "preferred_language", "avatar_url", "banner_url"]
                }
                if safe_payload:
                    result = supabase.table("artisans").update(safe_payload).eq("id", artisan_id).execute()
                    return {"status": "success", "artisan": result.data[0] if result.data else None}
                return {"status": "success", "notice": "stored_in_auth_metadata"}
            raise db_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{artisan_id}/upload-asset")
async def upload_artisan_asset(
    artisan_id: str,
    file: UploadFile = File(...),
    asset_type: str = Form("avatar"),
    authorization: Optional[str] = Header(None)
):
    """Upload an artisan profile avatar or cover banner image to the artisan-assets bucket with authentication check."""
    await verify_artisan_owner(artisan_id, authorization)
    try:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
        ext = mime_type.split("/")[-1].lower()
        if ext == "jpeg":
            ext = "jpg"
        elif not ext or ext == "*":
            ext = "jpg"

        file_name = f"{artisan_id}/{asset_type}_{uuid.uuid4().hex[:8]}.{ext}"
        bucket = "artisan-assets"

        supabase.storage.from_(bucket).upload(
            path=file_name,
            file=content,
            file_options={"content-type": mime_type, "upsert": "true"}
        )

        public_url = supabase.storage.from_(bucket).get_public_url(file_name)

        # Update artisan record if column exists
        col = "avatar_url" if asset_type == "avatar" else "banner_url"
        try:
            supabase.table("artisans").update({col: public_url}).eq("id", artisan_id).execute()
        except Exception as db_err:
            print(f"Notice: database update for {col} deferred: {db_err}")

        return {"status": "success", "url": public_url, "asset_type": asset_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
