from pydantic import BaseModel
from typing import List, Optional


class GeneratedProduct(BaseModel):
    product_id: str
    image_url: str
    audio_url: Optional[str] = None
    ai_title_en: str
    ai_title_local: str
    ai_desc_en: str
    ai_desc_local: str
    price_inr: Optional[int] = None
    suggested_price_range: Optional[str] = None
    price_usd: Optional[float] = None
    suggested_usd_price: Optional[float] = None
    export_description: Optional[str] = None
    tags: List[str]
    whatsapp_link: str
    stock_quantity: Optional[int] = 1
    in_stock: Optional[bool] = True
    estimated_weaving_days: Optional[int] = None


class BatchProductResponse(BaseModel):
    status: str
    products: List[GeneratedProduct]
    count: int


class ProductPatchUpdate(BaseModel):
    price: Optional[int] = None
    price_inr: Optional[int] = None
    price_usd: Optional[float] = None
    stock_quantity: Optional[int] = None
    estimated_weaving_days: Optional[int] = None
