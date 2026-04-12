from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL no está cargada")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY no está cargada")

print("DEBUG creando cliente Supabase con URL:", SUPABASE_URL)
print("DEBUG service role prefix:", SUPABASE_SERVICE_ROLE_KEY[:20])

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)