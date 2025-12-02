"""Model versioning and metadata constants."""

from datetime import datetime
import hashlib
import json

# Model version - update on every model change
MODEL_VERSION = "2025.11.04"

# Feature schema version - update when feature extraction changes
FEATURE_SCHEMA_VERSION = "1.0.0"

# Calibration run ID - update after each calibration
CALIBRATION_RUN_ID = "cal_20251104_001"

# Feature schema definition for hash calculation
FEATURE_SCHEMA = {
    "behavioral": [
        "activity_frequency", "action_diversity", "resource_diversity",
        "ip_diversity", "success_rate", "velocity", "burst_score",
        "hour_0", "hour_1", "hour_2", "hour_3", "hour_4", "hour_5",
        "hour_6", "hour_7", "hour_8", "hour_9", "hour_10", "hour_11",
        "hour_12", "hour_13", "hour_14", "hour_15", "hour_16", "hour_17",
        "hour_18", "hour_19", "hour_20", "hour_21", "hour_22", "hour_23",
        "dow_0", "dow_1", "dow_2", "dow_3", "dow_4", "dow_5", "dow_6"
    ],
    "temporal": [
        "hour_of_day", "hour_sin", "hour_cos",
        "day_of_week", "dow_sin", "dow_cos",
        "day_of_month", "is_weekend", "is_business_hours",
        "week_of_year", "month_of_year"
    ],
    "network": [
        "source_ip_count", "dest_ip_count", "ip_diversity",
        "private_ip_ratio", "bytes_sent", "bytes_received",
        "packets_sent", "packets_received", "connection_count",
        "failed_connection_ratio", "port_diversity"
    ]
}


def get_feature_schema_hash() -> str:
    """Calculate deterministic hash of feature schema."""
    schema_str = json.dumps(FEATURE_SCHEMA, sort_keys=True)
    return hashlib.sha256(schema_str.encode()).hexdigest()[:16]


def get_version_metadata() -> dict:
    """Get complete version metadata for API responses."""
    return {
        "model_version": MODEL_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_schema_hash": get_feature_schema_hash(),
        "calibration_run_id": CALIBRATION_RUN_ID,
        "generated_at": datetime.utcnow().isoformat()
    }


def validate_feature_schema(features: dict) -> bool:
    """Validate that features match expected schema."""
    expected_features = set()
    for category_features in FEATURE_SCHEMA.values():
        expected_features.update(category_features)
    
    # Allow tenant_id_hash which is added by extractors
    expected_features.add("tenant_id_hash")
    
    provided_features = set(features.keys())
    
    # Check if all expected features are present
    missing = expected_features - provided_features
    extra = provided_features - expected_features
    
    if missing:
        return False
    
    return True
