"""Compatibility entrypoint. Requires the Python 3.11 .venv-ml environment."""
from local_ml_server import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
