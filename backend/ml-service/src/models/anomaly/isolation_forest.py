"""Isolation Forest model for anomaly detection."""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV
from typing import Dict, Any, List, Tuple, Optional
import joblib
import logging
from datetime import datetime
import mlflow
import mlflow.sklearn

from ...config import model_config
from ...utils.explainability import ExplainabilityEngine

logger = logging.getLogger(__name__)


class IsolationForestModel:
    """Isolation Forest model for detecting anomalous entity behavior."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Isolation Forest model."""
        self.config = config or model_config['anomaly_detection']['isolation_forest']
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False
        self.model_version = None
        self.explainer = ExplainabilityEngine()
        
        # Model parameters from config
        self.n_estimators = self.config.get('n_estimators', 200)
        self.contamination = self.config.get('contamination', 0.1)
        self.max_samples = self.config.get('max_samples', 'auto')
        self.max_features = self.config.get('max_features', 1.0)
        self.bootstrap = self.config.get('bootstrap', False)
        self.random_state = model_config['global']['random_state']
        self.n_jobs = model_config['global']['n_jobs']
        
    def train(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        hyperparameter_tuning: bool = False,
        cross_validation: bool = True
    ) -> Dict[str, Any]:
        """Train the Isolation Forest model."""
        logger.info("Starting Isolation Forest training...")
        
        try:
            # Store feature names
            self.feature_names = list(X.columns)
            
            # Preprocess data
            X_scaled = self._preprocess_data(X, fit_scaler=True)
            
            if hyperparameter_tuning:
                logger.info("Performing hyperparameter tuning...")
                self.model = self._hyperparameter_tuning(X_scaled)
            else:
                # Initialize model with config parameters
                self.model = IsolationForest(
                    n_estimators=self.n_estimators,
                    contamination=self.contamination,
                    max_samples=self.max_samples,
                    max_features=self.max_features,
                    bootstrap=self.bootstrap,
                    random_state=self.random_state,
                    n_jobs=self.n_jobs
                )
                
                # Fit the model
                self.model.fit(X_scaled)
            
            self.is_trained = True
            self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Calculate training metrics
            train_scores = self.model.decision_function(X_scaled)
            train_predictions = self.model.predict(X_scaled)
            
            # Convert predictions (-1, 1) to (1, 0) for anomalies
            train_anomalies = (train_predictions == -1).astype(int)
            
            metrics = {
                "model_type": "isolation_forest",
                "n_estimators": self.model.n_estimators,
                "contamination": self.model.contamination,
                "training_samples": len(X),
                "feature_count": len(self.feature_names),
                "anomaly_rate": np.mean(train_anomalies),
                "mean_anomaly_score": np.mean(train_scores),
                "std_anomaly_score": np.std(train_scores),
                "model_version": self.model_version
            }
            
            # Log to MLflow
            with mlflow.start_run(run_name=f"isolation_forest_{self.model_version}"):
                mlflow.log_params({
                    "n_estimators": self.n_estimators,
                    "contamination": self.contamination,
                    "max_samples": self.max_samples,
                    "max_features": self.max_features
                })
                mlflow.log_metrics(metrics)
                mlflow.sklearn.log_model(self.model, "isolation_forest_model")
            
            logger.info(f"Isolation Forest training completed. Anomaly rate: {metrics['anomaly_rate']:.3f}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            raise
    
    def predict(self, X: pd.DataFrame) -> Dict[str, Any]:
        """Predict anomalies for input data."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        try:
            # Preprocess data
            X_scaled = self._preprocess_data(X, fit_scaler=False)
            
            # Get predictions and scores
            predictions = self.model.predict(X_scaled)
            scores = self.model.decision_function(X_scaled)
            
            # Convert to anomaly probabilities (0-1 scale)
            # Isolation Forest scores are typically negative for anomalies
            # We need to convert them to 0-1 probabilities
            anomaly_scores = self._convert_scores_to_probabilities(scores)
            
            # Convert predictions (-1, 1) to boolean anomalies
            is_anomaly = (predictions == -1)
            
            # Generate explanations for anomalies
            explanations = []
            patterns = []
            
            for i, (score, is_anom) in enumerate(zip(anomaly_scores, is_anomaly)):
                if is_anom:
                    explanation = self._generate_explanation(X.iloc[i], X_scaled[i], score)
                    explanations.append(explanation)
                    patterns.append(explanation.get('detected_patterns', []))
                else:
                    explanations.append(None)
                    patterns.append([])
            
            results = {
                'scores': anomaly_scores.tolist(),
                'predictions': is_anomaly.tolist(),
                'explanations': explanations,
                'patterns': patterns,
                'confidence': self._calculate_confidence(anomaly_scores),
                'model_version': self.model_version
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise
    
    def predict_single(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict anomaly for a single entity."""
        # Convert to DataFrame
        X = pd.DataFrame([features])
        
        # Ensure all expected features are present
        for feature in self.feature_names:
            if feature not in X.columns:
                X[feature] = 0  # Default value for missing features
        
        # Reorder columns to match training data
        X = X[self.feature_names]
        
        # Get prediction
        result = self.predict(X)
        
        # Return single result
        return {
            'score': result['scores'][0],
            'is_anomaly': result['predictions'][0],
            'confidence': result['confidence'][0],
            'explanation': result['explanations'][0],
            'patterns': result['patterns'][0]
        }
    
    def _preprocess_data(self, X: pd.DataFrame, fit_scaler: bool = False) -> np.ndarray:
        """Preprocess input data."""
        # Handle missing values
        X_clean = X.fillna(X.mean())
        
        # Scale features
        if fit_scaler:
            X_scaled = self.scaler.fit_transform(X_clean)
        else:
            X_scaled = self.scaler.transform(X_clean)
        
        return X_scaled
    
    def _hyperparameter_tuning(self, X: np.ndarray) -> IsolationForest:
        """Perform hyperparameter tuning using GridSearchCV."""
        param_grid = {
            'n_estimators': [100, 200, 300],
            'contamination': [0.05, 0.1, 0.15, 0.2],
            'max_samples': ['auto', 0.5, 0.7, 1.0],
            'max_features': [0.5, 0.7, 1.0]
        }
        
        # Create base model
        base_model = IsolationForest(
            random_state=self.random_state,
            n_jobs=self.n_jobs
        )
        
        # Custom scoring function for unsupervised learning
        def isolation_forest_scorer(estimator, X):
            # Return negative mean anomaly score (higher is better)
            scores = estimator.decision_function(X)
            return -np.mean(scores)
        
        # Perform grid search
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            scoring=isolation_forest_scorer,
            cv=3,  # Use 3-fold CV for unsupervised learning
            n_jobs=self.n_jobs,
            verbose=1
        )
        
        grid_search.fit(X)
        
        logger.info(f"Best parameters: {grid_search.best_params_}")
        logger.info(f"Best score: {grid_search.best_score_}")
        
        return grid_search.best_estimator_
    
    def _convert_scores_to_probabilities(self, scores: np.ndarray) -> np.ndarray:
        """Convert Isolation Forest scores to anomaly probabilities."""
        # Isolation Forest scores are typically in range [-0.5, 0.5]
        # Negative scores indicate anomalies
        # We convert to 0-1 probabilities where 1 = high anomaly probability
        
        # Normalize scores to 0-1 range
        min_score = np.min(scores)
        max_score = np.max(scores)
        
        if max_score == min_score:
            return np.full_like(scores, 0.5)
        
        # Invert and normalize: lower scores (more negative) = higher anomaly probability
        normalized_scores = (max_score - scores) / (max_score - min_score)
        
        return normalized_scores
    
    def _calculate_confidence(self, scores: np.ndarray) -> List[float]:
        """Calculate confidence scores for predictions."""
        # Confidence based on distance from decision boundary
        # Higher absolute scores = higher confidence
        confidence_scores = []
        
        for score in scores:
            # Map score to confidence (0-1)
            if score > 0.8:  # High anomaly score
                confidence = min(0.95, 0.5 + (score - 0.8) * 2.25)
            elif score < 0.2:  # Low anomaly score
                confidence = min(0.95, 0.5 + (0.2 - score) * 2.25)
            else:  # Medium scores have lower confidence
                confidence = 0.3 + (0.5 - abs(score - 0.5)) * 0.4
            
            confidence_scores.append(confidence)
        
        return confidence_scores
    
    def _generate_explanation(
        self,
        original_features: pd.Series,
        scaled_features: np.ndarray,
        anomaly_score: float
    ) -> Dict[str, Any]:
        """Generate explanation for anomaly detection."""
        try:
            # Feature importance based on isolation paths
            feature_importance = self._calculate_feature_importance(scaled_features)
            
            # Identify top contributing features
            top_features = sorted(
                zip(self.feature_names, feature_importance),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            # Detect patterns
            detected_patterns = []
            
            for feature_name, importance in top_features:
                if importance > 0.1:  # Significant contribution
                    value = original_features[feature_name]
                    detected_patterns.append(f"unusual_{feature_name}")
            
            # Generate human-readable explanation
            explanation_text = self._generate_explanation_text(
                top_features,
                anomaly_score,
                detected_patterns
            )
            
            return {
                'anomaly_score': float(anomaly_score),
                'feature_importance': dict(top_features),
                'detected_patterns': detected_patterns,
                'explanation_text': explanation_text,
                'top_contributing_features': [f[0] for f in top_features[:3]]
            }
            
        except Exception as e:
            logger.warning(f"Failed to generate explanation: {str(e)}")
            return {
                'anomaly_score': float(anomaly_score),
                'explanation_text': f"Anomaly detected with score {anomaly_score:.3f}",
                'detected_patterns': ['anomaly_detected']
            }
    
    def _calculate_feature_importance(self, features: np.ndarray) -> np.ndarray:
        """Calculate feature importance for anomaly detection."""
        # Simplified feature importance based on feature values
        # In practice, this could use SHAP or other explainability methods
        
        # Calculate deviation from mean for each feature
        feature_means = np.mean(self.scaler.transform(
            np.zeros((1, len(self.feature_names)))
        ))
        
        deviations = np.abs(features - feature_means)
        
        # Normalize to get importance scores
        if np.sum(deviations) > 0:
            importance = deviations / np.sum(deviations)
        else:
            importance = np.ones_like(deviations) / len(deviations)
        
        return importance
    
    def _generate_explanation_text(
        self,
        top_features: List[Tuple[str, float]],
        anomaly_score: float,
        patterns: List[str]
    ) -> str:
        """Generate human-readable explanation text."""
        if anomaly_score > 0.8:
            severity = "high"
        elif anomaly_score > 0.6:
            severity = "medium"
        else:
            severity = "low"
        
        explanation = f"Detected {severity} anomaly (score: {anomaly_score:.3f}). "
        
        if top_features:
            top_feature_names = [f[0] for f in top_features[:3]]
            explanation += f"Primary indicators: {', '.join(top_feature_names)}. "
        
        if patterns:
            explanation += f"Detected patterns: {', '.join(patterns[:3])}."
        
        return explanation
    
    def save_model(self, filepath: str) -> None:
        """Save the trained model to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'config': self.config,
            'model_version': self.model_version,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """Load a trained model from disk."""
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.config = model_data['config']
        self.model_version = model_data['model_version']
        self.is_trained = model_data['is_trained']
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            'model_type': 'isolation_forest',
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'feature_count': len(self.feature_names) if self.feature_names else 0,
            'feature_names': self.feature_names,
            'config': self.config,
            'parameters': {
                'n_estimators': self.n_estimators,
                'contamination': self.contamination,
                'max_samples': self.max_samples,
                'max_features': self.max_features
            } if self.model else None
        }
