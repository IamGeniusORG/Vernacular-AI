from typing import Optional
from pydantic import BaseModel


class ArtisanUpdate(BaseModel):
    full_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    upi_id: Optional[str] = None
    paypal_email: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    district: Optional[str] = None
    user_role: Optional[str] = None
    preferred_currency: Optional[str] = None
    preferred_language: Optional[str] = None
