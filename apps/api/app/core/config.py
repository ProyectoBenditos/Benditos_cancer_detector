from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)

APP_NAME = "OncaScan API"
APP_VERSION = "0.1.0"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "dicom-files")

print("DEBUG ENV_PATH:", ENV_PATH)
print("DEBUG SUPABASE_URL:", SUPABASE_URL)
print("DEBUG BUCKET:", SUPABASE_BUCKET_NAME)
print("DEBUG SERVICE_ROLE loaded:", bool(SUPABASE_SERVICE_ROLE_KEY))