"""
SHAP/LIME Explainability Service
Enterprise-grade model explainability for security decisions

Standards Compliance:
- NIST AI RMF (Explainability Requirements)
- EU AI Act (Transparency Requirements)
- ISO/IEC 23894 (AI Risk Management)

Author: Nexora Security Team
Version: 1.0.0
"""

from typing import Dict, List, Any, Optional
import numpy as np
import shap
from lime.lime_tabular import LimeTabularExplainer
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ExplanationType(str, Enum):
    SHAP = "shap"
    LIME = "lime"
    BOTH = "both"

@dataclass
class FeatureContribution:
    feature_name: str
    contribution: float
    direction: str  # 'positive' or 'negative'
    importance_rank: int
    raw_value: Any

@dataclass
class Explanation:
    prediction_type: str
    prediction_value: float
    explanation_type: str
    feature_contributions: List[FeatureContribution]
    base_value: float
    summary: str
    visualization_data: Dict[str, Any]

class ExplainabilityService:
    """
    Provides SHAP and LIME explanations for ML predictions
    """
    
    def __init__(self, model, feature_names: List[str], training_data: Optional[np.ndarray] = None):
        self.model = model
        self.feature_names = feature_names
        self.training_data = training_data
        self.shap_explainer: Optional[shap.Explainer] = None
        self.lime_explainer: Optional[LimeTabularExplainer] = None
        
        self._initialize_explainers()
    
    def _initialize_explainers(self):
        """Initialize SHAP and LIME explainers"""
        try:
            # Initialize SHAP explainer
            if self.training_data is not None and len(self.training_data) > 0:
                # Use TreeExplainer for tree-based models, KernelExplainer otherwise
                try:
                    self.shap_explainer = shap.TreeExplainer(self.model)
                    logger.info("SHAP TreeExplainer initialized")
                except Exception:
                    background = shap.sample(self.training_data, min(100, len(self.training_data)))
                    self.shap_explainer = shap.KernelExplainer(
                        self.model.predict_proba if hasattr(self.model, 'predict_proba') else self.model.predict,
                        background
                    )
                    logger.info("SHAP KernelExplainer initialized")
            
            # Initialize LIME explainer
            if self.training_data is not None and len(self.training_data) > 0:
                self.lime_explainer = LimeTabularExplainer(
                    training_data=self.training_data,
                    feature_names=self.feature_names,
                    class_names=['normal', 'anomaly'],
                    mode='classification'
                )
                logger.info("LIME explainer initialized")
                
        except Exception as e:
            logger.warning(f"Could not initialize explainers: {e}")
    
    def explain_shap(self, instance: np.ndarray) -> Explanation:
        """Generate SHAP explanation for a single instance"""
        if self.shap_explainer is None:
            raise ValueError("SHAP explainer not initialized. Provide training data.")
        
        # Get SHAP values
        shap_values = self.shap_explainer.shap_values(instance)
        
        # Handle multi-class output
        if isinstance(shap_values, list):
            # For binary classification, use positive class
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        
        if len(shap_values.shape) > 1:
            shap_values = shap_values[0]
        
        # Get base value
        base_value = self.shap_explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)):
            base_value = base_value[1] if len(base_value) > 1 else base_value[0]
        
        # Create feature contributions
        contributions = self._create_contributions(shap_values, instance[0])
        
        # Get prediction
        if hasattr(self.model, 'predict_proba'):
            prediction = self.model.predict_proba(instance)[0][1]
        else:
            prediction = self.model.predict(instance)[0]
        
        # Generate summary
        summary = self._generate_summary(contributions, prediction, "SHAP")
        
        # Create visualization data
        viz_data = {
            "type": "waterfall",
            "base_value": float(base_value),
            "features": [
                {
                    "name": c.feature_name,
                    "value": c.contribution,
                    "raw_value": c.raw_value
                }
                for c in contributions[:10]
            ],
            "prediction": float(prediction)
        }
        
        return Explanation(
            prediction_type="anomaly_probability",
            prediction_value=float(prediction),
            explanation_type="shap",
            feature_contributions=contributions,
            base_value=float(base_value),
            summary=summary,
            visualization_data=viz_data
        )
    
    def explain_lime(self, instance: np.ndarray, num_features: int = 10) -> Explanation:
        """Generate LIME explanation for a single instance"""
        if self.lime_explainer is None:
            raise ValueError("LIME explainer not initialized. Provide training data.")
        
        # Get LIME explanation
        predict_fn = self.model.predict_proba if hasattr(self.model, 'predict_proba') else self.model.predict
        exp = self.lime_explainer.explain_instance(
            instance[0],
            predict_fn,
            num_features=num_features,
            top_labels=1
        )
        
        # Get feature weights
        label = list(exp.local_exp.keys())[0]
        feature_weights = exp.local_exp[label]
        
        # Create feature contributions
        contributions = []
        for rank, (feature_idx, weight) in enumerate(sorted(feature_weights, key=lambda x: abs(x[1]), reverse=True)):
            contributions.append(FeatureContribution(
                feature_name=self.feature_names[feature_idx],
                contribution=float(weight),
                direction="positive" if weight > 0 else "negative",
                importance_rank=rank + 1,
                raw_value=float(instance[0][feature_idx])
            ))
        
        # Get prediction
        if hasattr(self.model, 'predict_proba'):
            prediction = self.model.predict_proba(instance)[0][1]
        else:
            prediction = self.model.predict(instance)[0]
        
        # Generate summary
        summary = self._generate_summary(contributions, prediction, "LIME")
        
        # Create visualization data
        viz_data = {
            "type": "bar",
            "features": [
                {
                    "name": c.feature_name,
                    "value": c.contribution,
                    "raw_value": c.raw_value
                }
                for c in contributions
            ],
            "prediction": float(prediction),
            "intercept": float(exp.intercept[label]) if hasattr(exp, 'intercept') else 0
        }
        
        return Explanation(
            prediction_type="anomaly_probability",
            prediction_value=float(prediction),
            explanation_type="lime",
            feature_contributions=contributions,
            base_value=float(exp.intercept[label]) if hasattr(exp, 'intercept') else 0,
            summary=summary,
            visualization_data=viz_data
        )
    
    def explain(self, instance: np.ndarray, explanation_type: ExplanationType = ExplanationType.BOTH) -> Dict[str, Explanation]:
        """Generate explanations using specified method(s)"""
        results = {}
        
        if explanation_type in [ExplanationType.SHAP, ExplanationType.BOTH]:
            try:
                results["shap"] = self.explain_shap(instance)
            except Exception as e:
                logger.error(f"SHAP explanation failed: {e}")
        
        if explanation_type in [ExplanationType.LIME, ExplanationType.BOTH]:
            try:
                results["lime"] = self.explain_lime(instance)
            except Exception as e:
                logger.error(f"LIME explanation failed: {e}")
        
        return results
    
    def _create_contributions(self, shap_values: np.ndarray, instance: np.ndarray) -> List[FeatureContribution]:
        """Create sorted list of feature contributions"""
        contributions = []
        
        # Sort by absolute value
        sorted_indices = np.argsort(np.abs(shap_values))[::-1]
        
        for rank, idx in enumerate(sorted_indices):
            contributions.append(FeatureContribution(
                feature_name=self.feature_names[idx],
                contribution=float(shap_values[idx]),
                direction="positive" if shap_values[idx] > 0 else "negative",
                importance_rank=rank + 1,
                raw_value=float(instance[idx])
            ))
        
        return contributions
    
    def _generate_summary(self, contributions: List[FeatureContribution], prediction: float, method: str) -> str:
        """Generate human-readable summary of explanation"""
        risk_level = "high" if prediction > 0.7 else "medium" if prediction > 0.4 else "low"
        
        top_positive = [c for c in contributions[:5] if c.direction == "positive"]
        top_negative = [c for c in contributions[:5] if c.direction == "negative"]
        
        summary_parts = [
            f"This identity has a {risk_level} anomaly risk (score: {prediction:.2%}).",
            f"Analysis method: {method}."
        ]
        
        if top_positive:
            factors = ", ".join([c.feature_name for c in top_positive[:3]])
            summary_parts.append(f"Key risk factors: {factors}.")
        
        if top_negative:
            factors = ", ".join([c.feature_name for c in top_negative[:3]])
            summary_parts.append(f"Mitigating factors: {factors}.")
        
        return " ".join(summary_parts)
    
    def get_global_importance(self, data: np.ndarray) -> Dict[str, float]:
        """Calculate global feature importance using SHAP"""
        if self.shap_explainer is None:
            raise ValueError("SHAP explainer not initialized")
        
        shap_values = self.shap_explainer.shap_values(data)
        
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        
        # Calculate mean absolute SHAP value for each feature
        importance = np.abs(shap_values).mean(axis=0)
        
        return {
            self.feature_names[i]: float(importance[i])
            for i in range(len(self.feature_names))
        }


def create_explanation_response(explanation: Explanation) -> Dict[str, Any]:
    """Convert Explanation to API response format"""
    return {
        "prediction_type": explanation.prediction_type,
        "prediction_value": explanation.prediction_value,
        "explanation_type": explanation.explanation_type,
        "base_value": explanation.base_value,
        "summary": explanation.summary,
        "feature_contributions": [
            {
                "feature_name": c.feature_name,
                "contribution": c.contribution,
                "direction": c.direction,
                "importance_rank": c.importance_rank,
                "raw_value": c.raw_value
            }
            for c in explanation.feature_contributions
        ],
        "visualization": explanation.visualization_data
    }
