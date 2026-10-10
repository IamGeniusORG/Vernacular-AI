from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    return create_client(settings.SUPABASE_URL, key)

supabase: Client = get_supabase()
