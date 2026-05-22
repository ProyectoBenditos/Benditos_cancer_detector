from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# La presencia de SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY se valida en
# app.core.config al boot; aquí solo asumimos que están cargadas.

print("DEBUG service role prefix:", SUPABASE_SERVICE_ROLE_KEY[:20])

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)