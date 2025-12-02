from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.v1.routes import router as api_v1_router

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
)

# CORS: align with main Nexora backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # can be tightened later to FRONTEND_URL / gateway
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
    }


app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX, tags=["malgenx"])
