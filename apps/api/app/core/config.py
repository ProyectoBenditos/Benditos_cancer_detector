import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

APP_NAME = "OncaScan API"
APP_VERSION = "0.1.0"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "dicom-files")

HF_API_BASE_URL = os.getenv("HF_API_BASE_URL", "https://luisdam-oncoscan-ai.hf.space")
HF_PREDICT_TIMEOUT = float(os.getenv("HF_PREDICT_TIMEOUT", "120"))

_REQUIRED_ENV = {
    "SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_ROLE_KEY,
}

_missing = [name for name, value in _REQUIRED_ENV.items() if not value]
if _missing:
    raise RuntimeError(
        "Variables de entorno obligatorias ausentes: "
        f"{', '.join(sorted(_missing))}. Define las claves en {ENV_PATH} "
        "o en el entorno antes de arrancar la API."
    )
