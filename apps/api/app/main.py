from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.dicom import router as dicom_router

app = FastAPI(
    title="OncaScan API",
    description="Backend inicial para OncaScan Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1", tags=["health"])
app.include_router(dicom_router, prefix="/api/v1", tags=["dicom"])


@app.get("/")
def root():
    return {
        "message": "OncaScan API running"
    }