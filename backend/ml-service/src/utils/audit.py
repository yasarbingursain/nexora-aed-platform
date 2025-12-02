"""Audit trail and OCSF event emission for ML predictions."""

import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class AuditLogger:
    """Append-only audit logger with hash-chain integrity."""
    
    def __init__(self, log_file: str = "ml-audit.log"):
        """Initialize audit logger."""
        self.log_file = log_file
        self.previous_hash = "0" * 64  # Genesis hash
        
    def _calculate_hash(self, record: Dict[str, Any]) -> str:
        """Calculate SHA-256 hash of audit record."""
        record_str = json.dumps(record, sort_keys=True)
        combined = f"{self.previous_hash}{record_str}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def log_prediction(
        self,
        tenant_id: str,
        entity_id: str,
        anomaly_score: float,
        risk_level: str,
        model_version: str,
        feature_hash: str,
        calibration_run_id: str,
        prediction_metadata: Dict[str, Any]
    ) -> str:
        """
        Log high-risk prediction to append-only audit trail.
        
        Returns:
            Hash of the audit record
        """
        try:
            record = {
                "timestamp": datetime.utcnow().isoformat(),
                "tenant_id": tenant_id,
                "entity_id": entity_id,
                "anomaly_score": anomaly_score,
                "risk_level": risk_level,
                "model_version": model_version,
                "feature_hash": feature_hash,
                "calibration_run_id": calibration_run_id,
                "metadata": prediction_metadata,
                "previous_hash": self.previous_hash
            }
            
            # Calculate hash for integrity
            current_hash = self._calculate_hash(record)
            record["record_hash"] = current_hash
            
            # Append to audit log (append-only)
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(record) + '\n')
            
            # Update chain
            self.previous_hash = current_hash
            
            logger.info(f"Audit record logged for {entity_id}: {current_hash[:16]}...")
            return current_hash
            
        except Exception as e:
            logger.error(f"Failed to log audit record: {str(e)}")
            raise


class OCSFEventEmitter:
    """Emit OCSF 1.x detection events for high-risk predictions."""
    
    @staticmethod
    def create_detection_event(
        tenant_id: str,
        entity_id: str,
        anomaly_score: float,
        risk_level: str,
        detected_patterns: list,
        model_version: str,
        confidence: float
    ) -> Dict[str, Any]:
        """
        Create OCSF Detection Finding event.
        
        OCSF Schema: https://schema.ocsf.io/1.0.0/classes/detection_finding
        Class ID: 2004
        """
        severity_map = {
            "low": 1,      # Informational
            "medium": 2,   # Low
            "high": 3,     # Medium
            "critical": 4  # High
        }
        
        event = {
            "class_uid": 2004,  # Detection Finding
            "class_name": "Detection Finding",
            "category_uid": 2,  # Findings
            "category_name": "Findings",
            "severity_id": severity_map.get(risk_level, 1),
            "severity": risk_level.upper(),
            "time": int(datetime.utcnow().timestamp() * 1000),
            "metadata": {
                "version": "1.0.0",
                "product": {
                    "name": "Nexora ML Service",
                    "vendor_name": "Nexora Security",
                    "version": model_version
                },
                "tenant_uid": tenant_id
            },
            "finding_info": {
                "title": "Anomalous Entity Behavior Detected",
                "uid": f"nexora-ml-{entity_id}-{int(datetime.utcnow().timestamp())}",
                "types": ["Anomalous Behavior", "Entity Morphing"],
                "created_time": int(datetime.utcnow().timestamp() * 1000),
                "modified_time": int(datetime.utcnow().timestamp() * 1000)
            },
            "resources": [
                {
                    "name": entity_id,
                    "type": "Non-Human Identity",
                    "uid": entity_id
                }
            ],
            "confidence": int(confidence * 100),
            "confidence_id": 3 if confidence > 0.8 else 2,  # High or Medium
            "risk_score": int(anomaly_score * 100),
            "risk_level": risk_level,
            "risk_level_id": severity_map.get(risk_level, 1),
            "observables": [
                {
                    "name": "anomaly_score",
                    "type": "Metric",
                    "value": str(anomaly_score)
                },
                {
                    "name": "detected_patterns",
                    "type": "Indicator",
                    "value": ", ".join(detected_patterns[:5])
                }
            ],
            "status": "New",
            "status_id": 1
        }
        
        return event
    
    @staticmethod
    def emit_event(event: Dict[str, Any], output_file: str = "ocsf-events.jsonl") -> None:
        """Emit OCSF event to output file."""
        try:
            with open(output_file, 'a') as f:
                f.write(json.dumps(event) + '\n')
            logger.info(f"OCSF event emitted: {event['finding_info']['uid']}")
        except Exception as e:
            logger.error(f"Failed to emit OCSF event: {str(e)}")
            raise


def calculate_feature_hash(features: Dict[str, Any]) -> str:
    """Calculate deterministic hash of feature vector."""
    feature_str = json.dumps(features, sort_keys=True)
    return hashlib.sha256(feature_str.encode()).hexdigest()[:16]


# Global instances
audit_logger = AuditLogger()
ocsf_emitter = OCSFEventEmitter()
