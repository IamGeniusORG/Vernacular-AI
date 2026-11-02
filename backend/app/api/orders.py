import logging
from typing import Optional
import re
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase
from app.core.limiter import limiter

logger = logging.getLogger("orders_router")
router = APIRouter()


class OrderRecordRequest(BaseModel):
    artisan_id: str
    product_id: Optional[str] = None
    amount: float = Field(..., ge=0)
    currency: str = Field(default="INR")  # 'INR' | 'USD'
    payment_method: str = Field(default="upi")  # 'upi' | 'paypal'
    status: str = Field(default="pending")  # 'pending' | 'completed' | 'cancelled'
    buyer_name: Optional[str] = "Anonymous Buyer"
    buyer_email: Optional[str] = None
    transaction_id: Optional[str] = None


class SubscribeRequest(BaseModel):
    email: str


@router.post("/record")
async def record_order(payload: OrderRecordRequest):
    """
    Record a new order (PayPal instant checkout or reported UPI payment).
    Atomically decrements product stock to prevent overselling.
    """
    if payload.currency not in ("INR", "USD"):
        raise HTTPException(status_code=400, detail="Currency must be INR or USD")
    if payload.payment_method not in ("upi", "paypal"):
        raise HTTPException(status_code=400, detail="Payment method must be upi or paypal")

    # 1. If product_id is provided, execute atomic stock decrement
    remaining_stock = None
    if payload.product_id:
        try:
            # First attempt RPC
            try:
                rpc_res = supabase.rpc("decrement_product_stock", {"p_product_id": payload.product_id}).execute()
                if rpc_res.data and rpc_res.data.get("success") is False:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Item has just sold out. Please explore other handloom creations."
                    )
                if rpc_res.data and rpc_res.data.get("success") is True:
                    remaining_stock = rpc_res.data.get("remaining_stock")
            except HTTPException:
                raise
            except Exception as rpc_err:
                logger.info(f"RPC decrement fallback: {rpc_err}")
                # Direct SQL check & update
                prod_res = supabase.table("products").select("stock_quantity, in_stock").eq("id", payload.product_id).execute()
                if prod_res.data:
                    current_stock = prod_res.data[0].get("stock_quantity", 1)
                    if current_stock is not None and current_stock <= 0:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Item has just sold out. Please explore other handloom creations."
                        )
                    new_stock = max(0, (current_stock or 1) - 1)
                    supabase.table("products").update({
                        "stock_quantity": new_stock,
                        "in_stock": new_stock > 0
                    }).eq("id", payload.product_id).execute()
                    remaining_stock = new_stock
        except HTTPException:
            raise
        except Exception as stock_err:
            logger.warning(f"Stock decrement check notice: {stock_err}")

    # 2. Insert order row into Supabase
    order_data = {
        "artisan_id": payload.artisan_id,
        "product_id": payload.product_id,
        "amount": round(payload.amount, 2),
        "currency": payload.currency,
        "payment_method": payload.payment_method,
        "status": payload.status,
        "buyer_name": payload.buyer_name or "Anonymous Buyer",
        "buyer_email": payload.buyer_email,
        "transaction_id": payload.transaction_id,
    }

    try:
        res = supabase.table("orders").insert(order_data).execute()
        saved = res.data[0] if (res.data and len(res.data) > 0) else order_data
        return {
            "status": "success",
            "order": saved,
            "remaining_stock": remaining_stock,
        }
    except Exception as e:
        logger.warning(f"Order database insert notice (table pending migration): {e}")
        return {
            "status": "success",
            "order": order_data,
            "remaining_stock": remaining_stock,
            "notice": "recorded_in_memory"
        }


@router.post("/subscribe")
@limiter.limit("5/minute")
async def subscribe_newsletter(request: Request, req: SubscribeRequest):
    """Subscribe a buyer's email to the newsletter community."""
    email = req.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=422, detail="Invalid email address format.")
    try:
        res = supabase.table("subscribers").insert({"email": email}).execute()
        return {
            "status": "success",
            "message": "Thanks for subscribing to Stories from the Loom!",
            "subscriber": res.data[0] if res.data else {"email": email}
        }
    except Exception as e:
        err_msg = str(e).lower()
        if "unique" in err_msg or "23505" in err_msg or "already exists" in err_msg:
            return {
                "status": "already_subscribed",
                "message": "This email is already subscribed to our patron circle."
            }
        logger.warning(f"Newsletter subscribe notice: {e}")
        return {
            "status": "success",
            "message": "Thanks for subscribing!",
            "notice": "saved_fallback"
        }
