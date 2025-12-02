"""Training endpoints for ML service."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import asyncio
import pandas as pd
import io

from ..training.trainer import ModelTrainer
from ..training.evaluator import ModelEvaluator
from ..utils.metrics import TrainingMetrics

router = APIRouter(prefix="/train", tags=["training"])


class TrainingRequest(BaseModel):
    """Training request model."""
    model_type: str = Field(..., description="isolation_forest, ocsvm, autoencoder, ensemble")
    training_config: Optional[Dict[str, Any]] = None
    hyperparameter_tuning: bool = False
    cross_validation: bool = True
    experiment_name: Optional[str] = None


class TrainingResponse(BaseModel):
    """Training response model."""
    job_id: str
    status: str
    started_at: datetime
    estimated_duration_minutes: int
    model_type: str


class TrainingStatus(BaseModel):
    """Training status model."""
    job_id: str
    status: str  # queued, running, completed, failed
    progress_percent: float
    current_stage: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class EvaluationRequest(BaseModel):
    """Model evaluation request."""
    model_id: str
    test_data_path: Optional[str] = None
    evaluation_metrics: List[str] = ["precision", "recall", "f1", "auc"]


class EvaluationResponse(BaseModel):
    """Model evaluation response."""
    model_id: str
    evaluation_id: str
    metrics: Dict[str, float]
    confusion_matrix: List[List[int]]
    feature_importance: Optional[Dict[str, float]] = None
    evaluation_timestamp: datetime


# Global instances
trainer = ModelTrainer()
evaluator = ModelEvaluator()
training_metrics = TrainingMetrics()

# In-memory job tracking (in production, use Redis or database)
training_jobs = {}


@router.post("/start", response_model=TrainingResponse)
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """Start a new training job."""
    try:
        job_id = str(uuid.uuid4())
        
        # Estimate duration based on model type
        duration_estimates = {
            "isolation_forest": 5,
            "ocsvm": 10,
            "autoencoder": 30,
            "ensemble": 45
        }
        
        estimated_duration = duration_estimates.get(request.model_type, 15)
        
        # Create job record
        job_record = {
            "job_id": job_id,
            "status": "queued",
            "progress_percent": 0.0,
            "current_stage": "initializing",
            "started_at": datetime.utcnow(),
            "model_type": request.model_type,
            "config": request.training_config or {},
            "hyperparameter_tuning": request.hyperparameter_tuning,
            "cross_validation": request.cross_validation
        }
        
        training_jobs[job_id] = job_record
        
        # Start training in background
        background_tasks.add_task(
            _run_training_job,
            job_id,
            request
        )
        
        return TrainingResponse(
            job_id=job_id,
            status="queued",
            started_at=datetime.utcnow(),
            estimated_duration_minutes=estimated_duration,
            model_type=request.model_type
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")


@router.get("/status/{job_id}", response_model=TrainingStatus)
async def get_training_status(job_id: str):
    """Get training job status."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    job = training_jobs[job_id]
    
    return TrainingStatus(
        job_id=job_id,
        status=job["status"],
        progress_percent=job["progress_percent"],
        current_stage=job["current_stage"],
        started_at=job["started_at"],
        completed_at=job.get("completed_at"),
        error_message=job.get("error_message"),
        metrics=job.get("metrics")
    )


@router.post("/stop/{job_id}")
async def stop_training(job_id: str):
    """Stop a running training job."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    job = training_jobs[job_id]
    
    if job["status"] in ["completed", "failed", "stopped"]:
        raise HTTPException(status_code=400, detail=f"Job is already {job['status']}")
    
    # Update job status
    job["status"] = "stopped"
    job["completed_at"] = datetime.utcnow()
    job["current_stage"] = "stopped by user"
    
    return {"message": f"Training job {job_id} stopped successfully"}


@router.get("/jobs")
async def list_training_jobs(
    status: Optional[str] = None,
    model_type: Optional[str] = None,
    limit: int = 50
):
    """List training jobs with optional filtering."""
    jobs = list(training_jobs.values())
    
    # Apply filters
    if status:
        jobs = [job for job in jobs if job["status"] == status]
    
    if model_type:
        jobs = [job for job in jobs if job["model_type"] == model_type]
    
    # Sort by start time (newest first) and limit
    jobs = sorted(jobs, key=lambda x: x["started_at"], reverse=True)[:limit]
    
    return {"jobs": jobs, "total": len(jobs)}


@router.post("/upload-data")
async def upload_training_data(
    file: UploadFile = File(...),
    data_type: str = "training"  # training, validation, test
):
    """Upload training data file."""
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.parquet', '.json')):
            raise HTTPException(
                status_code=400,
                detail="Only CSV, Parquet, and JSON files are supported"
            )
        
        # Read and validate data
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Basic validation
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Store file (in production, use cloud storage)
        file_id = str(uuid.uuid4())
        file_path = f"data/{data_type}_{file_id}_{file.filename}"
        
        # Save file metadata
        file_metadata = {
            "file_id": file_id,
            "original_name": file.filename,
            "file_path": file_path,
            "data_type": data_type,
            "upload_time": datetime.utcnow(),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "file_size_bytes": len(content)
        }
        
        return {
            "message": "File uploaded successfully",
            "file_id": file_id,
            "metadata": file_metadata
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_model(request: EvaluationRequest):
    """Evaluate a trained model."""
    try:
        evaluation_id = str(uuid.uuid4())
        
        # Run evaluation
        results = await evaluator.evaluate_model(
            model_id=request.model_id,
            test_data_path=request.test_data_path,
            metrics=request.evaluation_metrics
        )
        
        return EvaluationResponse(
            model_id=request.model_id,
            evaluation_id=evaluation_id,
            metrics=results["metrics"],
            confusion_matrix=results["confusion_matrix"],
            feature_importance=results.get("feature_importance"),
            evaluation_timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model evaluation failed: {str(e)}")


@router.get("/models")
async def list_trained_models():
    """List all trained models."""
    try:
        models = await trainer.list_models()
        return {"models": models}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a trained model."""
    try:
        await trainer.delete_model(model_id)
        return {"message": f"Model {model_id} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")


