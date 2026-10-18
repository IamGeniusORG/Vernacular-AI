from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Optional[Client]:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    if not url or not key:
        url = "https://placeholder.supabase.co"
        key = "placeholder-key"
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"Notice: Supabase client initialization deferred ({e})")
        return None

supabase: Optional[Client] = get_supabase()
