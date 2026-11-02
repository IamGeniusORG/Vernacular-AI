from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.core.supabase_client import supabase
from app.core.limiter import limiter

router = APIRouter()


class TrackViewRequest(BaseModel):
    artisan_id: str
    product_id: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None


@router.post("/view")
@limiter.limit("60/minute")
async def track_view(request: Request, payload: TrackViewRequest):
    """
    Non-blocking visitor tracking. Resolves geo from edge headers or payload.
    """
    country = payload.country
    if not country:
        country = (
            request.headers.get("cf-ipcountry")
            or request.headers.get("x-country")
            or request.headers.get("x-vercel-ip-country")
            or "India"
        )
    city = payload.city or request.headers.get("x-city") or "Unknown"
    ua = request.headers.get("user-agent", "")[:250]

    record = {
        "artisan_id": payload.artisan_id,
        "product_id": payload.product_id,
        "country": country,
        "city": city,
        "user_agent": ua,
    }

    try:
        supabase.table("product_views").insert(record).execute()
        return {"status": "success", "recorded": True}
    except Exception as e:
        # Never break visitor flow if database table is pending
        print(f"Analytics view notice: {e}")
        return {"status": "success", "notice": "acknowledged"}


@router.get("/artisan/{artisan_id}")
async def get_artisan_analytics(artisan_id: str):
    """
    Get aggregated global reach statistics and direct patronage tips for an artisan.
    """
    try:
        views_res = (
            supabase.table("product_views")
            .select("country, city, created_at, product_id")
            .eq("artisan_id", artisan_id)
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        views = views_res.data or []
        total_views = len(views)

        # Count by country
        country_counts: Dict[str, int] = {}
        for v in views:
            c = v.get("country") or "India"
            country_counts[c] = country_counts.get(c, 0) + 1

        top_countries = []
        for country, count in sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            top_countries.append({
                "country": country,
                "views": count,
                "percentage": round((count / total_views) * 100, 1) if total_views > 0 else 0,
            })

        # Fetch tip statistics
        tips_total_inr = 0.0
        tips_total_usd = 0.0
        tips_count = 0
        try:
            tips_res = supabase.table("tips").select("amount, currency").eq("artisan_id", artisan_id).execute()
            for t in tips_res.data or []:
                tips_count += 1
                if t.get("currency") == "USD":
                    tips_total_usd += float(t.get("amount") or 0)
                else:
                    tips_total_inr += float(t.get("amount") or 0)
        except Exception as tip_err:
            print(f"Tips fetch notice: {tip_err}")

        return {
            "status": "success",
            "total_views": total_views,
            "unique_countries": len(country_counts),
            "top_countries": top_countries,
            "recent_views": views[:10],
            "tips_summary": {
                "count": tips_count,
                "total_inr": round(tips_total_inr, 2),
                "total_usd": round(tips_total_usd, 2),
            }
        }
    except Exception as e:
        print(f"Analytics query error: {e}")
        return {
            "status": "success",
            "total_views": 0,
            "unique_countries": 0,
            "top_countries": [],
            "recent_views": [],
            "tips_summary": {"count": 0, "total_inr": 0, "total_usd": 0}
        }
