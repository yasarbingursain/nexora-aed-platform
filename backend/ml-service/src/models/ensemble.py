"""Ensemble model combining multiple anomaly detection algorithms."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
import asyncio
import joblib

from .anomaly.isolation_forest import IsolationForestModel
from .anomaly.ocsvm import OneClassSVMModel
from .anomaly.autoencoder import AutoencoderModel
from .morphing.entity_morphing_detector import EntityMorphingDetector
from .morphing.behavioral_drift import BehavioralDriftDetector
from .calibration import AnomalyScoreCalibrator
from ..config import model_config
from ..config.version import MODEL_VERSION, get_version_metadata

logger = logging.getLogger(__name__)


class EnsembleModel:
    """Ensemble model combining multiple anomaly detection and morphing detection algorithms."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize ensemble model."""
        self.config = config or model_config['ensemble']
        self.anomaly_models = {}
        self.morphing_models = {}
        self.is_trained = False
        self.model_version = MODEL_VERSION
        
        # Ensemble configuration
        self.enabled = self.config.get('enabled', True)
        self.voting_strategy = self.config.get('voting_strategy', 'soft')  # 'soft' or 'hard'
        self.weights = self.config.get('weights', 'uniform')  # 'uniform' or custom weights
        self.model_list = self.config.get('models', ['isolation_forest', 'ocsvm', 'autoencoder'])
        
        # Initialize calibrator for stable scoring
        self.calibrator = AnomalyScoreCalibrator()
        
        # Initialize individual models
        self._initialize_models()
        
        # Performance tracking
        self.training_metrics = {}
        self.prediction_cache = {}
        
    def _initialize_models(self):
        """Initialize individual anomaly detection models."""
        try:
            # Initialize anomaly detection models
            if 'isolation_forest' in self.model_list:
                self.anomaly_models['isolation_forest'] = IsolationForestModel()
                
            if 'ocsvm' in self.model_list:
                self.anomaly_models['ocsvm'] = OneClassSVMModel()
                
            if 'autoencoder' in self.model_list:
                self.anomaly_models['autoencoder'] = AutoencoderModel()
            
            # Initialize morphing detection models
            self.morphing_models['entity_morphing'] = EntityMorphingDetector()
            self.morphing_models['behavioral_drift'] = BehavioralDriftDetector()
            
            logger.info(f"Initialized {len(self.anomaly_models)} anomaly models and {len(self.morphing_models)} morphing models")
            
        except Exception as e:
            logger.error(f"Failed to initialize models: {str(e)}")
            raise
    
    async def train(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        X_val: Optional[pd.DataFrame] = None,
        y_val: Optional[pd.Series] = None,
        hyperparameter_tuning: bool = False,
        cross_validation: bool = True
    ) -> Dict[str, Any]:
        """Train all models in the ensemble with calibration."""
        logger.info("Starting ensemble training...")
        
        try:
            start_time = datetime.now()
            training_results = {}
            
            # Train anomaly detection models
            for model_name, model in self.anomaly_models.items():
                logger.info(f"Training {model_name}...")
                try:
                    model_metrics = model.train(
                        X=X,
                        y=y,
                        hyperparameter_tuning=hyperparameter_tuning,
                        cross_validation=cross_validation
                    )
                    training_results[model_name] = model_metrics
                    logger.info(f"{model_name} training completed successfully")
                    
                except Exception as e:
                    logger.error(f"Failed to train {model_name}: {str(e)}")
                    training_results[model_name] = {"error": str(e)}
            
            # Train morphing detection models
            for model_name, model in self.morphing_models.items():
                logger.info(f"Training {model_name}...")
                try:
                    model_metrics = await model.train(X=X, y=y)
                    training_results[model_name] = model_metrics
                    logger.info(f"{model_name} training completed successfully")
                    
                except Exception as e:
                    logger.error(f"Failed to train {model_name}: {str(e)}")
                    training_results[model_name] = {"error": str(e)}
            
            # CRITICAL: Calibrate ensemble scores for stable thresholds
            if X_val is not None:
                logger.info("Calibrating ensemble scores...")
                try:
                    # Get raw scores from validation set
                    val_predictions = await self._get_raw_ensemble_scores(X_val)
                    raw_scores = np.array([p['raw_score'] for p in val_predictions])
                    
                    # Fit calibrator
                    self.calibrator.fit(raw_scores, y_val)
                    calibration_metadata = self.calibrator.get_metadata()
                    training_results['calibration'] = calibration_metadata
                    logger.info(f"Calibration completed: {calibration_metadata}")
                    
                except Exception as e:
                    logger.warning(f"Calibration failed: {str(e)}. Using uncalibrated scores.")
                    training_results['calibration'] = {"error": str(e)}
            
            training_time = (datetime.now() - start_time).total_seconds()
            self.is_trained = True
            
            # Calculate ensemble metrics
            successful_models = [name for name, result in training_results.items() 
                               if "error" not in result]
            
            ensemble_metrics = {
                "ensemble_version": self.model_version,
                "total_models": len(self.anomaly_models) + len(self.morphing_models),
                "successful_models": len(successful_models),
                "failed_models": len(training_results) - len(successful_models),
                "training_time_seconds": training_time,
                "voting_strategy": self.voting_strategy,
                "model_weights": self.weights,
                "individual_results": training_results,
                "version_metadata": get_version_metadata()
            }
            
            self.training_metrics = ensemble_metrics
            
            logger.info(f"Ensemble training completed in {training_time:.2f}s. "
                       f"Successful models: {len(successful_models)}/{len(training_results)}")
            
            return ensemble_metrics
            
        except Exception as e:
            logger.error(f"Ensemble training failed: {str(e)}")
            raise
    
    async def _get_raw_ensemble_scores(self, X: pd.DataFrame) -> List[Dict[str, Any]]:
        """Get raw ensemble scores for calibration."""
        model_predictions = {}
        
        for model_name, model in self.anomaly_models.items():
            if model.is_trained:
                try:
                    predictions = model.predict(X)
                    model_predictions[model_name] = predictions
                except Exception as e:
                    logger.warning(f"Prediction failed for {model_name}: {str(e)}")
        
        results = []
        for i in range(len(X)):
            scores = []
            for model_name, predictions in model_predictions.items():
                if i < len(predictions['scores']):
                    scores.append(predictions['scores'][i])
            
            if scores:
                raw_score = np.mean(scores) if self.weights == 'uniform' else np.average(
                    scores, weights=self._get_model_weights(list(model_predictions.keys()))
                )
            else:
                raw_score = 0.0
            
            results.append({'raw_score': raw_score})
        
        return results
    
    async def predict_anomalies(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict anomalies using ensemble of models."""
        if not self.is_trained:
            raise ValueError("Ensemble must be trained before making predictions")
        
        try:
            # Convert to DataFrame for batch processing
            X = pd.DataFrame(features_list)
            
            # Get predictions from all anomaly models
            model_predictions = {}
            
            for model_name, model in self.anomaly_models.items():
                if model.is_trained:
                    try:
                        predictions = model.predict(X)
                        model_predictions[model_name] = predictions
                    except Exception as e:
                        logger.warning(f"Prediction failed for {model_name}: {str(e)}")
            
            # Combine predictions using ensemble strategy
            ensemble_results = []
            
            for i in range(len(features_list)):
                result = await self._combine_anomaly_predictions(i, model_predictions)
                ensemble_results.append(result)
            
            return ensemble_results
            
        except Exception as e:
            logger.error(f"Ensemble anomaly prediction failed: {str(e)}")
            raise
    
    async def predict_morphing(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict entity morphing using ensemble of morphing models."""
        if not self.is_trained:
            raise ValueError("Ensemble must be trained before making predictions")
        
        try:
            # Get predictions from morphing models
            morphing_results = []
            
            for features in features_list:
                # Entity morphing detection
                entity_morphing_result = await self.morphing_models['entity_morphing'].predict(features)
                
                # Behavioral drift detection
                drift_result = await self.morphing_models['behavioral_drift'].predict(features)
                
                # Combine morphing predictions
                combined_result = self._combine_morphing_predictions(
                    entity_morphing_result,
                    drift_result
                )
                
                morphing_results.append(combined_result)
            
            return morphing_results
            
        except Exception as e:
            logger.error(f"Ensemble morphing prediction failed: {str(e)}")
            raise
    
    async def _combine_anomaly_predictions(
        self,
        index: int,
        model_predictions: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Combine anomaly predictions from multiple models."""
        try:
            scores = []
            confidences = []
            all_patterns = []
            explanations = {}
            
            # Extract predictions from each model
            for model_name, predictions in model_predictions.items():
                if index < len(predictions['scores']):
                    scores.append(predictions['scores'][index])
                    confidences.append(predictions['confidence'][index])
                    all_patterns.extend(predictions['patterns'][index])
                    
                    if predictions['explanations'][index]:
                        explanations[model_name] = predictions['explanations'][index]
            
            if not scores:
                # No valid predictions
                return {
                    'score': 0.0,
                    'confidence': 0.0,
                    'patterns': [],
                    'explanation': None
                }
            
            # Combine scores using voting strategy
            if self.voting_strategy == 'soft':
                # Weighted average of raw scores
                if self.weights == 'uniform':
                    raw_score = np.mean(scores)
                    ensemble_confidence = np.mean(confidences)
                else:
                    weights = self._get_model_weights(list(model_predictions.keys()))
                    raw_score = np.average(scores, weights=weights)
                    ensemble_confidence = np.average(confidences, weights=weights)
            else:
                # Hard voting - majority decision
                threshold = model_config['thresholds']['anomaly_score']
                anomaly_votes = sum(1 for score in scores if score > threshold)
                raw_score = anomaly_votes / len(scores)
                ensemble_confidence = max(confidences) if confidences else 0.0
            
            # CRITICAL: Apply calibration for stable, comparable scores
            if self.calibrator.is_fitted:
                ensemble_score = float(self.calibrator.transform(np.array([raw_score]))[0])
            else:
                ensemble_score = float(raw_score)
            
            # Combine patterns (remove duplicates)
            unique_patterns = list(set(all_patterns))
            
            # Create combined explanation
            combined_explanation = self._create_combined_explanation(
                explanations,
                ensemble_score,
                ensemble_confidence,
                unique_patterns
            )
            
            return {
                'score': float(ensemble_score),
                'confidence': float(ensemble_confidence),
                'patterns': unique_patterns[:10],  # Limit to top 10 patterns
                'explanation': combined_explanation,
                'individual_predictions': {
                    name: {
                        'score': predictions['scores'][index],
                        'confidence': predictions['confidence'][index]
                    }
                    for name, predictions in model_predictions.items()
                    if index < len(predictions['scores'])
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to combine anomaly predictions: {str(e)}")
            return {
                'score': 0.0,
                'confidence': 0.0,
                'patterns': ['ensemble_error'],
                'explanation': {'error': str(e)}
            }
    
    def _combine_morphing_predictions(
        self,
        entity_morphing_result: Dict[str, Any],
        drift_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combine morphing predictions from different models."""
        try:
            # Weighted combination of morphing scores
            morphing_score = (entity_morphing_result.get('score', 0.0) * 0.6 + 
                            drift_result.get('score', 0.0) * 0.4)
            
            # Combined confidence
            confidence = max(
                entity_morphing_result.get('confidence', 0.0),
                drift_result.get('confidence', 0.0)
            )
            
            # Determine morphing type
            morphing_type = None
            if entity_morphing_result.get('is_morphing', False):
                morphing_type = entity_morphing_result.get('type', 'entity_morphing')
            elif drift_result.get('is_drift', False):
                morphing_type = 'behavioral_drift'
            
            # Combined drift score
            drift_score = max(
                entity_morphing_result.get('drift', 0.0),
                drift_result.get('drift_score', 0.0)
            )
            
            return {
                'score': float(morphing_score),
                'is_morphing': morphing_score > model_config['thresholds']['morphing_score'],
                'type': morphing_type,
                'confidence': float(confidence),
                'drift': float(drift_score),
                'explanation': {
                    'entity_morphing': entity_morphing_result.get('explanation'),
                    'behavioral_drift': drift_result.get('explanation')
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to combine morphing predictions: {str(e)}")
            return {
                'score': 0.0,
                'is_morphing': False,
                'type': None,
                'confidence': 0.0,
                'drift': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _get_model_weights(self, model_names: List[str]) -> List[float]:
        """Get weights for model combination."""
        if self.weights == 'uniform':
            return [1.0 / len(model_names)] * len(model_names)
        elif isinstance(self.weights, dict):
            return [self.weights.get(name, 1.0) for name in model_names]
        else:
            return [1.0 / len(model_names)] * len(model_names)
    
    def _create_combined_explanation(
        self,
        explanations: Dict[str, Any],
        ensemble_score: float,
        ensemble_confidence: float,
        patterns: List[str]
    ) -> Dict[str, Any]:
        """Create combined explanation from individual model explanations."""
        try:
            # Determine severity
            if ensemble_score > 0.8:
                severity = "high"
            elif ensemble_score > 0.6:
                severity = "medium"
            else:
                severity = "low"
            
            # Create summary text
            summary = f"Ensemble detected {severity} anomaly (score: {ensemble_score:.3f}, "
            summary += f"confidence: {ensemble_confidence:.3f}). "
            
            if patterns:
                summary += f"Key patterns: {', '.join(patterns[:5])}. "
            
            # Count model agreements
            model_count = len(explanations)
            summary += f"Based on {model_count} model(s)."
            
            return {
                'ensemble_score': ensemble_score,
                'ensemble_confidence': ensemble_confidence,
                'severity': severity,
                'summary': summary,
                'patterns': patterns,
                'individual_explanations': explanations,
                'model_agreement': model_count
            }
            
        except Exception as e:
            logger.error(f"Failed to create combined explanation: {str(e)}")
            return {
                'ensemble_score': ensemble_score,
                'summary': f"Ensemble anomaly detected (score: {ensemble_score:.3f})",
                'error': str(e)
            }
    
    async def load_models(self, model_directory: str = "models/") -> None:
        """Load pre-trained models from disk."""
        try:
            # Load anomaly detection models
            for model_name, model in self.anomaly_models.items():
                model_path = f"{model_directory}{model_name}_model"
                try:
                    model.load_model(model_path)
                    logger.info(f"Loaded {model_name} model")
                except Exception as e:
                    logger.warning(f"Could not load {model_name}: {str(e)}")
            
            # Load morphing detection models
            for model_name, model in self.morphing_models.items():
                model_path = f"{model_directory}{model_name}_model"
                try:
                    await model.load_model(model_path)
                    logger.info(f"Loaded {model_name} model")
                except Exception as e:
                    logger.warning(f"Could not load {model_name}: {str(e)}")
            
            # Check if any models are trained
            trained_anomaly_models = sum(1 for model in self.anomaly_models.values() if model.is_trained)
            trained_morphing_models = sum(1 for model in self.morphing_models.values() if hasattr(model, 'is_trained') and model.is_trained)
            
            if trained_anomaly_models > 0 or trained_morphing_models > 0:
                self.is_trained = True
                logger.info(f"Ensemble ready with {trained_anomaly_models} anomaly models and {trained_morphing_models} morphing models")
            else:
                logger.warning("No trained models found")
                
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}")
            raise
    
    def save_ensemble(self, filepath: str) -> None:
        """Save the entire ensemble to disk."""
        try:
            # Save individual models
            for model_name, model in self.anomaly_models.items():
                if model.is_trained:
                    model_path = f"{filepath}_{model_name}"
                    model.save_model(model_path)
            
            for model_name, model in self.morphing_models.items():
                if hasattr(model, 'is_trained') and model.is_trained:
                    model_path = f"{filepath}_{model_name}"
                    model.save_model(model_path)
            
            # Save ensemble metadata
            ensemble_metadata = {
                'config': self.config,
                'model_version': self.model_version,
                'is_trained': self.is_trained,
                'training_metrics': self.training_metrics,
                'voting_strategy': self.voting_strategy,
                'weights': self.weights,
                'model_list': self.model_list
            }
            
            joblib.dump(ensemble_metadata, f"{filepath}_ensemble_metadata.pkl")
            logger.info(f"Ensemble saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to save ensemble: {str(e)}")
            raise
    
    def load_ensemble(self, filepath: str) -> None:
        """Load the entire ensemble from disk."""
        try:
            # Load ensemble metadata
            ensemble_metadata = joblib.load(f"{filepath}_ensemble_metadata.pkl")
            
            self.config = ensemble_metadata['config']
            self.model_version = ensemble_metadata['model_version']
            self.is_trained = ensemble_metadata['is_trained']
            self.training_metrics = ensemble_metadata['training_metrics']
            self.voting_strategy = ensemble_metadata['voting_strategy']
            self.weights = ensemble_metadata['weights']
            self.model_list = ensemble_metadata['model_list']
            
            # Load individual models
            for model_name, model in self.anomaly_models.items():
                model_path = f"{filepath}_{model_name}"
                try:
                    model.load_model(model_path)
                except Exception as e:
                    logger.warning(f"Could not load {model_name}: {str(e)}")
            
            logger.info(f"Ensemble loaded from {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to load ensemble: {str(e)}")
            raise
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about all models in the ensemble."""
        info = {
            'ensemble_version': self.model_version,
            'is_trained': self.is_trained,
            'voting_strategy': self.voting_strategy,
            'weights': self.weights,
            'anomaly_models': {},
            'morphing_models': {},
            'training_metrics': self.training_metrics
        }
        
        # Get info from anomaly models
        for model_name, model in self.anomaly_models.items():
            info['anomaly_models'][model_name] = model.get_model_info()
        
        # Get info from morphing models
        for model_name, model in self.morphing_models.items():
            if hasattr(model, 'get_model_info'):
                info['morphing_models'][model_name] = await model.get_model_info()
        
        return info
    
    def get_ensemble_health(self) -> Dict[str, Any]:
        """Get health status of the ensemble."""
        anomaly_model_health = {}
        morphing_model_health = {}
        
        for model_name, model in self.anomaly_models.items():
            anomaly_model_health[model_name] = {
                'is_trained': model.is_trained,
                'model_version': getattr(model, 'model_version', None),
                'status': 'healthy' if model.is_trained else 'not_trained'
            }
        
        for model_name, model in self.morphing_models.items():
            morphing_model_health[model_name] = {
                'is_trained': getattr(model, 'is_trained', False),
                'status': 'healthy' if getattr(model, 'is_trained', False) else 'not_trained'
            }
        
        total_models = len(self.anomaly_models) + len(self.morphing_models)
        healthy_models = sum(1 for health in {**anomaly_model_health, **morphing_model_health}.values() 
                           if health['status'] == 'healthy')
        
        return {
            'ensemble_status': 'healthy' if self.is_trained else 'not_trained',
            'total_models': total_models,
            'healthy_models': healthy_models,
            'health_percentage': (healthy_models / total_models * 100) if total_models > 0 else 0,
            'anomaly_models': anomaly_model_health,
            'morphing_models': morphing_model_health,
            'last_updated': datetime.utcnow().isoformat()
        }
