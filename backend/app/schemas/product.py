from pydantic import BaseModel
from typing import List, Optional


class GeneratedProduct(BaseModel):
    product_id: str
    image_url: str
    ai_title_en: str
    ai_title_local: str
    ai_desc_en: str
    ai_desc_local: str
    price_inr: Optional[int] = None
    tags: List[str]
    whatsapp_link: str


class BatchProductResponse(BaseModel):
    status: str
    products: List[GeneratedProduct]
    count: int
