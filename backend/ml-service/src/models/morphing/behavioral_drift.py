"""Behavioral drift detection for identifying gradual changes in entity behavior."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from collections import deque
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import euclidean_distances
from scipy import stats
import joblib

from ...config import model_config

logger = logging.getLogger(__name__)


class BehavioralDriftDetector:
    """Detector for identifying gradual behavioral drift in entities over time."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize behavioral drift detector."""
        self.config = config or model_config['morphing_detection']['behavioral_drift']
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_version = None
        
        # Configuration parameters
        self.window_size = self.config.get('window_size', 100)
        self.drift_threshold = self.config.get('drift_threshold', 0.3)
        self.min_samples = self.config.get('min_samples', 50)
        
        # Drift detection state
        self.entity_windows = {}  # Sliding windows for each entity
        self.reference_distributions = {}  # Reference distributions for comparison
        self.drift_statistics = {}  # Statistical measures for drift detection
        
        # Drift detection methods
        self.drift_methods = ['statistical', 'distance_based', 'distribution_shift']
        
    async def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """Train the behavioral drift detector."""
        logger.info("Training behavioral drift detector...")
        
        try:
            start_time = datetime.now()
            
            # Initialize reference distributions
            self._initialize_reference_distributions(X)
            
            # Set up sliding windows for entities
            self._initialize_entity_windows(X)
            
            # Calculate baseline drift statistics
            self._calculate_baseline_statistics(X)
            
            training_time = (datetime.now() - start_time).total_seconds()
            self.is_trained = True
            self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            metrics = {
                "model_type": "behavioral_drift_detector",
                "training_samples": len(X),
                "unique_entities": len(self.entity_windows),
                "reference_distributions": len(self.reference_distributions),
                "window_size": self.window_size,
                "drift_threshold": self.drift_threshold,
                "min_samples": self.min_samples,
                "training_time_seconds": training_time,
                "model_version": self.model_version
            }
            
            logger.info(f"Behavioral drift detector training completed in {training_time:.2f}s. "
                       f"Entities: {len(self.entity_windows)}, "
                       f"Reference distributions: {len(self.reference_distributions)}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            raise
    
    async def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict behavioral drift for an entity."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        try:
            entity_id = features.get('entity_id', 'unknown')
            
            # Update entity window with new observation
            self._update_entity_window(entity_id, features)
            
            # Detect drift
            drift_result = self._detect_drift(entity_id, features)
            
            return drift_result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'score': 0.0,
                'is_drift': False,
                'confidence': 0.0,
                'drift_type': None,
                'drift_score': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _initialize_reference_distributions(self, X: pd.DataFrame):
        """Initialize reference distributions from training data."""
        try:
            # Group by entity if entity_id is available
            if 'entity_id' in X.columns:
                for entity_id, entity_data in X.groupby('entity_id'):
                    if len(entity_data) >= self.min_samples:
                        distribution = self._create_reference_distribution(entity_data)
                        self.reference_distributions[entity_id] = distribution
            else:
                # Create general reference distribution
                distribution = self._create_reference_distribution(X)
                self.reference_distributions['general'] = distribution
            
            logger.info(f"Initialized {len(self.reference_distributions)} reference distributions")
            
        except Exception as e:
            logger.error(f"Failed to initialize reference distributions: {str(e)}")
    
    def _create_reference_distribution(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Create reference distribution from entity data."""
        try:
            # Select numeric features
            numeric_data = data.select_dtypes(include=[np.number])
            
            if numeric_data.empty:
                return {}
            
            # Calculate statistical properties
            distribution = {
                'mean': numeric_data.mean().to_dict(),
                'std': numeric_data.std().to_dict(),
                'median': numeric_data.median().to_dict(),
                'q25': numeric_data.quantile(0.25).to_dict(),
                'q75': numeric_data.quantile(0.75).to_dict(),
                'min': numeric_data.min().to_dict(),
                'max': numeric_data.max().to_dict(),
                'sample_count': len(data),
                'feature_names': list(numeric_data.columns)
            }
            
            # Calculate correlation matrix
            if len(numeric_data.columns) > 1:
                distribution['correlation_matrix'] = numeric_data.corr().to_dict()
            
            # Store raw data for distribution comparison (limited size)
            sample_size = min(len(numeric_data), 1000)  # Limit memory usage
            distribution['sample_data'] = numeric_data.sample(n=sample_size).to_dict('records')
            
            return distribution
            
        except Exception as e:
            logger.error(f"Failed to create reference distribution: {str(e)}")
            return {}
    
    def _initialize_entity_windows(self, X: pd.DataFrame):
        """Initialize sliding windows for entities."""
        try:
            if 'entity_id' in X.columns:
                for entity_id in X['entity_id'].unique():
                    self.entity_windows[entity_id] = deque(maxlen=self.window_size)
            else:
                self.entity_windows['general'] = deque(maxlen=self.window_size)
            
            logger.info(f"Initialized {len(self.entity_windows)} entity windows")
            
        except Exception as e:
            logger.error(f"Failed to initialize entity windows: {str(e)}")
    
    def _calculate_baseline_statistics(self, X: pd.DataFrame):
        """Calculate baseline drift statistics."""
        try:
            for entity_id in self.entity_windows.keys():
                self.drift_statistics[entity_id] = {
                    'drift_history': [],
                    'false_positive_rate': 0.0,
                    'sensitivity': 1.0,
                    'last_drift_time': None,
                    'drift_frequency': 0.0
                }
            
            logger.info(f"Initialized drift statistics for {len(self.drift_statistics)} entities")
            
        except Exception as e:
            logger.error(f"Failed to calculate baseline statistics: {str(e)}")
    
    def _update_entity_window(self, entity_id: str, features: Dict[str, Any]):
        """Update sliding window for entity with new observation."""
        try:
            # Initialize window if not exists
            if entity_id not in self.entity_windows:
                self.entity_windows[entity_id] = deque(maxlen=self.window_size)
                self.drift_statistics[entity_id] = {
                    'drift_history': [],
                    'false_positive_rate': 0.0,
                    'sensitivity': 1.0,
                    'last_drift_time': None,
                    'drift_frequency': 0.0
                }
            
            # Add new observation to window
            observation = {
                'timestamp': features.get('timestamp', datetime.utcnow().isoformat()),
                'features': {k: v for k, v in features.items() if isinstance(v, (int, float))}
            }
            
            self.entity_windows[entity_id].append(observation)
            
        except Exception as e:
            logger.error(f"Failed to update entity window: {str(e)}")
    
    def _detect_drift(self, entity_id: str, current_features: Dict[str, Any]) -> Dict[str, Any]:
        """Detect behavioral drift for an entity."""
        try:
            # Get reference distribution (use general if entity-specific not available)
            reference = self.reference_distributions.get(entity_id, 
                                                       self.reference_distributions.get('general', {}))
            
            if not reference:
                return {
                    'score': 0.0,
                    'is_drift': False,
                    'confidence': 0.0,
                    'drift_type': None,
                    'drift_score': 0.0,
                    'explanation': {'message': 'No reference distribution available'}
                }
            
            # Get entity window
            window = self.entity_windows.get(entity_id, deque())
            
            if len(window) < self.min_samples:
                return {
                    'score': 0.0,
                    'is_drift': False,
                    'confidence': 0.0,
                    'drift_type': None,
                    'drift_score': 0.0,
                    'explanation': {'message': f'Insufficient samples: {len(window)}/{self.min_samples}'}
                }
            
            # Apply different drift detection methods
            drift_results = {}
            
            # Statistical drift detection
            drift_results['statistical'] = self._statistical_drift_detection(window, reference)
            
            # Distance-based drift detection
            drift_results['distance_based'] = self._distance_based_drift_detection(window, reference)
            
            # Distribution shift detection
            drift_results['distribution_shift'] = self._distribution_shift_detection(window, reference)
            
            # Combine results
            combined_result = self._combine_drift_results(drift_results, entity_id)
            
            # Update drift statistics
            self._update_drift_statistics(entity_id, combined_result)
            
            return combined_result
            
        except Exception as e:
            logger.error(f"Failed to detect drift: {str(e)}")
            return {
                'score': 0.0,
                'is_drift': False,
                'confidence': 0.0,
                'drift_type': None,
                'drift_score': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _statistical_drift_detection(self, window: deque, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Detect drift using statistical tests."""
        try:
            # Extract features from window
            window_data = []
            for obs in window:
                window_data.append(obs['features'])
            
            if not window_data:
                return {'score': 0.0, 'p_values': {}, 'significant_features': []}
            
            window_df = pd.DataFrame(window_data)
            reference_means = reference.get('mean', {})
            reference_stds = reference.get('std', {})
            
            drift_scores = []
            p_values = {}
            significant_features = []
            
            # Perform statistical tests for each feature
            for feature in window_df.columns:
                if feature in reference_means and feature in reference_stds:
                    ref_mean = reference_means[feature]
                    ref_std = reference_stds[feature]
                    
                    if ref_std > 0:
                        # One-sample t-test
                        window_values = window_df[feature].dropna()
                        if len(window_values) > 1:
                            t_stat, p_value = stats.ttest_1samp(window_values, ref_mean)
                            p_values[feature] = p_value
                            
                            # Calculate drift score based on effect size
                            effect_size = abs(window_values.mean() - ref_mean) / ref_std
                            drift_scores.append(effect_size)
                            
                            # Check significance
                            if p_value < 0.05:  # Significant at 5% level
                                significant_features.append(feature)
            
            overall_score = np.mean(drift_scores) if drift_scores else 0.0
            
            return {
                'score': float(min(overall_score, 1.0)),  # Cap at 1.0
                'p_values': p_values,
                'significant_features': significant_features
            }
            
        except Exception as e:
            logger.error(f"Statistical drift detection failed: {str(e)}")
            return {'score': 0.0, 'p_values': {}, 'significant_features': []}
    
    def _distance_based_drift_detection(self, window: deque, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Detect drift using distance-based methods."""
        try:
            # Extract features from window
            window_data = []
            for obs in window:
                window_data.append(obs['features'])
            
            if not window_data:
                return {'score': 0.0, 'distances': []}
            
            window_df = pd.DataFrame(window_data)
            reference_sample = reference.get('sample_data', [])
            
            if not reference_sample:
                return {'score': 0.0, 'distances': []}
            
            reference_df = pd.DataFrame(reference_sample)
            
            # Align features
            common_features = list(set(window_df.columns) & set(reference_df.columns))
            if not common_features:
                return {'score': 0.0, 'distances': []}
            
            window_aligned = window_df[common_features].fillna(0)
            reference_aligned = reference_df[common_features].fillna(0)
            
            # Calculate distances
            if len(window_aligned) > 0 and len(reference_aligned) > 0:
                # Scale features
                all_data = pd.concat([window_aligned, reference_aligned])
                scaler = StandardScaler()
                scaled_data = scaler.fit_transform(all_data)
                
                window_scaled = scaled_data[:len(window_aligned)]
                reference_scaled = scaled_data[len(window_aligned):]
                
                # Calculate mean distance from window to reference
                distances = euclidean_distances(window_scaled, reference_scaled)
                mean_distance = np.mean(distances)
                
                # Normalize distance to [0, 1] range
                # Use heuristic: distance > 2 standard deviations is considered high drift
                normalized_score = min(mean_distance / 2.0, 1.0)
                
                return {
                    'score': float(normalized_score),
                    'mean_distance': float(mean_distance),
                    'distances': distances.flatten().tolist()[:100]  # Limit size
                }
            
            return {'score': 0.0, 'distances': []}
            
        except Exception as e:
            logger.error(f"Distance-based drift detection failed: {str(e)}")
            return {'score': 0.0, 'distances': []}
    
    def _distribution_shift_detection(self, window: deque, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Detect drift using distribution shift methods."""
        try:
            # Extract features from window
            window_data = []
            for obs in window:
                window_data.append(obs['features'])
            
            if not window_data:
                return {'score': 0.0, 'ks_statistics': {}}
            
            window_df = pd.DataFrame(window_data)
            reference_sample = reference.get('sample_data', [])
            
            if not reference_sample:
                return {'score': 0.0, 'ks_statistics': {}}
            
            reference_df = pd.DataFrame(reference_sample)
            
            # Align features
            common_features = list(set(window_df.columns) & set(reference_df.columns))
            if not common_features:
                return {'score': 0.0, 'ks_statistics': {}}
            
            ks_statistics = {}
            drift_scores = []
            
            # Perform Kolmogorov-Smirnov test for each feature
            for feature in common_features:
                window_values = window_df[feature].dropna()
                reference_values = reference_df[feature].dropna()
                
                if len(window_values) > 10 and len(reference_values) > 10:
                    ks_stat, p_value = stats.ks_2samp(window_values, reference_values)
                    ks_statistics[feature] = {
                        'statistic': float(ks_stat),
                        'p_value': float(p_value)
                    }
                    
                    # Use KS statistic as drift score
                    drift_scores.append(ks_stat)
            
            overall_score = np.mean(drift_scores) if drift_scores else 0.0
            
            return {
                'score': float(overall_score),
                'ks_statistics': ks_statistics
            }
            
        except Exception as e:
            logger.error(f"Distribution shift detection failed: {str(e)}")
            return {'score': 0.0, 'ks_statistics': {}}
    
    def _combine_drift_results(self, drift_results: Dict[str, Dict[str, Any]], entity_id: str) -> Dict[str, Any]:
        """Combine results from different drift detection methods."""
        try:
            # Extract scores from each method
            scores = []
            for method, result in drift_results.items():
                if 'score' in result:
                    scores.append(result['score'])
            
            if not scores:
                combined_score = 0.0
            else:
                # Weighted average (can be configured)
                weights = [0.4, 0.3, 0.3]  # statistical, distance, distribution
                if len(scores) == len(weights):
                    combined_score = np.average(scores, weights=weights)
                else:
                    combined_score = np.mean(scores)
            
            # Determine if drift is detected
            is_drift = combined_score > self.drift_threshold
            
            # Calculate confidence
            confidence = self._calculate_drift_confidence(combined_score, scores)
            
            # Determine drift type
            drift_type = self._determine_drift_type(drift_results)
            
            # Generate explanation
            explanation = self._generate_drift_explanation(drift_results, combined_score, is_drift)
            
            return {
                'score': float(combined_score),
                'is_drift': is_drift,
                'confidence': float(confidence),
                'drift_type': drift_type,
                'drift_score': float(combined_score),
                'explanation': explanation,
                'individual_results': drift_results
            }
            
        except Exception as e:
            logger.error(f"Failed to combine drift results: {str(e)}")
            return {
                'score': 0.0,
                'is_drift': False,
                'confidence': 0.0,
                'drift_type': None,
                'drift_score': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _calculate_drift_confidence(self, combined_score: float, individual_scores: List[float]) -> float:
        """Calculate confidence in drift detection."""
        try:
            # Higher score and lower variance = higher confidence
            if combined_score > 0.8:
                base_confidence = 0.9
            elif combined_score > 0.6:
                base_confidence = 0.7
            elif combined_score > 0.4:
                base_confidence = 0.5
            else:
                base_confidence = 0.3
            
            # Adjust based on agreement between methods
            if len(individual_scores) > 1:
                score_variance = np.var(individual_scores)
                # Lower variance = higher confidence
                variance_adjustment = max(0, 0.2 - score_variance)
                base_confidence += variance_adjustment
            
            return min(base_confidence, 0.95)
            
        except Exception as e:
            logger.error(f"Failed to calculate drift confidence: {str(e)}")
            return 0.0
    
    def _determine_drift_type(self, drift_results: Dict[str, Dict[str, Any]]) -> Optional[str]:
        """Determine the type of drift detected."""
        try:
            # Find method with highest score
            max_score = 0.0
            dominant_method = None
            
            for method, result in drift_results.items():
                score = result.get('score', 0.0)
                if score > max_score:
                    max_score = score
                    dominant_method = method
            
            # Map method to drift type
            drift_type_mapping = {
                'statistical': 'statistical_drift',
                'distance_based': 'distribution_drift',
                'distribution_shift': 'distributional_drift'
            }
            
            return drift_type_mapping.get(dominant_method)
            
        except Exception as e:
            logger.error(f"Failed to determine drift type: {str(e)}")
            return None
    
    def _generate_drift_explanation(
        self,
        drift_results: Dict[str, Dict[str, Any]],
        combined_score: float,
        is_drift: bool
    ) -> Dict[str, Any]:
        """Generate explanation for drift detection."""
        try:
            explanation = {
                'combined_score': combined_score,
                'threshold': self.drift_threshold,
                'is_drift': is_drift,
                'methods_used': list(drift_results.keys())
            }
            
            # Add method-specific details
            for method, result in drift_results.items():
                explanation[f'{method}_score'] = result.get('score', 0.0)
                
                if method == 'statistical':
                    significant_features = result.get('significant_features', [])
                    if significant_features:
                        explanation['significant_statistical_features'] = significant_features[:5]
                
                elif method == 'distance_based':
                    mean_distance = result.get('mean_distance', 0.0)
                    explanation['mean_distance_to_reference'] = mean_distance
                
                elif method == 'distribution_shift':
                    ks_stats = result.get('ks_statistics', {})
                    if ks_stats:
                        # Find features with highest KS statistics
                        sorted_features = sorted(
                            ks_stats.items(),
                            key=lambda x: x[1]['statistic'],
                            reverse=True
                        )
                        explanation['top_shifted_features'] = [f[0] for f in sorted_features[:3]]
            
            # Generate summary text
            if is_drift:
                explanation['summary'] = f"Behavioral drift detected (score: {combined_score:.3f}). "
                explanation['summary'] += f"Threshold exceeded: {combined_score:.3f} > {self.drift_threshold}"
            else:
                explanation['summary'] = f"No significant drift detected (score: {combined_score:.3f}). "
                explanation['summary'] += f"Below threshold: {combined_score:.3f} <= {self.drift_threshold}"
            
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate drift explanation: {str(e)}")
            return {'error': str(e)}
    
    def _update_drift_statistics(self, entity_id: str, drift_result: Dict[str, Any]):
        """Update drift statistics for entity."""
        try:
            if entity_id not in self.drift_statistics:
                self.drift_statistics[entity_id] = {
                    'drift_history': [],
                    'false_positive_rate': 0.0,
                    'sensitivity': 1.0,
                    'last_drift_time': None,
                    'drift_frequency': 0.0
                }
            
            stats = self.drift_statistics[entity_id]
            
            # Add to drift history
            drift_event = {
                'timestamp': datetime.utcnow().isoformat(),
                'score': drift_result['score'],
                'is_drift': drift_result['is_drift'],
                'drift_type': drift_result['drift_type']
            }
            
            stats['drift_history'].append(drift_event)
            
            # Limit history size
            if len(stats['drift_history']) > 1000:
                stats['drift_history'] = stats['drift_history'][-1000:]
            
            # Update last drift time
            if drift_result['is_drift']:
                stats['last_drift_time'] = drift_event['timestamp']
            
            # Calculate drift frequency (drifts per day)
            if len(stats['drift_history']) > 1:
                first_event = datetime.fromisoformat(stats['drift_history'][0]['timestamp'])
                last_event = datetime.fromisoformat(stats['drift_history'][-1]['timestamp'])
                time_span = (last_event - first_event).total_seconds() / 86400  # days
                
                if time_span > 0:
                    drift_count = sum(1 for event in stats['drift_history'] if event['is_drift'])
                    stats['drift_frequency'] = drift_count / time_span
            
        except Exception as e:
            logger.error(f"Failed to update drift statistics: {str(e)}")
    
    def save_model(self, filepath: str) -> None:
        """Save the drift detector to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'config': self.config,
            'reference_distributions': self.reference_distributions,
            'drift_statistics': self.drift_statistics,
            'scaler': self.scaler,
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'window_size': self.window_size,
            'drift_threshold': self.drift_threshold,
            'min_samples': self.min_samples
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Behavioral drift detector saved to {filepath}")
    
    async def load_model(self, filepath: str) -> None:
        """Load the drift detector from disk."""
        model_data = joblib.load(filepath)
        
        self.config = model_data['config']
        self.reference_distributions = model_data['reference_distributions']
        self.drift_statistics = model_data['drift_statistics']
        self.scaler = model_data['scaler']
        self.is_trained = model_data['is_trained']
        self.model_version = model_data['model_version']
        self.window_size = model_data['window_size']
        self.drift_threshold = model_data['drift_threshold']
        self.min_samples = model_data['min_samples']
        
        # Reinitialize entity windows (they are not saved due to memory constraints)
        self.entity_windows = {}
        for entity_id in self.reference_distributions.keys():
            self.entity_windows[entity_id] = deque(maxlen=self.window_size)
        
        logger.info(f"Behavioral drift detector loaded from {filepath}")
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the drift detector."""
        return {
            'model_type': 'behavioral_drift_detector',
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'reference_distributions_count': len(self.reference_distributions),
            'entity_windows_count': len(self.entity_windows),
            'config': self.config,
            'parameters': {
                'window_size': self.window_size,
                'drift_threshold': self.drift_threshold,
                'min_samples': self.min_samples,
                'drift_methods': self.drift_methods
            }
        }
