import os
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Optional[Client]:
    url = os.environ.get("SUPABASE_URL") or settings.SUPABASE_URL
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or settings.effective_service_role_key
    )
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"Notice: Supabase client initialization deferred ({e})")
        return None

supabase: Optional[Client] = get_supabase()
