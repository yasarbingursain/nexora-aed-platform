from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.core.config import get_settings
from app.api.v1.routes import router as api_v1_router
from app.tasks.sync_malware import sync_malware_from_bazaar

settings = get_settings()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events - sync malware data on startup"""
    # Startup
    logger.info("🚀 MalGenX service starting...")
    logger.info("📡 Data Source: MalwareBazaar API (https://mb-api.abuse.ch)")
    
    # Sync real malware data from MalwareBazaar
    try:
        logger.info("🔄 Syncing real malware samples from MalwareBazaar...")
        await sync_malware_from_bazaar()
        
        # Schedule periodic sync every 10 minutes
        async def periodic_sync():
            while True:
                await asyncio.sleep(600)  # 10 minutes
                try:
                    logger.info("🔄 Running periodic MalwareBazaar sync...")
                    await sync_malware_from_bazaar()
                except Exception as e:
                    logger.error(f"❌ Periodic sync error: {e}")
        
        asyncio.create_task(periodic_sync())
        logger.info("✅ Real-time MalwareBazaar sync enabled (10-minute intervals)")
    except Exception as e:
        logger.error(f"❌ Failed to sync malware data: {e}")
    
    yield
    
    # Shutdown
    logger.info("MalGenX service shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
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
        "data_source": "MalwareBazaar API (abuse.ch)",
        "api_endpoint": "https://mb-api.abuse.ch/api/v1/",
    }


app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX, tags=["malgenx"])
