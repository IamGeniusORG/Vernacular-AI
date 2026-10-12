from fastapi import APIRouter, HTTPException
from app.core.supabase_client import supabase

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
    """Fetch all artisans for the public directory."""
    try:
        result = supabase.table("artisans").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "artisans": result.data}
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
async def update_artisan(artisan_id: str, payload: dict):
    """Update artisan profile fields (user_role, full_name, district)."""
    try:
        allowed = {k: v for k, v in payload.items() if k in ["full_name", "user_role", "district"] and v is not None}
        if not allowed:
            return {"status": "no_changes"}
        result = supabase.table("artisans").update(allowed).eq("id", artisan_id).execute()
        return {"status": "success", "artisan": result.data[0] if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
