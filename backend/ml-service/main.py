"""Main FastAPI application for Nexora ML Service."""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging
import sys
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent / "src"))

from src.config import settings
from src.config.version import MODEL_VERSION
from src.api.health import router as health_router, register_models
from src.api.predict import router as predict_router
from src.api.train import router as train_router
from src.models.ensemble import EnsembleModel

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ml-service.log")
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with model loading."""
    # Startup
    logger.info(f"Starting Nexora ML Service v{MODEL_VERSION}...")
    
    try:
        # Initialize MLflow
        import mlflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment_name)
        logger.info(f"MLflow initialized with URI: {settings.mlflow_tracking_uri}")
        
        # CRITICAL: Load and register models for fail-closed health checks
        logger.info("Loading ML models...")
        ensemble_model = EnsembleModel()
        
        try:
            # Attempt to load pre-trained models
            await ensemble_model.load_models(settings.model_storage_path)
            logger.info("Pre-trained models loaded successfully")
        except Exception as e:
            logger.warning(f"No pre-trained models found: {str(e)}")
            logger.info("Models will need to be trained before predictions")
        
        # Register models with health check system
        model_registry = {
            'ensemble': ensemble_model,
            **ensemble_model.anomaly_models,
            **ensemble_model.morphing_models
        }
        register_models(model_registry)
        logger.info(f"Registered {len(model_registry)} models with health check system")
        
        # Store ensemble in app state for endpoint access
        app.state.ensemble_model = ensemble_model
        
        logger.info("ML Service startup completed successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize ML service: {str(e)}")
        # FAIL CLOSED: Don't start if critical initialization fails
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Nexora ML Service...")


# Create FastAPI application
app = FastAPI(
    title="Nexora ML Service",
    description="Advanced ML-based threat detection and entity morphing detection for Nexora AED Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure appropriately for production
)

# Include routers
app.include_router(health_router)
app.include_router(predict_router)
app.include_router(train_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Nexora ML Service",
        "version": "1.0.0",
        "description": "Advanced ML-based threat detection and entity morphing detection",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "prediction": "/predict",
            "training": "/train",
            "docs": "/docs"
        }
    }


@app.get("/info")
async def service_info():
    """Get service information."""
    return {
        "service_name": "Nexora ML Service",
        "version": "1.0.0",
        "description": "Enterprise-grade ML service for anomaly detection and entity morphing detection",
        "capabilities": [
            "Anomaly Detection (Isolation Forest, One-Class SVM, Autoencoder)",
            "Entity Morphing Detection",
            "Behavioral Drift Detection",
            "Feature Engineering (Behavioral, Temporal, Network)",
            "Model Ensemble and Voting",
            "Real-time Prediction",
            "Model Training and Retraining",
            "Explainable AI",
            "Performance Monitoring"
        ],
        "supported_models": [
            "isolation_forest",
            "ocsvm", 
            "autoencoder",
            "ensemble"
        ],
        "feature_types": [
            "behavioral",
            "temporal", 
            "network",
            "entity_graph"
        ]
    }


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        log_level=settings.log_level.lower(),
        reload=False,  # Set to True for development
        access_log=True
    )
