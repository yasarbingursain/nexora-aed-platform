"""One-Class SVM model for anomaly detection."""

import numpy as np
import pandas as pd
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import classification_report
from typing import Dict, Any, List, Tuple, Optional
import joblib
import logging
from datetime import datetime
import mlflow
import mlflow.sklearn

from ...config import model_config
from ...utils.explainability import ExplainabilityEngine

logger = logging.getLogger(__name__)


class OneClassSVMModel:
    """One-Class SVM model for detecting anomalous entity behavior."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize One-Class SVM model."""
        self.config = config or model_config['anomaly_detection']['ocsvm']
        self.model = None
        self.scaler = RobustScaler()  # More robust to outliers than StandardScaler
        self.feature_names = None
        self.is_trained = False
        self.model_version = None
        self.explainer = ExplainabilityEngine()
        
        # Model parameters from config
        self.kernel = self.config.get('kernel', 'rbf')
        self.gamma = self.config.get('gamma', 'scale')
        self.nu = self.config.get('nu', 0.1)
        self.shrinking = self.config.get('shrinking', True)
        self.random_state = model_config['global']['random_state']
        
        # Performance tracking
        self.training_time = None
        self.support_vectors_count = None
        
    def train(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        hyperparameter_tuning: bool = False,
        cross_validation: bool = True
    ) -> Dict[str, Any]:
        """Train the One-Class SVM model."""
        logger.info("Starting One-Class SVM training...")
        
        try:
            start_time = datetime.now()
            
            # Store feature names
            self.feature_names = list(X.columns)
            
            # Preprocess data
            X_scaled = self._preprocess_data(X, fit_scaler=True)
            
            if hyperparameter_tuning:
                logger.info("Performing hyperparameter tuning...")
                self.model = self._hyperparameter_tuning(X_scaled)
            else:
                # Initialize model with config parameters
                self.model = OneClassSVM(
                    kernel=self.kernel,
                    gamma=self.gamma,
                    nu=self.nu,
                    shrinking=self.shrinking
                )
                
                # Fit the model
                logger.info("Fitting One-Class SVM model...")
                self.model.fit(X_scaled)
            
            self.training_time = (datetime.now() - start_time).total_seconds()
            self.support_vectors_count = len(self.model.support_vectors_)
            self.is_trained = True
            self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Calculate training metrics
            train_scores = self.model.decision_function(X_scaled)
            train_predictions = self.model.predict(X_scaled)
            
            # Convert predictions (-1, 1) to (1, 0) for anomalies
            train_anomalies = (train_predictions == -1).astype(int)
            
            metrics = {
                "model_type": "one_class_svm",
                "kernel": self.model.kernel,
                "gamma": self.model.gamma,
                "nu": self.model.nu,
                "training_samples": len(X),
                "feature_count": len(self.feature_names),
                "support_vectors": self.support_vectors_count,
                "support_vector_ratio": self.support_vectors_count / len(X),
                "anomaly_rate": np.mean(train_anomalies),
                "mean_decision_score": np.mean(train_scores),
                "std_decision_score": np.std(train_scores),
                "training_time_seconds": self.training_time,
                "model_version": self.model_version
            }
            
            # Log to MLflow
            with mlflow.start_run(run_name=f"ocsvm_{self.model_version}"):
                mlflow.log_params({
                    "kernel": self.kernel,
                    "gamma": self.gamma,
                    "nu": self.nu,
                    "shrinking": self.shrinking
                })
                mlflow.log_metrics(metrics)
                mlflow.sklearn.log_model(self.model, "ocsvm_model")
            
            logger.info(f"One-Class SVM training completed in {self.training_time:.2f}s. "
                       f"Support vectors: {self.support_vectors_count}, "
                       f"Anomaly rate: {metrics['anomaly_rate']:.3f}")
            
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
            
            # Get predictions and decision scores
            predictions = self.model.predict(X_scaled)
            decision_scores = self.model.decision_function(X_scaled)
            
            # Convert to anomaly probabilities (0-1 scale)
            anomaly_scores = self._convert_scores_to_probabilities(decision_scores)
            
            # Convert predictions (-1, 1) to boolean anomalies
            is_anomaly = (predictions == -1)
            
            # Generate explanations for anomalies
            explanations = []
            patterns = []
            
            for i, (score, is_anom) in enumerate(zip(anomaly_scores, is_anomaly)):
                if is_anom:
                    explanation = self._generate_explanation(
                        X.iloc[i], 
                        X_scaled[i], 
                        score,
                        decision_scores[i]
                    )
                    explanations.append(explanation)
                    patterns.append(explanation.get('detected_patterns', []))
                else:
                    explanations.append(None)
                    patterns.append([])
            
            results = {
                'scores': anomaly_scores.tolist(),
                'predictions': is_anomaly.tolist(),
                'decision_scores': decision_scores.tolist(),
                'explanations': explanations,
                'patterns': patterns,
                'confidence': self._calculate_confidence(decision_scores, anomaly_scores),
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
            'decision_score': result['decision_scores'][0],
            'explanation': result['explanations'][0],
            'patterns': result['patterns'][0]
        }
    
    def _preprocess_data(self, X: pd.DataFrame, fit_scaler: bool = False) -> np.ndarray:
        """Preprocess input data."""
        # Handle missing values
        X_clean = X.fillna(X.median())  # Use median for robustness
        
        # Handle infinite values
        X_clean = X_clean.replace([np.inf, -np.inf], np.nan)
        X_clean = X_clean.fillna(X_clean.median())
        
        # Scale features using RobustScaler (more robust to outliers)
        if fit_scaler:
            X_scaled = self.scaler.fit_transform(X_clean)
        else:
            X_scaled = self.scaler.transform(X_clean)
        
        return X_scaled
    
    def _hyperparameter_tuning(self, X: np.ndarray) -> OneClassSVM:
        """Perform hyperparameter tuning using GridSearchCV."""
        param_grid = {
            'kernel': ['rbf', 'poly', 'sigmoid'],
            'gamma': ['scale', 'auto', 0.001, 0.01, 0.1, 1],
            'nu': [0.01, 0.05, 0.1, 0.2, 0.3]
        }
        
        # Create base model
        base_model = OneClassSVM()
        
        # Custom scoring function for unsupervised learning
        def ocsvm_scorer(estimator, X):
            # Return mean decision score (higher is better for normal samples)
            scores = estimator.decision_function(X)
            return np.mean(scores)
        
        # Perform grid search
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            scoring=ocsvm_scorer,
            cv=3,  # Use 3-fold CV for unsupervised learning
            verbose=1,
            n_jobs=-1
        )
        
        grid_search.fit(X)
        
        logger.info(f"Best parameters: {grid_search.best_params_}")
        logger.info(f"Best score: {grid_search.best_score_}")
        
        return grid_search.best_estimator_
    
    def _convert_scores_to_probabilities(self, decision_scores: np.ndarray) -> np.ndarray:
        """Convert SVM decision scores to anomaly probabilities."""
        # SVM decision scores: positive = normal, negative = anomaly
        # We need to convert to 0-1 probabilities where 1 = high anomaly probability
        
        # Use sigmoid transformation to convert to probabilities
        # Invert scores so negative (anomaly) becomes high probability
        inverted_scores = -decision_scores
        
        # Apply sigmoid transformation
        probabilities = 1 / (1 + np.exp(-inverted_scores))
        
        # Ensure probabilities are in [0, 1] range
        probabilities = np.clip(probabilities, 0, 1)
        
        return probabilities
    
    def _calculate_confidence(
        self, 
        decision_scores: np.ndarray, 
        anomaly_scores: np.ndarray
    ) -> List[float]:
        """Calculate confidence scores for predictions."""
        confidence_scores = []
        
        for decision_score, anomaly_score in zip(decision_scores, anomaly_scores):
            # Confidence based on distance from decision boundary
            # Higher absolute decision scores = higher confidence
            abs_decision_score = abs(decision_score)
            
            # Map to confidence (0-1)
            if abs_decision_score > 2.0:  # Very confident
                confidence = 0.95
            elif abs_decision_score > 1.0:  # Confident
                confidence = 0.7 + (abs_decision_score - 1.0) * 0.25
            elif abs_decision_score > 0.5:  # Moderately confident
                confidence = 0.5 + (abs_decision_score - 0.5) * 0.4
            else:  # Low confidence
                confidence = 0.3 + abs_decision_score * 0.4
            
            confidence_scores.append(min(confidence, 0.95))
        
        return confidence_scores
    
    def _generate_explanation(
        self,
        original_features: pd.Series,
        scaled_features: np.ndarray,
        anomaly_score: float,
        decision_score: float
    ) -> Dict[str, Any]:
        """Generate explanation for anomaly detection."""
        try:
            # Calculate feature importance using support vectors
            feature_importance = self._calculate_feature_importance(scaled_features)
            
            # Identify top contributing features
            top_features = sorted(
                zip(self.feature_names, feature_importance),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            # Detect patterns based on feature analysis
            detected_patterns = self._detect_patterns(original_features, top_features)
            
            # Generate human-readable explanation
            explanation_text = self._generate_explanation_text(
                top_features,
                anomaly_score,
                decision_score,
                detected_patterns
            )
            
            return {
                'anomaly_score': float(anomaly_score),
                'decision_score': float(decision_score),
                'feature_importance': dict(top_features),
                'detected_patterns': detected_patterns,
                'explanation_text': explanation_text,
                'top_contributing_features': [f[0] for f in top_features[:3]],
                'support_vector_distance': abs(decision_score)
            }
            
        except Exception as e:
            logger.warning(f"Failed to generate explanation: {str(e)}")
            return {
                'anomaly_score': float(anomaly_score),
                'decision_score': float(decision_score),
                'explanation_text': f"Anomaly detected with score {anomaly_score:.3f}",
                'detected_patterns': ['anomaly_detected']
            }
    
    def _calculate_feature_importance(self, features: np.ndarray) -> np.ndarray:
        """Calculate feature importance based on support vectors."""
        try:
            # Get support vectors
            support_vectors = self.model.support_vectors_
            
            if len(support_vectors) == 0:
                return np.ones(len(features)) / len(features)
            
            # Calculate distance to support vectors for each feature
            distances = []
            for i in range(len(features)):
                feature_distances = []
                for sv in support_vectors:
                    # Calculate distance for this feature dimension
                    dist = abs(features[i] - sv[i])
                    feature_distances.append(dist)
                
                # Use mean distance as importance indicator
                distances.append(np.mean(feature_distances))
            
            distances = np.array(distances)
            
            # Normalize to get importance scores
            if np.sum(distances) > 0:
                importance = distances / np.sum(distances)
            else:
                importance = np.ones_like(distances) / len(distances)
            
            return importance
            
        except Exception as e:
            logger.warning(f"Failed to calculate feature importance: {str(e)}")
            # Fallback to uniform importance
            return np.ones(len(features)) / len(features)
    
    def _detect_patterns(
        self, 
        original_features: pd.Series, 
        top_features: List[Tuple[str, float]]
    ) -> List[str]:
        """Detect anomaly patterns based on feature analysis."""
        patterns = []
        
        for feature_name, importance in top_features:
            if importance > 0.15:  # Significant contribution threshold
                value = original_features[feature_name]
                
                # Pattern detection based on feature names and values
                if 'frequency' in feature_name.lower() and value > 100:
                    patterns.append('high_frequency_activity')
                elif 'time' in feature_name.lower() and value < 0.1:
                    patterns.append('unusual_timing')
                elif 'access' in feature_name.lower() and value > 10:
                    patterns.append('excessive_access_attempts')
                elif 'error' in feature_name.lower() and value > 5:
                    patterns.append('high_error_rate')
                elif 'network' in feature_name.lower():
                    patterns.append('unusual_network_behavior')
                elif 'resource' in feature_name.lower() and value > 1000:
                    patterns.append('resource_abuse')
                else:
                    patterns.append(f'unusual_{feature_name}')
        
        # Add general patterns based on decision score
        if len(patterns) == 0:
            patterns.append('general_anomaly')
        
        return patterns[:5]  # Limit to top 5 patterns
    
    def _generate_explanation_text(
        self,
        top_features: List[Tuple[str, float]],
        anomaly_score: float,
        decision_score: float,
        patterns: List[str]
    ) -> str:
        """Generate human-readable explanation text."""
        if anomaly_score > 0.8:
            severity = "high"
        elif anomaly_score > 0.6:
            severity = "medium"
        else:
            severity = "low"
        
        explanation = f"Detected {severity} anomaly (score: {anomaly_score:.3f}, "
        explanation += f"decision score: {decision_score:.3f}). "
        
        if top_features:
            top_feature_names = [f[0] for f in top_features[:3]]
            explanation += f"Key indicators: {', '.join(top_feature_names)}. "
        
        if patterns:
            explanation += f"Detected behaviors: {', '.join(patterns[:3])}."
        
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
            'is_trained': self.is_trained,
            'training_time': self.training_time,
            'support_vectors_count': self.support_vectors_count
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
        self.training_time = model_data.get('training_time')
        self.support_vectors_count = model_data.get('support_vectors_count')
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            'model_type': 'one_class_svm',
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'feature_count': len(self.feature_names) if self.feature_names else 0,
            'feature_names': self.feature_names,
            'config': self.config,
            'training_time_seconds': self.training_time,
            'support_vectors_count': self.support_vectors_count,
            'parameters': {
                'kernel': self.kernel,
                'gamma': self.gamma,
                'nu': self.nu,
                'shrinking': self.shrinking
            } if self.model else None
        }
