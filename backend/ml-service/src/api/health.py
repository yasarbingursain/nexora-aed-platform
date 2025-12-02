"""Health check endpoints for ML service."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import psutil
import time
from datetime import datetime

from ..config import settings

router = APIRouter(prefix="/health", tags=["health"])

# Global model registry for health checks
_model_registry: Optional[Dict[str, Any]] = None

def register_models(models: Dict[str, Any]) -> None:
    """Register loaded models for health checks."""
    global _model_registry
    _model_registry = models

def get_model_status() -> Dict[str, str]:
    """Get actual model loading status."""
    if _model_registry is None:
        return {}
    
    status = {}
    for name, model in _model_registry.items():
        if hasattr(model, 'is_trained'):
            status[name] = "loaded" if model.is_trained else "not_trained"
        else:
            status[name] = "unknown"
    return status


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    version: str
    uptime_seconds: float
    system_info: Dict[str, Any]
    model_status: Dict[str, str]


class ReadinessResponse(BaseModel):
    """Readiness check response model."""
    ready: bool
    checks: Dict[str, bool]
    message: str


# Track service start time
SERVICE_START_TIME = time.time()


@router.get("/", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint - FAIL CLOSED."""
    try:
        # Get actual model status
        model_status = get_model_status()
        
        # FAIL CLOSED: If no models registered or none loaded, return 503
        if not model_status:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        loaded_models = [name for name, status in model_status.items() if status == "loaded"]
        if not loaded_models:
            raise HTTPException(status_code=503, detail="No trained models available")
        
        # Get system information
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        system_info = {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2)
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            version="2025.11.04",
            uptime_seconds=time.time() - SERVICE_START_TIME,
            system_info=system_info,
            model_status=model_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    """Readiness check for Kubernetes probes - FAIL CLOSED."""
    model_status = get_model_status()
    loaded_models = [name for name, status in model_status.items() if status == "loaded"]
    
    checks = {
        "models_loaded": len(loaded_models) > 0,
        "disk_space": psutil.disk_usage('/').percent < 90,
        "memory_usage": psutil.virtual_memory().percent < 90
    }
    
    all_ready = all(checks.values())
    
    return ReadinessResponse(
        ready=all_ready,
        checks=checks,
        message="Service is ready" if all_ready else "Service not ready - check failed components"
    )


@router.get("/live")
async def liveness_check():
    """Simple liveness check for Kubernetes probes."""
    return {"status": "alive", "timestamp": datetime.utcnow()}


@router.get("/metrics")
async def metrics_endpoint():
    """Prometheus-style metrics endpoint."""
    uptime = time.time() - SERVICE_START_TIME
    cpu_percent = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    
    metrics = f"""# HELP nexora_ml_uptime_seconds Total uptime of the ML service
# TYPE nexora_ml_uptime_seconds counter
nexora_ml_uptime_seconds {uptime}

# HELP nexora_ml_cpu_percent Current CPU usage percentage
# TYPE nexora_ml_cpu_percent gauge
nexora_ml_cpu_percent {cpu_percent}

# HELP nexora_ml_memory_percent Current memory usage percentage
# TYPE nexora_ml_memory_percent gauge
nexora_ml_memory_percent {memory.percent}

# HELP nexora_ml_memory_available_bytes Available memory in bytes
# TYPE nexora_ml_memory_available_bytes gauge
nexora_ml_memory_available_bytes {memory.available}
"""
    
    return metrics