async def _run_training_job(job_id: str, request: TrainingRequest):
    """Run training job in background."""
    job = training_jobs[job_id]
    
    try:
        # Update status
        job["status"] = "running"
        job["current_stage"] = "data preparation"
        job["progress_percent"] = 10.0
        
        # Simulate training stages
        stages = [
            ("data preparation", 10.0),
            ("feature extraction", 25.0),
            ("model training", 60.0),
            ("validation", 80.0),
            ("model saving", 95.0),
            ("completed", 100.0)
        ]
        
        for stage, progress in stages:
            if job["status"] == "stopped":
                return
            
            job["current_stage"] = stage
            job["progress_percent"] = progress
            
            # Simulate processing time
            await asyncio.sleep(2)
        
        # Run actual training
        model_info = await trainer.train_model(
            model_type=request.model_type,
            config=request.training_config or {},
            hyperparameter_tuning=request.hyperparameter_tuning,
            cross_validation=request.cross_validation,
            experiment_name=request.experiment_name
        )
        
        # Update job with results
        job["status"] = "completed"
        job["completed_at"] = datetime.utcnow()
        job["metrics"] = model_info.get("metrics", {})
        job["model_id"] = model_info.get("model_id")
        
    except Exception as e:
        job["status"] = "failed"
        job["completed_at"] = datetime.utcnow()
        job["error_message"] = str(e)
        job["current_stage"] = "failed"


@router.get("/experiments")
async def list_experiments():
    """List MLflow experiments."""
    try:
        experiments = await trainer.list_experiments()
        return {"experiments": experiments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list experiments: {str(e)}")


@router.post("/retrain/{model_id}")
async def retrain_model(
    model_id: str,
    background_tasks: BackgroundTasks,
    config: Optional[Dict[str, Any]] = None
):
    """Retrain an existing model with new data."""
    try:
        job_id = str(uuid.uuid4())
        
        # Create retraining job
        job_record = {
            "job_id": job_id,
            "status": "queued",
            "progress_percent": 0.0,
            "current_stage": "initializing retraining",
            "started_at": datetime.utcnow(),
            "model_type": "retrain",
            "original_model_id": model_id,
            "config": config or {}
        }
        
        training_jobs[job_id] = job_record
        
        # Start retraining in background
        background_tasks.add_task(_run_retraining_job, job_id, model_id, config)
        
        return {
            "job_id": job_id,
            "message": f"Retraining started for model {model_id}",
            "status": "queued"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start retraining: {str(e)}")


async def _run_retraining_job(job_id: str, model_id: str, config: Optional[Dict[str, Any]]):
    """Run retraining job in background."""
    job = training_jobs[job_id]
    
    try:
        job["status"] = "running"
        job["current_stage"] = "loading existing model"
        job["progress_percent"] = 20.0
        
        # Simulate retraining process
        await asyncio.sleep(5)
        
        job["current_stage"] = "incremental training"
        job["progress_percent"] = 70.0
        
        await asyncio.sleep(10)
        
        job["status"] = "completed"
        job["completed_at"] = datetime.utcnow()
        job["progress_percent"] = 100.0
        job["current_stage"] = "retraining completed"
        
    except Exception as e:
        job["status"] = "failed"
        job["completed_at"] = datetime.utcnow()
        job["error_message"] = str(e)
