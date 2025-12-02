"""Explainability utilities for ML models."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ExplainabilityEngine:
    """Engine for generating explanations for ML model predictions."""
    
    def __init__(self):
        """Initialize explainability engine."""
        self.explanation_cache = {}
        
    def generate_explanation(
        self,
        model_type: str,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any],
        model_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive explanation for a prediction."""
        try:
            explanation = {
                'model_type': model_type,
                'prediction_timestamp': datetime.utcnow().isoformat(),
                'prediction_summary': self._generate_summary(prediction_result),
                'feature_importance': self._calculate_feature_importance(
                    model_type, prediction_result, feature_data
                ),
                'decision_factors': self._identify_decision_factors(
                    prediction_result, feature_data
                ),
                'confidence_analysis': self._analyze_confidence(prediction_result),
                'risk_assessment': self._assess_risk(prediction_result),
                'recommendations': self._generate_recommendations(
                    model_type, prediction_result, feature_data
                ),
                'technical_details': self._extract_technical_details(
                    model_type, prediction_result, model_info
                )
            }
            
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate explanation: {str(e)}")
            return {
                'error': str(e),
                'model_type': model_type,
                'prediction_timestamp': datetime.utcnow().isoformat()
            }
    
    def _generate_summary(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate high-level summary of the prediction."""
        try:
            score = prediction_result.get('score', 0.0)
            is_anomaly = prediction_result.get('is_anomaly', False)
            confidence = prediction_result.get('confidence', 0.0)
            
            # Determine severity level
            if score >= 0.9:
                severity = 'critical'
                urgency = 'immediate'
            elif score >= 0.8:
                severity = 'high'
                urgency = 'urgent'
            elif score >= 0.6:
                severity = 'medium'
                urgency = 'moderate'
            elif score >= 0.4:
                severity = 'low'
                urgency = 'low'
            else:
                severity = 'minimal'
                urgency = 'informational'
            
            # Generate summary text
            if is_anomaly:
                summary_text = f"Anomaly detected with {severity} severity (score: {score:.3f}). "
                summary_text += f"Confidence level: {confidence:.1%}. "
                summary_text += f"Recommended action urgency: {urgency}."
            else:
                summary_text = f"Normal behavior detected (score: {score:.3f}). "
                summary_text += f"Confidence level: {confidence:.1%}. "
                summary_text += "No immediate action required."
            
            return {
                'is_anomaly': is_anomaly,
                'severity': severity,
                'urgency': urgency,
                'score': score,
                'confidence': confidence,
                'summary_text': summary_text
            }
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {str(e)}")
            return {'error': str(e)}
    
    def _calculate_feature_importance(
        self,
        model_type: str,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate feature importance for the prediction."""
        try:
            # Extract feature importance from model-specific results
            if model_type == 'isolation_forest':
                return self._isolation_forest_feature_importance(
                    prediction_result, feature_data
                )
            elif model_type == 'ocsvm':
                return self._ocsvm_feature_importance(
                    prediction_result, feature_data
                )
            elif model_type == 'autoencoder':
                return self._autoencoder_feature_importance(
                    prediction_result, feature_data
                )
            elif model_type == 'ensemble':
                return self._ensemble_feature_importance(
                    prediction_result, feature_data
                )
            else:
                return self._generic_feature_importance(
                    prediction_result, feature_data
                )
                
        except Exception as e:
            logger.error(f"Failed to calculate feature importance: {str(e)}")
            return {'error': str(e)}
    
    def _isolation_forest_feature_importance(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate feature importance for Isolation Forest."""
        try:
            explanation = prediction_result.get('explanation', {})
            feature_importance = explanation.get('feature_importance', {})
            
            if not feature_importance:
                # Fallback: calculate based on feature values
                feature_importance = self._calculate_value_based_importance(feature_data)
            
            # Sort by importance
            sorted_features = sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                'method': 'isolation_paths',
                'top_features': dict(sorted_features[:10]),
                'all_features': dict(sorted_features),
                'explanation': 'Features with higher importance contributed more to the isolation decision'
            }
            
        except Exception as e:
            logger.error(f"Isolation Forest feature importance failed: {str(e)}")
            return {'error': str(e)}
    
    def _ocsvm_feature_importance(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate feature importance for One-Class SVM."""
        try:
            explanation = prediction_result.get('explanation', {})
            feature_importance = explanation.get('feature_importance', {})
            
            if not feature_importance:
                # Fallback: calculate based on support vectors
                feature_importance = self._calculate_value_based_importance(feature_data)
            
            # Sort by importance
            sorted_features = sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                'method': 'support_vector_distance',
                'top_features': dict(sorted_features[:10]),
                'all_features': dict(sorted_features),
                'explanation': 'Features with higher importance had greater influence on the SVM decision boundary'
            }
            
        except Exception as e:
            logger.error(f"One-Class SVM feature importance failed: {str(e)}")
            return {'error': str(e)}
    
    def _autoencoder_feature_importance(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate feature importance for Autoencoder."""
        try:
            explanation = prediction_result.get('explanation', {})
            feature_errors = explanation.get('feature_errors', {})
            
            if not feature_errors:
                # Fallback: calculate based on feature values
                feature_errors = self._calculate_value_based_importance(feature_data)
            
            # Sort by reconstruction error (higher error = more important)
            sorted_features = sorted(
                feature_errors.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                'method': 'reconstruction_error',
                'top_features': dict(sorted_features[:10]),
                'all_features': dict(sorted_features),
                'explanation': 'Features with higher reconstruction errors contributed more to the anomaly detection'
            }
            
        except Exception as e:
            logger.error(f"Autoencoder feature importance failed: {str(e)}")
            return {'error': str(e)}
    
    def _ensemble_feature_importance(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate feature importance for Ensemble model."""
        try:
            explanation = prediction_result.get('explanation', {})
            individual_explanations = explanation.get('individual_explanations', {})
            
            # Combine feature importance from all models
            combined_importance = {}
            model_count = 0
            
            for model_name, model_explanation in individual_explanations.items():
                if isinstance(model_explanation, dict):
                    model_importance = model_explanation.get('feature_importance', {})
                    model_count += 1
                    
                    for feature, importance in model_importance.items():
                        if feature not in combined_importance:
                            combined_importance[feature] = 0.0
                        combined_importance[feature] += importance
            
            # Average the importance scores
            if model_count > 0:
                for feature in combined_importance:
                    combined_importance[feature] /= model_count
            
            # Sort by importance
            sorted_features = sorted(
                combined_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                'method': 'ensemble_average',
                'top_features': dict(sorted_features[:10]),
                'all_features': dict(sorted_features),
                'models_used': list(individual_explanations.keys()),
                'explanation': f'Feature importance averaged across {model_count} models in the ensemble'
            }
            
        except Exception as e:
            logger.error(f"Ensemble feature importance failed: {str(e)}")
            return {'error': str(e)}
    
    def _generic_feature_importance(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generic feature importance calculation."""
        try:
            # Calculate importance based on feature values and variance
            feature_importance = self._calculate_value_based_importance(feature_data)
            
            # Sort by importance
            sorted_features = sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return {
                'method': 'value_based',
                'top_features': dict(sorted_features[:10]),
                'all_features': dict(sorted_features),
                'explanation': 'Feature importance calculated based on feature values and statistical properties'
            }
            
        except Exception as e:
            logger.error(f"Generic feature importance failed: {str(e)}")
            return {'error': str(e)}
    
    def _calculate_value_based_importance(self, feature_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate feature importance based on feature values."""
        importance = {}
        
        try:
            # Convert to numeric values only
            numeric_features = {}
            for key, value in feature_data.items():
                if isinstance(value, (int, float)) and not np.isnan(value):
                    numeric_features[key] = float(value)
            
            if not numeric_features:
                return importance
            
            # Calculate importance based on normalized absolute values
            values = np.array(list(numeric_features.values()))
            
            # Normalize values to [0, 1] range
            if len(values) > 1:
                min_val = np.min(values)
                max_val = np.max(values)
                
                if max_val > min_val:
                    normalized_values = (values - min_val) / (max_val - min_val)
                else:
                    normalized_values = np.ones_like(values) * 0.5
            else:
                normalized_values = np.array([0.5])
            
            # Assign importance scores
            for i, (feature_name, _) in enumerate(numeric_features.items()):
                importance[feature_name] = float(normalized_values[i])
            
        except Exception as e:
            logger.error(f"Value-based importance calculation failed: {str(e)}")
        
        return importance
    
    def _identify_decision_factors(
        self,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Identify key factors that influenced the decision."""
        try:
            factors = {
                'primary_factors': [],
                'secondary_factors': [],
                'patterns_detected': [],
                'thresholds_exceeded': []
            }
            
            # Extract patterns from prediction result
            patterns = prediction_result.get('patterns', [])
            factors['patterns_detected'] = patterns[:5]  # Top 5 patterns
            
            # Analyze feature values for threshold exceedances
            score = prediction_result.get('score', 0.0)
            
            # Identify high-value features that might indicate anomalies
            high_value_features = []
            for feature_name, value in feature_data.items():
                if isinstance(value, (int, float)) and not np.isnan(value):
                    if value > 100:  # Arbitrary threshold for demonstration
                        high_value_features.append({
                            'feature': feature_name,
                            'value': value,
                            'significance': 'high_value'
                        })
            
            factors['thresholds_exceeded'] = high_value_features[:3]
            
            # Categorize factors by importance
            explanation = prediction_result.get('explanation', {})
            feature_importance = explanation.get('feature_importance', {})
            
            if feature_importance:
                sorted_features = sorted(
                    feature_importance.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                # Primary factors (top 3)
                factors['primary_factors'] = [
                    {
                        'feature': name,
                        'importance': importance,
                        'value': feature_data.get(name, 'N/A')
                    }
                    for name, importance in sorted_features[:3]
                ]
                
                # Secondary factors (next 3)
                factors['secondary_factors'] = [
                    {
                        'feature': name,
                        'importance': importance,
                        'value': feature_data.get(name, 'N/A')
                    }
                    for name, importance in sorted_features[3:6]
                ]
            
            return factors
            
        except Exception as e:
            logger.error(f"Failed to identify decision factors: {str(e)}")
            return {'error': str(e)}
    
    def _analyze_confidence(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze prediction confidence."""
        try:
            confidence = prediction_result.get('confidence', 0.0)
            score = prediction_result.get('score', 0.0)
            
            # Confidence level categorization
            if confidence >= 0.9:
                confidence_level = 'very_high'
                reliability = 'highly_reliable'
            elif confidence >= 0.8:
                confidence_level = 'high'
                reliability = 'reliable'
            elif confidence >= 0.6:
                confidence_level = 'medium'
                reliability = 'moderately_reliable'
            elif confidence >= 0.4:
                confidence_level = 'low'
                reliability = 'low_reliability'
            else:
                confidence_level = 'very_low'
                reliability = 'unreliable'
            
            # Confidence factors
            factors = []
            
            if abs(score - 0.5) > 0.3:  # Clear decision boundary
                factors.append('clear_decision_boundary')
            
            if confidence > 0.8:
                factors.append('high_model_certainty')
            
            # Model agreement (for ensemble)
            individual_predictions = prediction_result.get('individual_predictions', {})
            if individual_predictions:
                scores = [pred.get('score', 0.0) for pred in individual_predictions.values()]
                if len(scores) > 1:
                    score_variance = np.var(scores)
                    if score_variance < 0.1:
                        factors.append('model_agreement')
                    else:
                        factors.append('model_disagreement')
            
            return {
                'confidence_score': confidence,
                'confidence_level': confidence_level,
                'reliability': reliability,
                'confidence_factors': factors,
                'interpretation': self._interpret_confidence(confidence, score)
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze confidence: {str(e)}")
            return {'error': str(e)}
    
    def _interpret_confidence(self, confidence: float, score: float) -> str:
        """Generate confidence interpretation text."""
        try:
            if confidence >= 0.9:
                return f"Very high confidence ({confidence:.1%}) in the prediction. The model is highly certain about this result."
            elif confidence >= 0.8:
                return f"High confidence ({confidence:.1%}) in the prediction. The result is reliable for decision making."
            elif confidence >= 0.6:
                return f"Medium confidence ({confidence:.1%}) in the prediction. Consider additional validation."
            elif confidence >= 0.4:
                return f"Low confidence ({confidence:.1%}) in the prediction. Use caution when acting on this result."
            else:
                return f"Very low confidence ({confidence:.1%}) in the prediction. This result should not be used for critical decisions."
                
        except Exception as e:
            return f"Unable to interpret confidence: {str(e)}"
    
    def _assess_risk(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risk level based on prediction."""
        try:
            score = prediction_result.get('score', 0.0)
            is_anomaly = prediction_result.get('is_anomaly', False)
            confidence = prediction_result.get('confidence', 0.0)
            
            # Risk level calculation
            if is_anomaly and score >= 0.9 and confidence >= 0.8:
                risk_level = 'critical'
                risk_score = 0.95
            elif is_anomaly and score >= 0.8:
                risk_level = 'high'
                risk_score = 0.8
            elif is_anomaly and score >= 0.6:
                risk_level = 'medium'
                risk_score = 0.6
            elif is_anomaly:
                risk_level = 'low'
                risk_score = 0.4
            else:
                risk_level = 'minimal'
                risk_score = 0.1
            
            # Risk factors
            risk_factors = []
            patterns = prediction_result.get('patterns', [])
            
            for pattern in patterns:
                if 'escalation' in pattern.lower():
                    risk_factors.append('privilege_escalation')
                elif 'exfiltration' in pattern.lower():
                    risk_factors.append('data_exfiltration')
                elif 'lateral' in pattern.lower():
                    risk_factors.append('lateral_movement')
                elif 'persistence' in pattern.lower():
                    risk_factors.append('persistence_mechanism')
            
            return {
                'risk_level': risk_level,
                'risk_score': risk_score,
                'risk_factors': risk_factors,
                'impact_assessment': self._assess_impact(risk_level, risk_factors),
                'mitigation_urgency': self._determine_urgency(risk_level, confidence)
            }
            
        except Exception as e:
            logger.error(f"Failed to assess risk: {str(e)}")
            return {'error': str(e)}
    
    def _assess_impact(self, risk_level: str, risk_factors: List[str]) -> Dict[str, Any]:
        """Assess potential impact of the detected anomaly."""
        impact_levels = {
            'critical': 'Severe business impact, potential data breach or system compromise',
            'high': 'Significant impact, potential unauthorized access or data exposure',
            'medium': 'Moderate impact, potential policy violations or security gaps',
            'low': 'Minor impact, potential suspicious activity requiring investigation',
            'minimal': 'Negligible impact, normal operational variance'
        }
        
        specific_impacts = []
        for factor in risk_factors:
            if factor == 'privilege_escalation':
                specific_impacts.append('Unauthorized access to sensitive resources')
            elif factor == 'data_exfiltration':
                specific_impacts.append('Potential data theft or unauthorized data transfer')
            elif factor == 'lateral_movement':
                specific_impacts.append('Potential network compromise and system infiltration')
            elif factor == 'persistence_mechanism':
                specific_impacts.append('Potential long-term unauthorized access')
        
        return {
            'general_impact': impact_levels.get(risk_level, 'Unknown impact'),
            'specific_impacts': specific_impacts,
            'business_areas_affected': self._identify_affected_areas(risk_factors)
        }
    
    def _identify_affected_areas(self, risk_factors: List[str]) -> List[str]:
        """Identify business areas that might be affected."""
        areas = set()
        
        for factor in risk_factors:
            if factor in ['privilege_escalation', 'lateral_movement']:
                areas.update(['IT Infrastructure', 'Network Security'])
            elif factor == 'data_exfiltration':
                areas.update(['Data Security', 'Compliance', 'Privacy'])
            elif factor == 'persistence_mechanism':
                areas.update(['System Administration', 'Endpoint Security'])
        
        return list(areas) if areas else ['General Security']
    
    def _determine_urgency(self, risk_level: str, confidence: float) -> str:
        """Determine mitigation urgency."""
        urgency_matrix = {
            'critical': 'immediate',
            'high': 'urgent',
            'medium': 'moderate',
            'low': 'low',
            'minimal': 'informational'
        }
        
        base_urgency = urgency_matrix.get(risk_level, 'moderate')
        
        # Adjust based on confidence
        if confidence < 0.6 and base_urgency in ['immediate', 'urgent']:
            return 'moderate'  # Lower urgency for low confidence high-risk predictions
        
        return base_urgency
    
    def _generate_recommendations(
        self,
        model_type: str,
        prediction_result: Dict[str, Any],
        feature_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate actionable recommendations."""
        try:
            recommendations = {
                'immediate_actions': [],
                'investigation_steps': [],
                'preventive_measures': [],
                'monitoring_recommendations': []
            }
            
            score = prediction_result.get('score', 0.0)
            is_anomaly = prediction_result.get('is_anomaly', False)
            patterns = prediction_result.get('patterns', [])
            
            if is_anomaly:
                # Immediate actions based on score
                if score >= 0.9:
                    recommendations['immediate_actions'].extend([
                        'Immediately investigate the entity and its recent activities',
                        'Consider temporarily suspending the entity if safe to do so',
                        'Alert security team for urgent review'
                    ])
                elif score >= 0.7:
                    recommendations['immediate_actions'].extend([
                        'Investigate the entity within the next hour',
                        'Review recent activity logs for suspicious patterns',
                        'Notify security team for priority review'
                    ])
                else:
                    recommendations['immediate_actions'].extend([
                        'Schedule investigation within 24 hours',
                        'Add entity to monitoring watchlist'
                    ])
                
                # Pattern-specific recommendations
                for pattern in patterns:
                    if 'escalation' in pattern.lower():
                        recommendations['investigation_steps'].append(
                            'Review permission changes and access attempts'
                        )
                    elif 'exfiltration' in pattern.lower():
                        recommendations['investigation_steps'].append(
                            'Analyze data transfer patterns and destinations'
                        )
                    elif 'lateral' in pattern.lower():
                        recommendations['investigation_steps'].append(
                            'Check network connections and accessed systems'
                        )
                
                # Preventive measures
                recommendations['preventive_measures'].extend([
                    'Review and update access policies',
                    'Implement additional monitoring for similar entities',
                    'Consider implementing stricter authentication requirements'
                ])
                
                # Monitoring recommendations
                recommendations['monitoring_recommendations'].extend([
                    'Increase monitoring frequency for this entity',
                    'Set up alerts for similar behavior patterns',
                    'Monitor related entities and systems'
                ])
            
            else:
                # Normal behavior recommendations
                recommendations['monitoring_recommendations'].extend([
                    'Continue regular monitoring',
                    'Maintain current security policies'
                ])
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return {'error': str(e)}
    
    def _extract_technical_details(
        self,
        model_type: str,
        prediction_result: Dict[str, Any],
        model_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Extract technical details about the prediction."""
        try:
            details = {
                'model_type': model_type,
                'model_version': prediction_result.get('model_version', 'unknown'),
                'prediction_method': self._get_prediction_method(model_type),
                'algorithm_details': self._get_algorithm_details(model_type, model_info),
                'performance_metrics': self._extract_performance_metrics(prediction_result),
                'data_quality': self._assess_data_quality(prediction_result)
            }
            
            return details
            
        except Exception as e:
            logger.error(f"Failed to extract technical details: {str(e)}")
            return {'error': str(e)}
    
    def _get_prediction_method(self, model_type: str) -> str:
        """Get description of prediction method."""
        methods = {
            'isolation_forest': 'Isolation-based anomaly detection using random forest partitioning',
            'ocsvm': 'One-class support vector machine with RBF kernel',
            'autoencoder': 'Deep learning reconstruction error analysis',
            'ensemble': 'Weighted voting across multiple anomaly detection algorithms'
        }
        
        return methods.get(model_type, 'Unknown prediction method')
    
    def _get_algorithm_details(
        self,
        model_type: str,
        model_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get algorithm-specific details."""
        if not model_info:
            return {}
        
        parameters = model_info.get('parameters', {})
        
        if model_type == 'isolation_forest':
            return {
                'n_estimators': parameters.get('n_estimators', 'N/A'),
                'contamination': parameters.get('contamination', 'N/A'),
                'max_samples': parameters.get('max_samples', 'N/A')
            }
        elif model_type == 'ocsvm':
            return {
                'kernel': parameters.get('kernel', 'N/A'),
                'gamma': parameters.get('gamma', 'N/A'),
                'nu': parameters.get('nu', 'N/A')
            }
        elif model_type == 'autoencoder':
            return {
                'input_dim': parameters.get('input_dim', 'N/A'),
                'encoding_dim': parameters.get('encoding_dim', 'N/A'),
                'hidden_layers': parameters.get('hidden_layers', 'N/A')
            }
        
        return parameters
    
    def _extract_performance_metrics(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract performance-related metrics."""
        return {
            'prediction_score': prediction_result.get('score', 0.0),
            'confidence_score': prediction_result.get('confidence', 0.0),
            'decision_score': prediction_result.get('decision_score', 'N/A'),
            'reconstruction_error': prediction_result.get('reconstruction_error', 'N/A')
        }
    
    def _assess_data_quality(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Assess quality of input data used for prediction."""
        # This is a simplified assessment - in practice, you'd analyze the actual feature data
        return {
            'completeness': 'Good',  # Placeholder
            'consistency': 'Good',   # Placeholder
            'reliability': 'High',   # Placeholder
            'notes': 'Data quality assessment based on available features'
        }
