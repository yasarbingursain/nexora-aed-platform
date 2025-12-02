"""Entity morphing detection for identifying when entities change their behavior patterns."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import joblib

from ...config import model_config

logger = logging.getLogger(__name__)


class EntityMorphingDetector:
    """Detector for identifying when entities morph or change their behavioral patterns."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize entity morphing detector."""
        self.config = config or model_config['morphing_detection']['entity_morphing']
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_version = None
        
        # Configuration parameters
        self.similarity_threshold = self.config.get('similarity_threshold', 0.8)
        self.temporal_window = self.config.get('temporal_window', '24h')
        self.feature_weights = self.config.get('feature_weights', {
            'behavioral': 0.4,
            'temporal': 0.3,
            'network': 0.3
        })
        
        # Entity profiles and baselines
        self.entity_profiles = {}
        self.behavioral_baselines = {}
        self.morphing_patterns = {}
        
        # Clustering for morphing pattern detection
        self.clustering_model = DBSCAN(eps=0.3, min_samples=5)
        
    async def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """Train the entity morphing detector."""
        logger.info("Training entity morphing detector...")
        
        try:
            start_time = datetime.now()
            
            # Build entity profiles from training data
            self._build_entity_profiles(X)
            
            # Establish behavioral baselines
            self._establish_baselines(X)
            
            # Detect morphing patterns in training data
            self._detect_morphing_patterns(X)
            
            training_time = (datetime.now() - start_time).total_seconds()
            self.is_trained = True
            self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            metrics = {
                "model_type": "entity_morphing_detector",
                "training_samples": len(X),
                "unique_entities": len(self.entity_profiles),
                "behavioral_baselines": len(self.behavioral_baselines),
                "morphing_patterns": len(self.morphing_patterns),
                "similarity_threshold": self.similarity_threshold,
                "temporal_window": self.temporal_window,
                "training_time_seconds": training_time,
                "model_version": self.model_version
            }
            
            logger.info(f"Entity morphing detector training completed in {training_time:.2f}s. "
                       f"Profiles: {len(self.entity_profiles)}, "
                       f"Baselines: {len(self.behavioral_baselines)}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            raise
    
    async def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict if an entity is morphing based on its current behavior."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        try:
            entity_id = features.get('entity_id', 'unknown')
            
            # Extract behavioral features
            behavioral_features = self._extract_behavioral_features(features)
            
            # Check for morphing
            morphing_result = self._detect_morphing(entity_id, behavioral_features, features)
            
            return morphing_result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'score': 0.0,
                'is_morphing': False,
                'confidence': 0.0,
                'type': None,
                'drift': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _build_entity_profiles(self, X: pd.DataFrame):
        """Build behavioral profiles for entities."""
        try:
            # Group by entity_id if available
            if 'entity_id' in X.columns:
                for entity_id, entity_data in X.groupby('entity_id'):
                    profile = self._create_entity_profile(entity_data)
                    self.entity_profiles[entity_id] = profile
            else:
                # Create a general profile if no entity_id
                profile = self._create_entity_profile(X)
                self.entity_profiles['general'] = profile
                
            logger.info(f"Built {len(self.entity_profiles)} entity profiles")
            
        except Exception as e:
            logger.error(f"Failed to build entity profiles: {str(e)}")
    
    def _create_entity_profile(self, entity_data: pd.DataFrame) -> Dict[str, Any]:
        """Create a behavioral profile for a single entity."""
        try:
            profile = {
                'sample_count': len(entity_data),
                'feature_means': {},
                'feature_stds': {},
                'activity_patterns': {},
                'temporal_patterns': {},
                'network_patterns': {}
            }
            
            # Calculate feature statistics
            numeric_columns = entity_data.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                profile['feature_means'][col] = float(entity_data[col].mean())
                profile['feature_stds'][col] = float(entity_data[col].std())
            
            # Extract activity patterns
            profile['activity_patterns'] = self._extract_activity_patterns(entity_data)
            
            # Extract temporal patterns
            profile['temporal_patterns'] = self._extract_temporal_patterns(entity_data)
            
            # Extract network patterns
            profile['network_patterns'] = self._extract_network_patterns(entity_data)
            
            return profile
            
        except Exception as e:
            logger.error(f"Failed to create entity profile: {str(e)}")
            return {}
    
    def _extract_activity_patterns(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Extract activity patterns from entity data."""
        patterns = {}
        
        try:
            # Activity frequency patterns
            if 'activity_count' in data.columns:
                patterns['avg_activity_count'] = float(data['activity_count'].mean())
                patterns['activity_variance'] = float(data['activity_count'].var())
            
            # Access patterns
            if 'access_frequency' in data.columns:
                patterns['avg_access_frequency'] = float(data['access_frequency'].mean())
            
            # Resource usage patterns
            if 'resource_usage' in data.columns:
                patterns['avg_resource_usage'] = float(data['resource_usage'].mean())
            
            # Error rate patterns
            if 'error_rate' in data.columns:
                patterns['avg_error_rate'] = float(data['error_rate'].mean())
                
        except Exception as e:
            logger.warning(f"Failed to extract activity patterns: {str(e)}")
        
        return patterns
    
    def _extract_temporal_patterns(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Extract temporal patterns from entity data."""
        patterns = {}
        
        try:
            # Time-based patterns
            if 'timestamp' in data.columns:
                timestamps = pd.to_datetime(data['timestamp'])
                
                # Hour of day patterns
                hours = timestamps.dt.hour
                patterns['active_hours'] = hours.value_counts().to_dict()
                patterns['peak_hour'] = int(hours.mode().iloc[0]) if not hours.empty else 0
                
                # Day of week patterns
                days = timestamps.dt.dayofweek
                patterns['active_days'] = days.value_counts().to_dict()
                patterns['peak_day'] = int(days.mode().iloc[0]) if not days.empty else 0
            
            # Session duration patterns
            if 'session_duration' in data.columns:
                patterns['avg_session_duration'] = float(data['session_duration'].mean())
                patterns['session_duration_variance'] = float(data['session_duration'].var())
                
        except Exception as e:
            logger.warning(f"Failed to extract temporal patterns: {str(e)}")
        
        return patterns
    
    def _extract_network_patterns(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Extract network patterns from entity data."""
        patterns = {}
        
        try:
            # IP address patterns
            if 'source_ip' in data.columns:
                ip_counts = data['source_ip'].value_counts()
                patterns['unique_ips'] = len(ip_counts)
                patterns['primary_ip'] = ip_counts.index[0] if not ip_counts.empty else None
                patterns['ip_diversity'] = float(1.0 - (ip_counts.iloc[0] / len(data))) if not ip_counts.empty else 0.0
            
            # Geographic patterns
            if 'geo_location' in data.columns:
                geo_counts = data['geo_location'].value_counts()
                patterns['unique_locations'] = len(geo_counts)
                patterns['primary_location'] = geo_counts.index[0] if not geo_counts.empty else None
            
            # User agent patterns
            if 'user_agent' in data.columns:
                ua_counts = data['user_agent'].value_counts()
                patterns['unique_user_agents'] = len(ua_counts)
                patterns['primary_user_agent'] = ua_counts.index[0] if not ua_counts.empty else None
                
        except Exception as e:
            logger.warning(f"Failed to extract network patterns: {str(e)}")
        
        return patterns
    
    def _establish_baselines(self, X: pd.DataFrame):
        """Establish behavioral baselines for morphing detection."""
        try:
            for entity_id, profile in self.entity_profiles.items():
                baseline = {
                    'behavioral_vector': self._create_behavioral_vector(profile),
                    'activity_baseline': profile.get('activity_patterns', {}),
                    'temporal_baseline': profile.get('temporal_patterns', {}),
                    'network_baseline': profile.get('network_patterns', {}),
                    'established_at': datetime.utcnow().isoformat()
                }
                
                self.behavioral_baselines[entity_id] = baseline
                
            logger.info(f"Established {len(self.behavioral_baselines)} behavioral baselines")
            
        except Exception as e:
            logger.error(f"Failed to establish baselines: {str(e)}")
    
    def _create_behavioral_vector(self, profile: Dict[str, Any]) -> np.ndarray:
        """Create a numerical vector representing entity behavior."""
        try:
            vector_components = []
            
            # Add feature means (normalized)
            feature_means = profile.get('feature_means', {})
            for key in sorted(feature_means.keys()):
                vector_components.append(feature_means[key])
            
            # Add activity pattern components
            activity_patterns = profile.get('activity_patterns', {})
            vector_components.extend([
                activity_patterns.get('avg_activity_count', 0.0),
                activity_patterns.get('avg_access_frequency', 0.0),
                activity_patterns.get('avg_resource_usage', 0.0),
                activity_patterns.get('avg_error_rate', 0.0)
            ])
            
            # Add temporal pattern components
            temporal_patterns = profile.get('temporal_patterns', {})
            vector_components.extend([
                temporal_patterns.get('peak_hour', 0.0) / 24.0,  # Normalize to [0,1]
                temporal_patterns.get('peak_day', 0.0) / 7.0,    # Normalize to [0,1]
                temporal_patterns.get('avg_session_duration', 0.0)
            ])
            
            # Add network pattern components
            network_patterns = profile.get('network_patterns', {})
            vector_components.extend([
                network_patterns.get('unique_ips', 0.0),
                network_patterns.get('ip_diversity', 0.0),
                network_patterns.get('unique_locations', 0.0),
                network_patterns.get('unique_user_agents', 0.0)
            ])
            
            return np.array(vector_components, dtype=float)
            
        except Exception as e:
            logger.error(f"Failed to create behavioral vector: {str(e)}")
            return np.array([0.0])
    
    def _detect_morphing_patterns(self, X: pd.DataFrame):
        """Detect common morphing patterns in the training data."""
        try:
            # Create behavioral vectors for all entities
            vectors = []
            entity_ids = []
            
            for entity_id, profile in self.entity_profiles.items():
                vector = self._create_behavioral_vector(profile)
                if len(vector) > 1:  # Valid vector
                    vectors.append(vector)
                    entity_ids.append(entity_id)
            
            if len(vectors) > 0:
                # Normalize vectors
                vectors_array = np.array(vectors)
                if vectors_array.shape[1] > 0:
                    vectors_normalized = self.scaler.fit_transform(vectors_array)
                    
                    # Cluster entities to find morphing patterns
                    clusters = self.clustering_model.fit_predict(vectors_normalized)
                    
                    # Analyze clusters for morphing patterns
                    for cluster_id in set(clusters):
                        if cluster_id != -1:  # Ignore noise points
                            cluster_entities = [entity_ids[i] for i, c in enumerate(clusters) if c == cluster_id]
                            cluster_vectors = vectors_normalized[clusters == cluster_id]
                            
                            pattern = {
                                'cluster_id': cluster_id,
                                'entities': cluster_entities,
                                'centroid': np.mean(cluster_vectors, axis=0),
                                'variance': np.var(cluster_vectors, axis=0),
                                'size': len(cluster_entities)
                            }
                            
                            self.morphing_patterns[f"pattern_{cluster_id}"] = pattern
            
            logger.info(f"Detected {len(self.morphing_patterns)} morphing patterns")
            
        except Exception as e:
            logger.error(f"Failed to detect morphing patterns: {str(e)}")
    
    def _extract_behavioral_features(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Extract behavioral features from current entity data."""
        behavioral_features = {}
        
        try:
            # Activity features
            behavioral_features['activity_count'] = features.get('activity_count', 0)
            behavioral_features['access_frequency'] = features.get('access_frequency', 0)
            behavioral_features['resource_usage'] = features.get('resource_usage', 0)
            behavioral_features['error_rate'] = features.get('error_rate', 0)
            
            # Temporal features
            if 'timestamp' in features:
                timestamp = pd.to_datetime(features['timestamp'])
                behavioral_features['hour_of_day'] = timestamp.hour
                behavioral_features['day_of_week'] = timestamp.dayofweek
            
            # Network features
            behavioral_features['source_ip'] = features.get('source_ip', '')
            behavioral_features['geo_location'] = features.get('geo_location', '')
            behavioral_features['user_agent'] = features.get('user_agent', '')
            
            return behavioral_features
            
        except Exception as e:
            logger.error(f"Failed to extract behavioral features: {str(e)}")
            return {}
    
    def _detect_morphing(
        self, 
        entity_id: str, 
        current_features: Dict[str, Any], 
        full_features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect if entity is morphing based on current behavior vs baseline."""
        try:
            # Get baseline for entity (or use general baseline)
            baseline = self.behavioral_baselines.get(entity_id, 
                                                   self.behavioral_baselines.get('general', {}))
            
            if not baseline:
                return {
                    'score': 0.0,
                    'is_morphing': False,
                    'confidence': 0.0,
                    'type': None,
                    'drift': 0.0,
                    'explanation': {'message': 'No baseline available for entity'}
                }
            
            # Create current behavioral vector
            current_profile = self._create_current_profile(current_features)
            current_vector = self._create_behavioral_vector(current_profile)
            
            # Compare with baseline
            baseline_vector = baseline.get('behavioral_vector', np.array([0.0]))
            
            if len(current_vector) != len(baseline_vector):
                # Pad or truncate to match dimensions
                min_len = min(len(current_vector), len(baseline_vector))
                current_vector = current_vector[:min_len]
                baseline_vector = baseline_vector[:min_len]
            
            # Calculate similarity
            if len(current_vector) > 0 and len(baseline_vector) > 0:
                similarity = cosine_similarity([current_vector], [baseline_vector])[0][0]
                morphing_score = 1.0 - similarity  # Higher score = more morphing
            else:
                morphing_score = 0.0
                similarity = 1.0
            
            # Determine morphing type
            morphing_type = self._determine_morphing_type(current_features, baseline)
            
            # Calculate confidence
            confidence = self._calculate_morphing_confidence(morphing_score, similarity)
            
            # Calculate drift score
            drift_score = self._calculate_drift_score(current_features, baseline)
            
            # Generate explanation
            explanation = self._generate_morphing_explanation(
                morphing_score, similarity, morphing_type, current_features, baseline
            )
            
            return {
                'score': float(morphing_score),
                'is_morphing': morphing_score > self.similarity_threshold,
                'confidence': float(confidence),
                'type': morphing_type,
                'drift': float(drift_score),
                'explanation': explanation
            }
            
        except Exception as e:
            logger.error(f"Failed to detect morphing: {str(e)}")
            return {
                'score': 0.0,
                'is_morphing': False,
                'confidence': 0.0,
                'type': None,
                'drift': 0.0,
                'explanation': {'error': str(e)}
            }
    
    def _create_current_profile(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Create a profile from current features."""
        profile = {
            'feature_means': {},
            'activity_patterns': {},
            'temporal_patterns': {},
            'network_patterns': {}
        }
        
        # Convert current features to profile format
        for key, value in features.items():
            if isinstance(value, (int, float)):
                profile['feature_means'][key] = float(value)
        
        # Activity patterns
        profile['activity_patterns'] = {
            'avg_activity_count': features.get('activity_count', 0.0),
            'avg_access_frequency': features.get('access_frequency', 0.0),
            'avg_resource_usage': features.get('resource_usage', 0.0),
            'avg_error_rate': features.get('error_rate', 0.0)
        }
        
        # Temporal patterns
        if 'timestamp' in features:
            timestamp = pd.to_datetime(features['timestamp'])
            profile['temporal_patterns'] = {
                'peak_hour': timestamp.hour,
                'peak_day': timestamp.dayofweek
            }
        
        # Network patterns
        profile['network_patterns'] = {
            'unique_ips': 1,  # Current observation
            'ip_diversity': 0.0,  # Single observation
            'unique_locations': 1,
            'unique_user_agents': 1
        }
        
        return profile
    
    def _determine_morphing_type(self, current_features: Dict[str, Any], baseline: Dict[str, Any]) -> Optional[str]:
        """Determine the type of morphing detected."""
        try:
            current_activity = current_features.get('activity_count', 0)
            baseline_activity = baseline.get('activity_baseline', {}).get('avg_activity_count', 0)
            
            current_ip = current_features.get('source_ip', '')
            baseline_network = baseline.get('network_baseline', {})
            baseline_ip = baseline_network.get('primary_ip', '')
            
            # Activity-based morphing
            if abs(current_activity - baseline_activity) > baseline_activity * 0.5:
                return 'activity_morphing'
            
            # Network-based morphing
            if current_ip and baseline_ip and current_ip != baseline_ip:
                return 'network_morphing'
            
            # Temporal morphing
            if 'timestamp' in current_features:
                current_hour = pd.to_datetime(current_features['timestamp']).hour
                baseline_hour = baseline.get('temporal_baseline', {}).get('peak_hour', current_hour)
                
                if abs(current_hour - baseline_hour) > 6:  # More than 6 hours difference
                    return 'temporal_morphing'
            
            return 'behavioral_morphing'
            
        except Exception as e:
            logger.error(f"Failed to determine morphing type: {str(e)}")
            return None
    
    def _calculate_morphing_confidence(self, morphing_score: float, similarity: float) -> float:
        """Calculate confidence in morphing detection."""
        try:
            # Higher morphing score and lower similarity = higher confidence
            if morphing_score > 0.8:
                return 0.95
            elif morphing_score > 0.6:
                return 0.8
            elif morphing_score > 0.4:
                return 0.6
            else:
                return 0.3
                
        except Exception as e:
            logger.error(f"Failed to calculate morphing confidence: {str(e)}")
            return 0.0
    
    def _calculate_drift_score(self, current_features: Dict[str, Any], baseline: Dict[str, Any]) -> float:
        """Calculate behavioral drift score."""
        try:
            drift_components = []
            
            # Activity drift
            current_activity = current_features.get('activity_count', 0)
            baseline_activity = baseline.get('activity_baseline', {}).get('avg_activity_count', 0)
            
            if baseline_activity > 0:
                activity_drift = abs(current_activity - baseline_activity) / baseline_activity
                drift_components.append(activity_drift)
            
            # Temporal drift
            if 'timestamp' in current_features:
                current_hour = pd.to_datetime(current_features['timestamp']).hour
                baseline_hour = baseline.get('temporal_baseline', {}).get('peak_hour', current_hour)
                
                hour_drift = abs(current_hour - baseline_hour) / 24.0
                drift_components.append(hour_drift)
            
            # Network drift (simplified)
            current_ip = current_features.get('source_ip', '')
            baseline_ip = baseline.get('network_baseline', {}).get('primary_ip', '')
            
            if baseline_ip and current_ip != baseline_ip:
                drift_components.append(1.0)  # Complete network change
            else:
                drift_components.append(0.0)
            
            return np.mean(drift_components) if drift_components else 0.0
            
        except Exception as e:
            logger.error(f"Failed to calculate drift score: {str(e)}")
            return 0.0
    
    def _generate_morphing_explanation(
        self,
        morphing_score: float,
        similarity: float,
        morphing_type: Optional[str],
        current_features: Dict[str, Any],
        baseline: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate explanation for morphing detection."""
        try:
            explanation = {
                'morphing_score': morphing_score,
                'similarity_to_baseline': similarity,
                'morphing_type': morphing_type,
                'threshold': self.similarity_threshold
            }
            
            # Add specific explanations based on morphing type
            if morphing_type == 'activity_morphing':
                current_activity = current_features.get('activity_count', 0)
                baseline_activity = baseline.get('activity_baseline', {}).get('avg_activity_count', 0)
                explanation['activity_change'] = {
                    'current': current_activity,
                    'baseline': baseline_activity,
                    'change_ratio': (current_activity / baseline_activity) if baseline_activity > 0 else 0
                }
            
            elif morphing_type == 'network_morphing':
                explanation['network_change'] = {
                    'current_ip': current_features.get('source_ip', ''),
                    'baseline_ip': baseline.get('network_baseline', {}).get('primary_ip', ''),
                    'ip_changed': current_features.get('source_ip', '') != baseline.get('network_baseline', {}).get('primary_ip', '')
                }
            
            # Generate summary text
            if morphing_score > self.similarity_threshold:
                explanation['summary'] = f"Entity morphing detected ({morphing_type}). "
                explanation['summary'] += f"Similarity to baseline: {similarity:.3f}, "
                explanation['summary'] += f"morphing score: {morphing_score:.3f}"
            else:
                explanation['summary'] = f"No significant morphing detected. "
                explanation['summary'] += f"Similarity to baseline: {similarity:.3f}"
            
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate morphing explanation: {str(e)}")
            return {'error': str(e)}
    
    def save_model(self, filepath: str) -> None:
        """Save the morphing detector to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'config': self.config,
            'entity_profiles': self.entity_profiles,
            'behavioral_baselines': self.behavioral_baselines,
            'morphing_patterns': self.morphing_patterns,
            'scaler': self.scaler,
            'clustering_model': self.clustering_model,
            'is_trained': self.is_trained,
            'model_version': self.model_version
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Entity morphing detector saved to {filepath}")
    
    async def load_model(self, filepath: str) -> None:
        """Load the morphing detector from disk."""
        model_data = joblib.load(filepath)
        
        self.config = model_data['config']
        self.entity_profiles = model_data['entity_profiles']
        self.behavioral_baselines = model_data['behavioral_baselines']
        self.morphing_patterns = model_data['morphing_patterns']
        self.scaler = model_data['scaler']
        self.clustering_model = model_data['clustering_model']
        self.is_trained = model_data['is_trained']
        self.model_version = model_data['model_version']
        
        logger.info(f"Entity morphing detector loaded from {filepath}")
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the morphing detector."""
        return {
            'model_type': 'entity_morphing_detector',
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'entity_profiles_count': len(self.entity_profiles),
            'behavioral_baselines_count': len(self.behavioral_baselines),
            'morphing_patterns_count': len(self.morphing_patterns),
            'config': self.config,
            'parameters': {
                'similarity_threshold': self.similarity_threshold,
                'temporal_window': self.temporal_window,
                'feature_weights': self.feature_weights
            }
        }
