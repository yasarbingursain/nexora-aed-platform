"""Prediction endpoints for ML service."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import asyncio

from ..models.ensemble import EnsembleModel
from ..features.behavioral import BehavioralFeatureExtractor
from ..features.temporal import TemporalFeatureExtractor
from ..features.network import NetworkFeatureExtractor
from ..utils.metrics import ModelMetrics

router = APIRouter(prefix="/predict", tags=["prediction"])


class EntityData(BaseModel):
    """Input data for a single entity."""
    entity_id: str
    entity_type: str = Field(..., description="Type: api_key, service_account, ai_agent, oauth_token")
    timestamp: datetime
    activity_data: Dict[str, Any]
    network_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    tenant_id: str = Field(..., description="Tenant ID for multi-tenant isolation")


class BatchPredictionRequest(BaseModel):
    """Batch prediction request model."""
    tenant_id: str = Field(..., description="Tenant ID for multi-tenant isolation")
    entities: List[EntityData] = Field(..., max_items=1000)
    model_version: Optional[str] = None
    include_explanations: bool = False
    async_processing: bool = False


class AnomalyPrediction(BaseModel):
    """Anomaly prediction result."""
    entity_id: str
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    is_anomaly: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_level: str = Field(..., description="low, medium, high, critical")
    detected_patterns: List[str]
    explanation: Optional[Dict[str, Any]] = None


class MorphingPrediction(BaseModel):
    """Entity morphing prediction result."""
    entity_id: str
    morphing_score: float = Field(..., ge=0.0, le=1.0)
    is_morphing: bool
    morphing_type: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    behavioral_drift: float = Field(..., ge=0.0, le=1.0)
    explanation: Optional[Dict[str, Any]] = None


class PredictionResponse(BaseModel):
    """Complete prediction response."""
    request_id: str
    timestamp: datetime
    processing_time_ms: float
    anomaly_predictions: List[AnomalyPrediction]
    morphing_predictions: List[MorphingPrediction]
    summary: Dict[str, Any]
    model_version: str
    feature_schema_hash: str
    calibration_run_id: str


class AsyncPredictionResponse(BaseModel):
    """Async prediction response."""
    request_id: str
    status: str
    estimated_completion_time: Optional[datetime] = None


# Global model instances (will be loaded on startup)
ensemble_model = None
behavioral_extractor = BehavioralFeatureExtractor()
temporal_extractor = TemporalFeatureExtractor()
network_extractor = NetworkFeatureExtractor()
metrics_tracker = ModelMetrics()


async def get_ensemble_model():
    """Dependency to get the ensemble model."""
    global ensemble_model
    if ensemble_model is None:
        ensemble_model = EnsembleModel()
        await ensemble_model.load_models()
    return ensemble_model


@router.post("/anomaly", response_model=PredictionResponse)
async def predict_anomalies(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks,
    model: EnsembleModel = Depends(get_ensemble_model)
):
    """Predict anomalies for a batch of entities."""
    start_time = datetime.utcnow()
    request_id = str(uuid.uuid4())
    
    try:
        # Handle async processing
        if request.async_processing:
            background_tasks.add_task(
                _process_predictions_async,
                request_id,
                request.entities,
                request.include_explanations
            )
            return AsyncPredictionResponse(
                request_id=request_id,
                status="processing",
                estimated_completion_time=datetime.utcnow().replace(second=datetime.utcnow().second + 30)
            )
        
        # Extract features for all entities
        features_list = []
        for entity in request.entities:
            features = await _extract_features(entity)
            features_list.append(features)
        
        # Get predictions from ensemble model
        anomaly_predictions = await model.predict_anomalies(features_list)
        morphing_predictions = await model.predict_morphing(features_list)
        
        # Format results
        anomaly_results = []
        morphing_results = []
        
        for i, entity in enumerate(request.entities):
            # Anomaly prediction
            anomaly_score = anomaly_predictions[i]['score']
            is_anomaly = anomaly_score > 0.7  # Threshold from config
            
            anomaly_result = AnomalyPrediction(
                entity_id=entity.entity_id,
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                confidence=anomaly_predictions[i]['confidence'],
                risk_level=_calculate_risk_level(anomaly_score),
                detected_patterns=anomaly_predictions[i]['patterns'],
                explanation=anomaly_predictions[i]['explanation'] if request.include_explanations else None
            )
            anomaly_results.append(anomaly_result)
            
            # Morphing prediction
            morphing_score = morphing_predictions[i]['score']
            is_morphing = morphing_score > 0.8  # Threshold from config
            
            morphing_result = MorphingPrediction(
                entity_id=entity.entity_id,
                morphing_score=morphing_score,
                is_morphing=is_morphing,
                morphing_type=morphing_predictions[i]['type'],
                confidence=morphing_predictions[i]['confidence'],
                behavioral_drift=morphing_predictions[i]['drift'],
                explanation=morphing_predictions[i]['explanation'] if request.include_explanations else None
            )
            morphing_results.append(morphing_result)
        
        # Calculate summary statistics
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        summary = {
            "total_entities": len(request.entities),
            "anomalies_detected": sum(1 for r in anomaly_results if r.is_anomaly),
            "morphing_detected": sum(1 for r in morphing_results if r.is_morphing),
            "high_risk_entities": sum(1 for r in anomaly_results if r.risk_level in ["high", "critical"]),
            "average_anomaly_score": sum(r.anomaly_score for r in anomaly_results) / len(anomaly_results),
            "average_morphing_score": sum(r.morphing_score for r in morphing_results) / len(morphing_results)
        }
        
        # Track metrics
        await metrics_tracker.record_prediction_batch(
            request_id=request_id,
            entity_count=len(request.entities),
            processing_time_ms=processing_time,
            anomaly_count=summary["anomalies_detected"],
            morphing_count=summary["morphing_detected"]
        )
        
        return PredictionResponse(
            request_id=request_id,
            timestamp=datetime.utcnow(),
            processing_time_ms=processing_time,
            anomaly_predictions=anomaly_results,
            morphing_predictions=morphing_results,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/status/{request_id}")
async def get_prediction_status(request_id: str):
    """Get status of async prediction request."""
    # This would typically check a database or cache for the request status
    # For now, return a placeholder response
    return {
        "request_id": request_id,
        "status": "completed",
        "result_available": True,
        "completion_time": datetime.utcnow()
    }


@router.post("/single", response_model=Dict[str, Any])
async def predict_single_entity(
    entity: EntityData,
    include_explanation: bool = False,
    model: EnsembleModel = Depends(get_ensemble_model)
):
    """Predict anomaly and morphing for a single entity."""
    try:
        # Extract features
        features = await _extract_features(entity)
        
        # Get predictions
        anomaly_pred = await model.predict_anomalies([features])
        morphing_pred = await model.predict_morphing([features])
        
        result = {
            "entity_id": entity.entity_id,
            "anomaly": {
                "score": anomaly_pred[0]['score'],
                "is_anomaly": anomaly_pred[0]['score'] > 0.7,
                "confidence": anomaly_pred[0]['confidence'],
                "risk_level": _calculate_risk_level(anomaly_pred[0]['score']),
                "patterns": anomaly_pred[0]['patterns']
            },
            "morphing": {
                "score": morphing_pred[0]['score'],
                "is_morphing": morphing_pred[0]['score'] > 0.8,
                "type": morphing_pred[0]['type'],
                "confidence": morphing_pred[0]['confidence'],
                "drift": morphing_pred[0]['drift']
            }
        }
        
        if include_explanation:
            result["explanation"] = {
                "anomaly": anomaly_pred[0]['explanation'],
                "morphing": morphing_pred[0]['explanation']
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single prediction failed: {str(e)}")


async def _extract_features(entity: EntityData) -> Dict[str, Any]:
    """Extract features from entity data."""
    features = {}
    
    # Extract behavioral features
    behavioral_features = await behavioral_extractor.extract(entity.activity_data)
    features.update(behavioral_features)
    
    # Extract temporal features
    temporal_features = await temporal_extractor.extract(entity.timestamp, entity.activity_data)
    features.update(temporal_features)
    
    # Extract network features if available
    if entity.network_data:
        network_features = await network_extractor.extract(entity.network_data)
        features.update(network_features)
    
    # Add metadata features
    if entity.metadata:
        features['entity_type'] = entity.entity_type
        features.update({f"meta_{k}": v for k, v in entity.metadata.items()})
    
    return features


def _calculate_risk_level(anomaly_score: float) -> str:
    """Calculate risk level based on anomaly score."""
    if anomaly_score >= 0.9:
        return "critical"
    elif anomaly_score >= 0.8:
        return "high"
    elif anomaly_score >= 0.6:
        return "medium"
    else:
        return "low"


async def _process_predictions_async(
    request_id: str,
    entities: List[EntityData],
    include_explanations: bool
):
    """Process predictions asynchronously."""
    # This would typically store results in a database or cache
    # For now, just simulate processing
    await asyncio.sleep(10)  # Simulate processing time
    
    # Store results (placeholder)
    print(f"Async processing completed for request {request_id}")


@router.get("/models/info")
async def get_model_info(model: EnsembleModel = Depends(get_ensemble_model)):
    """Get information about loaded models."""
    return await model.get_model_info()
