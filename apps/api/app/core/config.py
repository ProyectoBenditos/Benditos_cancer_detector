from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

# Solo intenta cargar .env local si existe
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

APP_NAME = "OncaScan API"
APP_VERSION = "0.1.0"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "dicom-files")

HF_API_BASE_URL = os.getenv("HF_API_BASE_URL", "https://luisdam-oncoscan-ai.hf.space")
HF_PREDICT_TIMEOUT = float(os.getenv("HF_PREDICT_TIMEOUT", "120"))

print("DEBUG ENV_PATH:", ENV_PATH)
print("DEBUG SUPABASE_URL loaded:", bool(SUPABASE_URL))
print("DEBUG BUCKET:", SUPABASE_BUCKET_NAME)
print("DEBUG SERVICE_ROLE loaded:", bool(SUPABASE_SERVICE_ROLE_KEY))
print("DEBUG HF_API_BASE_URL:", HF_API_BASE_URL)
print("DEBUG HF_PREDICT_TIMEOUT:", HF_PREDICT_TIMEOUT)