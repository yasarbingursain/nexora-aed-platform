"""
Nexora ML Service
Enterprise-grade Machine Learning for Identity Anomaly Detection

Standards Compliance:
- NIST AI RMF (AI Risk Management Framework)
- ISO/IEC 23894 (AI Risk Management)
- MITRE ATLAS (Adversarial Threat Landscape for AI Systems)

Author: Nexora Security Team
Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
import joblib
import logging
import os
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Nexora ML Service",
    description="Machine Learning service for identity anomaly detection",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MODELS
# ============================================================================

class FeatureInput(BaseModel):
    behavioral: Dict[str, Any] = Field(..., description="Behavioral features")
    temporal: Dict[str, Any] = Field(..., description="Temporal features")
    network: Dict[str, Any] = Field(..., description="Network features")

class PredictionRequest(BaseModel):
    identity_id: str
    organization_id: str
    features: FeatureInput

class PredictionResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    risk_level: str
    confidence: float
    contributing_factors: List[str]
    model_version: str

class TrainingData(BaseModel):
    features: List[Dict[str, Any]]
    labels: List[int]

class ModelInfo(BaseModel):
    name: str
    version: str
    trained_at: Optional[str]
    accuracy: Optional[float]
    feature_count: int

# ============================================================================
# ML ENGINE
# ============================================================================

class AnomalyDetectionEngine:
    """
    Hybrid anomaly detection using RandomForest and IsolationForest
    """
    
    def __init__(self):
        self.random_forest: Optional[CalibratedClassifierCV] = None
        self.isolation_forest: Optional[IsolationForest] = None
        self.scaler: StandardScaler = StandardScaler()
        self.feature_names: List[str] = []
        self.model_version = "1.0.0"
        self.trained_at: Optional[datetime] = None
        self.is_trained = False
        
        # Initialize with default models
        self._initialize_default_models()
    
    def _initialize_default_models(self):
        """Initialize models with sensible defaults"""
        # RandomForest for supervised classification
        base_rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        # Wrap with calibration for probability estimates
        self.random_forest = CalibratedClassifierCV(base_rf, cv=3)
        
        # IsolationForest for unsupervised anomaly detection
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            max_samples='auto',
            contamination=0.1,
            random_state=42,
            n_jobs=-1
        )
        
        # Define feature names
        self.feature_names = [
            'resource_access_pattern',
            'scope_usage',
            'api_call_frequency',
            'error_rate',
            'baseline_deviation',
            'activity_burst_score',
            'inactive_periods',
            'unique_ips',
            'unique_regions',
            'geographic_anomaly',
            'user_agent_changes',
            'hour_entropy',
            'day_entropy'
        ]
        
        logger.info("Default models initialized")
    
    def extract_features(self, feature_input: FeatureInput) -> np.ndarray:
        """Extract numerical features from input"""
        behavioral = feature_input.behavioral
        temporal = feature_input.temporal
        network = feature_input.network
        
        # Calculate entropy for time distributions
        hour_dist = temporal.get('time_of_day_distribution', {})
        day_dist = temporal.get('day_of_week_pattern', {})
        
        hour_entropy = self._calculate_entropy(list(hour_dist.values())) if hour_dist else 0
        day_entropy = self._calculate_entropy(list(day_dist.values())) if day_dist else 0
        
        features = [
            float(behavioral.get('resource_access_pattern', 0)),
            float(behavioral.get('scope_usage', 0)),
            float(behavioral.get('api_call_frequency', 0)),
            float(behavioral.get('error_rate', 0)),
            float(behavioral.get('baseline_deviation', 0)),
            float(temporal.get('activity_burst_score', 0)),
            float(temporal.get('inactive_periods', 0)),
            float(network.get('unique_ips', 0)),
            float(network.get('unique_regions', 0)),
            float(network.get('geographic_anomaly', 0)),
            float(network.get('user_agent_changes', 0)),
            hour_entropy,
            day_entropy
        ]
        
        return np.array(features).reshape(1, -1)
    
    def _calculate_entropy(self, values: List[float]) -> float:
        """Calculate Shannon entropy"""
        if not values or sum(values) == 0:
            return 0.0
        
        total = sum(values)
        probs = [v / total for v in values if v > 0]
        return -sum(p * np.log2(p) for p in probs if p > 0)
    
    def predict(self, feature_input: FeatureInput) -> PredictionResponse:
        """Make anomaly prediction"""
        features = self.extract_features(feature_input)
        
        # Scale features
        if self.is_trained:
            features_scaled = self.scaler.transform(features)
        else:
            features_scaled = features
        
        # Get predictions from both models
        if self.is_trained and self.random_forest is not None:
            rf_proba = self.random_forest.predict_proba(features_scaled)[0]
            rf_anomaly_score = rf_proba[1] if len(rf_proba) > 1 else 0.5
        else:
            rf_anomaly_score = 0.5
        
        if self.isolation_forest is not None:
            # IsolationForest returns -1 for anomalies, 1 for normal
            if_score = self.isolation_forest.score_samples(features_scaled)[0]
            # Convert to 0-1 range (more negative = more anomalous)
            if_anomaly_score = 1 / (1 + np.exp(if_score))  # Sigmoid transform
        else:
            if_anomaly_score = 0.5
        
        # Ensemble: weighted average
        anomaly_score = 0.6 * rf_anomaly_score + 0.4 * if_anomaly_score
        
        # Determine if anomaly
        is_anomaly = anomaly_score > 0.5
        
        # Calculate confidence
        confidence = abs(anomaly_score - 0.5) * 2  # 0-1 range
        
        # Determine risk level
        risk_level = self._calculate_risk_level(anomaly_score)
        
        # Identify contributing factors
        contributing_factors = self._identify_contributing_factors(
            feature_input, features[0]
        )
        
        return PredictionResponse(
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 4),
            risk_level=risk_level,
            confidence=round(confidence, 4),
            contributing_factors=contributing_factors,
            model_version=self.model_version
        )
    
    def _calculate_risk_level(self, score: float) -> str:
        """Calculate risk level from anomaly score"""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        return "low"
    
    def _identify_contributing_factors(
        self, 
        feature_input: FeatureInput, 
        features: np.ndarray
    ) -> List[str]:
        """Identify which features contribute most to anomaly"""
        factors = []
        
        behavioral = feature_input.behavioral
        temporal = feature_input.temporal
        network = feature_input.network
        
        # Check each feature against thresholds
        if behavioral.get('baseline_deviation', 0) > 0.5:
            factors.append("High baseline deviation")
        
        if behavioral.get('error_rate', 0) > 0.2:
            factors.append("Elevated error rate")
        
        if temporal.get('activity_burst_score', 0) > 0:
            factors.append("Unusual activity burst detected")
        
        if network.get('geographic_anomaly', 0) > 0:
            factors.append("Geographic anomaly detected")
        
        if network.get('unique_regions', 0) > 3:
            factors.append("Multiple geographic regions")
        
        if behavioral.get('scope_usage', 0) > 10:
            factors.append("High scope usage")
        
        if network.get('user_agent_changes', 0) > 3:
            factors.append("Multiple user agent changes")
        
        return factors[:5]  # Return top 5 factors
    
    def train(self, training_data: TrainingData) -> Dict[str, Any]:
        """Train models on labeled data"""
        if len(training_data.features) < 10:
            raise ValueError("Insufficient training data (minimum 10 samples)")
        
        # Extract features
        X = []
        for feature_dict in training_data.features:
            feature_input = FeatureInput(
                behavioral=feature_dict.get('behavioral', {}),
                temporal=feature_dict.get('temporal', {}),
                network=feature_dict.get('network', {})
            )
            X.append(self.extract_features(feature_input)[0])
        
        X = np.array(X)
        y = np.array(training_data.labels)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train RandomForest
        self.random_forest.fit(X_scaled, y)
        
        # Train IsolationForest on normal samples only
        normal_samples = X_scaled[y == 0]
        if len(normal_samples) > 5:
            self.isolation_forest.fit(normal_samples)
        
        self.is_trained = True
        self.trained_at = datetime.utcnow()
        
        # Calculate accuracy (simple holdout)
        predictions = self.random_forest.predict(X_scaled)
        accuracy = np.mean(predictions == y)
        
        logger.info(f"Models trained successfully. Accuracy: {accuracy:.4f}")
        
        return {
            "success": True,
            "samples_trained": len(X),
            "accuracy": round(accuracy, 4),
            "trained_at": self.trained_at.isoformat()
        }
    
    def get_model_info(self) -> ModelInfo:
        """Get model information"""
        return ModelInfo(
            name="Nexora Anomaly Detection Engine",
            version=self.model_version,
            trained_at=self.trained_at.isoformat() if self.trained_at else None,
            accuracy=None,
            feature_count=len(self.feature_names)
        )
    
    def save_models(self, path: str):
        """Save models to disk"""
        os.makedirs(path, exist_ok=True)
        
        joblib.dump(self.random_forest, f"{path}/random_forest.joblib")
        joblib.dump(self.isolation_forest, f"{path}/isolation_forest.joblib")
        joblib.dump(self.scaler, f"{path}/scaler.joblib")
        
        metadata = {
            "version": self.model_version,
            "trained_at": self.trained_at.isoformat() if self.trained_at else None,
            "feature_names": self.feature_names,
            "is_trained": self.is_trained
        }
        
        with open(f"{path}/metadata.json", "w") as f:
            json.dump(metadata, f)
        
        logger.info(f"Models saved to {path}")
    
    def load_models(self, path: str):
        """Load models from disk"""
        try:
            self.random_forest = joblib.load(f"{path}/random_forest.joblib")
            self.isolation_forest = joblib.load(f"{path}/isolation_forest.joblib")
            self.scaler = joblib.load(f"{path}/scaler.joblib")
            
            with open(f"{path}/metadata.json", "r") as f:
                metadata = json.load(f)
            
            self.model_version = metadata.get("version", "1.0.0")
            self.feature_names = metadata.get("feature_names", self.feature_names)
            self.is_trained = metadata.get("is_trained", False)
            
            if metadata.get("trained_at"):
                self.trained_at = datetime.fromisoformat(metadata["trained_at"])
            
            logger.info(f"Models loaded from {path}")
        except Exception as e:
            logger.warning(f"Could not load models: {e}. Using defaults.")

# Initialize engine
engine = AnomalyDetectionEngine()

# Try to load pre-trained models
MODEL_PATH = os.getenv("MODEL_PATH", "./models")
if os.path.exists(f"{MODEL_PATH}/metadata.json"):
    engine.load_models(MODEL_PATH)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "nexora-ml",
        "version": engine.model_version,
        "is_trained": engine.is_trained,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v1/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make anomaly prediction for an identity"""
    try:
        prediction = engine.predict(request.features)
        
        logger.info(f"Prediction made for identity {request.identity_id}: "
                   f"anomaly={prediction.is_anomaly}, score={prediction.anomaly_score}")
        
        return prediction
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/train")
async def train(data: TrainingData):
    """Train models on labeled data"""
    try:
        result = engine.train(data)
        
        # Save models after training
        engine.save_models(MODEL_PATH)
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/model/info", response_model=ModelInfo)
async def get_model_info():
    """Get model information"""
    return engine.get_model_info()

@app.post("/api/v1/model/save")
async def save_models():
    """Save models to disk"""
    try:
        engine.save_models(MODEL_PATH)
        return {"success": True, "path": MODEL_PATH}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/model/load")
async def load_models():
    """Load models from disk"""
    try:
        engine.load_models(MODEL_PATH)
        return {"success": True, "is_trained": engine.is_trained}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
