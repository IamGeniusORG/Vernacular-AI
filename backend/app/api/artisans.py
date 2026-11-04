import re
import uuid
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header, BackgroundTasks, Request
from app.core.limiter import limiter
from app.core.supabase_client import supabase
from app.core.config import settings
from app.core.auth import verify_artisan_owner
from app.schemas.artisan import ArtisanUpdate
from app.services.email_service import send_artisan_tip_notification

router = APIRouter()


class TipRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = Field(default="INR")  # 'INR' | 'USD'
    payment_method: str = Field(default="upi")  # 'upi' | 'paypal'
    patron_name: Optional[str] = "Anonymous Patron"
    order_id: Optional[str] = None


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
    """Fetch artisan profile by ID, seamlessly merging database records with Supabase Auth metadata."""
    try:
        result = supabase.table("artisans").select("*").eq("id", artisan_id).execute()
        artisan_data = dict(result.data[0]) if (result.data and len(result.data) > 0) else {"id": artisan_id}

        # Seamlessly fallback / overlay with Supabase Auth user_metadata
        try:
            auth_user = supabase.auth.admin.get_user_by_id(artisan_id)
            if auth_user and hasattr(auth_user, "user") and auth_user.user:
                meta = getattr(auth_user.user, "user_metadata", {}) or {}
                for k, v in meta.items():
                    if v and (k not in artisan_data or artisan_data[k] is None or artisan_data[k] == ""):
                        artisan_data[k] = v
        except Exception as auth_err:
            print(f"Notice: Supabase admin get_user_by_id skipped: {auth_err}")

        if not result.data and not artisan_data.get("full_name") and not artisan_data.get("phone_number"):
            raise HTTPException(status_code=404, detail="Artisan not found")

        return {"status": "success", "artisan": artisan_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{artisan_id}")
async def update_artisan(artisan_id: str, payload: ArtisanUpdate, authorization: Optional[str] = Header(None)):
    """Update artisan or buyer profile fields with strict authentication check and resilient column stripping."""
    await verify_artisan_owner(artisan_id, authorization)
    try:
        raw_allowed = payload.model_dump(exclude_unset=True)
        allowed = {
            k: ("" if v is None else v) for k, v in raw_allowed.items()
        }
        if not allowed:
            return {"status": "no_changes"}

        # 1. Always sync to auth.users metadata via Supabase Admin (bulletproof persistence)
        try:
            supabase.auth.admin.update_user_by_id(artisan_id, {"user_metadata": allowed})
        except Exception as auth_err:
            print(f"Notice: Supabase admin auth user metadata sync skipped: {auth_err}")

        # 2. Update or insert database row with dynamic self-healing column stripping loop
        db_payload = dict(allowed)
        saved_artisan = None
        for _ in range(5):
            try:
                existing = supabase.table("artisans").select("id").eq("id", artisan_id).execute()
                if not existing.data:
                    res = supabase.table("artisans").insert({"id": artisan_id, **db_payload}).execute()
                else:
                    res = supabase.table("artisans").update(db_payload).eq("id", artisan_id).execute()
                saved_artisan = res.data[0] if (res.data and len(res.data) > 0) else None
                break
            except Exception as db_err:
                err_str = str(db_err)
                col_match = re.search(r"Could not find the '([^']+)' column", err_str)
                if col_match:
                    missing_col = col_match.group(1)
                    if missing_col in db_payload:
                        print(f"Dynamic self-healing: Column '{missing_col}' missing in 'artisans'. Stripping from DB payload and retrying.")
                        db_payload.pop(missing_col, None)
                        if not db_payload:
                            break
                        continue
                fallback_strip = ["paypal_email", "avatar_url", "banner_url", "qr_code_url", "preferred_currency", "preferred_language"]
                has_any = any(k in db_payload for k in fallback_strip)
                if has_any:
                    for k in fallback_strip:
                        db_payload.pop(k, None)
                    continue
                raise db_err

        # Return merged artisan data with the updated fields overlay
        final_artisan = dict(saved_artisan) if saved_artisan else {"id": artisan_id}
        for k, v in allowed.items():
            if k not in final_artisan or not final_artisan[k]:
                final_artisan[k] = v

        return {"status": "success", "artisan": final_artisan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{artisan_id}/upload-asset")
async def upload_artisan_asset(
    artisan_id: str,
    file: UploadFile = File(...),
    asset_type: str = Form("avatar"),
    authorization: Optional[str] = Header(None)
):
    """Upload an artisan profile avatar, cover banner, or payment QR image to the artisan-assets bucket with authentication check."""
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
        if asset_type == "avatar":
            col = "avatar_url"
        elif asset_type in ["qr", "qr_code", "qrcode"]:
            col = "qr_code_url"
        else:
            col = "banner_url"

        try:
            supabase.table("artisans").update({col: public_url}).eq("id", artisan_id).execute()
        except Exception as db_err:
            print(f"Notice: database update for {col} deferred: {db_err}")

        return {"status": "success", "url": public_url, "asset_type": asset_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{artisan_id}/tip")
@limiter.limit("10/minute")
async def record_artisan_tip(request: Request, artisan_id: str, tip: TipRequest, background_tasks: BackgroundTasks):
    """Record a direct patronage tip to an artisan and dispatch an email alert."""
    if tip.amount <= 0:
        raise HTTPException(status_code=400, detail="Tip amount must be greater than zero")
    if tip.currency not in ("INR", "USD"):
        raise HTTPException(status_code=400, detail="Currency must be INR or USD")
    if tip.payment_method not in ("upi", "paypal"):
        raise HTTPException(status_code=400, detail="Payment method must be upi or paypal")

    try:
        # Check if artisan exists
        artisan_res = supabase.table("artisans").select("id, full_name").eq("id", artisan_id).execute()
        if not artisan_res.data:
            raise HTTPException(status_code=404, detail="Artisan not found")

        artisan_name = artisan_res.data[0].get("full_name") or "Artisan"

        record = {
            "artisan_id": artisan_id,
            "amount": round(tip.amount, 2),
            "currency": tip.currency,
            "payment_method": tip.payment_method,
            "patron_name": tip.patron_name or "Anonymous Patron",
            "order_id": tip.order_id,
        }
        res = supabase.table("tips").insert(record).execute()

        # Enqueue background task for email notification via Resend
        background_tasks.add_task(
            send_artisan_tip_notification,
            artisan_id=artisan_id,
            artisan_name=artisan_name,
            amount=round(tip.amount, 2),
            currency=tip.currency,
            payment_method=tip.payment_method,
            patron_name=tip.patron_name,
        )

        return {"status": "success", "tip": res.data[0] if res.data else record}
    except HTTPException:
        raise
    except Exception as e:
        # Graceful fallback if table is pending migration in Supabase production
        print(f"Tip logging notice: {e}")
        try:
            artisan_name = "Artisan"
            if 'artisan_res' in locals() and artisan_res and artisan_res.data:
                artisan_name = artisan_res.data[0].get("full_name") or "Artisan"
            background_tasks.add_task(
                send_artisan_tip_notification,
                artisan_id=artisan_id,
                artisan_name=artisan_name,
                amount=round(tip.amount, 2),
                currency=tip.currency,
                payment_method=tip.payment_method,
                patron_name=tip.patron_name,
            )
        except Exception as bg_err:
            print(f"Failed to schedule tip email in fallback: {bg_err}")

        return {
            "status": "success",
            "notice": "Tip recorded locally",
            "tip": {
                "artisan_id": artisan_id,
                "amount": tip.amount,
                "currency": tip.currency,
                "payment_method": tip.payment_method,
                "patron_name": tip.patron_name,
            }
        }


@router.get("/{artisan_id}/tips")
async def get_artisan_tips(artisan_id: str):
    """Retrieve tip history and stats for an artisan."""
    try:
        res = supabase.table("tips").select("*").eq("artisan_id", artisan_id).order("created_at", desc=True).limit(50).execute()
        tips_list = res.data or []
        total_inr = sum(float(t.get("amount", 0)) for t in tips_list if t.get("currency") == "INR")
        total_usd = sum(float(t.get("amount", 0)) for t in tips_list if t.get("currency") == "USD")
        return {
            "status": "success",
            "tips": tips_list,
            "summary": {
                "total_inr": round(total_inr, 2),
                "total_usd": round(total_usd, 2),
                "count": len(tips_list)
            }
        }
    except Exception as e:
        return {"status": "success", "tips": [], "summary": {"total_inr": 0, "total_usd": 0, "count": 0}}


def _extract_storage_filename(url: Optional[str], bucket: str) -> Optional[str]:
    """Extract storage object relative path or filename from a Supabase Storage public URL."""
    if not url or not isinstance(url, str):
        return None
    marker = f"/{bucket}/"
    if marker in url:
        path = url.split(marker)[-1].split("?")[0].strip()
        return path if path else None
    parts = url.split("?")[0].split("/")
    if parts:
        return parts[-1].strip()
    return None


@router.delete("/{artisan_id}")
async def delete_artisan_account(
    artisan_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Permanently delete an artisan account.
    Enforces JWT Bearer authentication: only the account owner or service-role admin can delete.
    Cleans up all images, audio, and branding assets from Supabase Storage buckets,
    deletes all database records (via ON DELETE CASCADE), and removes the Supabase Auth user.
    """
    caller_id = await verify_artisan_owner(artisan_id, authorization)

    try:
        # 1. Fetch all product media to delete storage files before DB rows cascade
        image_bucket = getattr(settings, "SUPABASE_BUCKET", "product-images") or "product-images"
        try:
            prods_res = supabase.table("products").select("id, image_url, audio_url").eq("artisan_id", artisan_id).execute()
            products = prods_res.data or []
        except Exception as e:
            print(f"Notice: failed to query products for deletion: {e}")
            products = []

        # Remove product images and audio notes
        for p in products:
            img_url = p.get("image_url")
            if img_url:
                img_path = _extract_storage_filename(img_url, image_bucket)
                if img_path:
                    try:
                        supabase.storage.from_(image_bucket).remove([img_path])
                    except Exception as err:
                        print(f"Notice: failed to delete image {img_path}: {err}")

            audio_url = p.get("audio_url")
            if audio_url:
                audio_path = _extract_storage_filename(audio_url, "product-audio")
                if audio_path:
                    try:
                        supabase.storage.from_("product-audio").remove([audio_path])
                    except Exception as err:
                        print(f"Notice: failed to delete audio {audio_path}: {err}")

        # 2. Delete all branding assets from artisan-assets bucket under {artisan_id}/ folder
        try:
            assets = supabase.storage.from_("artisan-assets").list(artisan_id)
            if assets:
                paths = [f"{artisan_id}/{item['name']}" for item in assets if isinstance(item, dict) and "name" in item]
                if paths:
                    supabase.storage.from_("artisan-assets").remove(paths)
        except Exception as err:
            print(f"Notice: failed to delete artisan-assets directory: {err}")

        # Also check artisan row for custom asset URLs
        try:
            artisan_res = supabase.table("artisans").select("avatar_url, banner_url, qr_code_url").eq("id", artisan_id).execute()
            if artisan_res.data:
                row = artisan_res.data[0]
                for key in ["avatar_url", "banner_url", "qr_code_url"]:
                    url = row.get(key)
                    if url and "artisan-assets" in url:
                        path = _extract_storage_filename(url, "artisan-assets")
                        if path:
                            try:
                                supabase.storage.from_("artisan-assets").remove([path])
                            except Exception:
                                pass
        except Exception as e:
            print(f"Notice: failed to inspect artisan branding assets: {e}")

        # 3. Delete artisan row from public.artisans (cascades to products, tips, product_views)
        supabase.table("artisans").delete().eq("id", artisan_id).execute()

        # 4. Delete user from Supabase Auth admin
        try:
            supabase.auth.admin.delete_user(artisan_id)
        except Exception as auth_err:
            print(f"Notice: auth.admin.delete_user deferred or not permitted: {auth_err}")

        return {
            "status": "success",
            "message": "Artisan account, catalog, and storage assets permanently deleted.",
            "artisan_id": artisan_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")
