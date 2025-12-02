# Data Flow - Threat Detection & Scoring Pipeline
## Real-time Anomaly Detection and Threat Scoring

### Overview
The Threat Detection Pipeline processes real-time events from NHI activities, applies ML-based anomaly detection, and generates threat scores with explainable reasoning. The system maintains <100ms latency for critical threat detection while processing 100K+ events/second.

### Real-time Threat Detection Flow
```mermaid
sequenceDiagram
    participant Events as Event Sources
    participant Kafka as Event Stream
    participant Analytics as Analytics Service
    participant ML as ML Engine
    participant Cache as Redis Cache
    participant TimescaleDB as TimescaleDB
    participant ThreatIntel as Threat Intel Service
    participant Alerts as Alert Manager
    participant Remediation as Remediation Service
    
    Note over Events: Real-time NHI Activity
    
    Events->>Kafka: Stream activity events
    Note over Kafka: Topics: nhi.activity, nhi.access, nhi.network
    
    Kafka->>Analytics: Consume events (real-time)
    Analytics->>Analytics: Event preprocessing
    Analytics->>Cache: Check entity baseline
    Cache-->>Analytics: Baseline profile
    
    Note over Analytics: Feature Extraction (<10ms)
    Analytics->>Analytics: Extract time-series features
    Analytics->>Analytics: Calculate deviation scores
    Analytics->>Analytics: Apply sliding window analysis
    
    Note over ML: Anomaly Detection (<50ms)
    Analytics->>ML: Request anomaly prediction
    ML->>Cache: Get cached model predictions
    alt Cache Miss
        ML->>ML: Run isolation forest model
        ML->>ML: Run OCSVM model
        ML->>ML: Ensemble predictions
        ML->>Cache: Cache prediction results
    end
    ML-->>Analytics: Anomaly scores + explanations
    
    Note over Analytics: Threat Scoring (<20ms)
    Analytics->>Analytics: Aggregate anomaly scores
    Analytics->>ThreatIntel: Query threat context
    ThreatIntel-->>Analytics: IOC matches + threat data
    Analytics->>Analytics: Calculate final threat score
    
    Note over Analytics: Risk Assessment
    alt High Risk (Score > 8.0)
        Analytics->>Alerts: Trigger critical alert
        Analytics->>Remediation: Auto-remediation candidate
        Analytics->>TimescaleDB: Store threat event
        Alerts->>Alerts: Notify security team
    else Medium Risk (Score 5.0-8.0)
        Analytics->>Alerts: Trigger warning alert
        Analytics->>TimescaleDB: Store threat event
    else Low Risk (Score < 5.0)
        Analytics->>TimescaleDB: Store for analysis
    end
    
    Note over Analytics: Continuous Learning
    Analytics->>ML: Update model features
    Analytics->>Cache: Update prediction cache
```

### ML-Based Anomaly Detection Architecture

#### Feature Engineering Pipeline
```mermaid
graph TB
    subgraph "Raw Events"
        AccessEvents[Access Events<br/>API calls, logins, permissions]
        NetworkEvents[Network Events<br/>Source IPs, endpoints, protocols]
        BehaviorEvents[Behavior Events<br/>Timing, frequency, patterns]
    end
    
    subgraph "Feature Extraction"
        TimeFeatures[Time Features<br/>Hour, day, frequency]
        LocationFeatures[Location Features<br/>IP geolocation, regions]
        SequenceFeatures[Sequence Features<br/>Action patterns, chains]
        StatisticalFeatures[Statistical Features<br/>Z-scores, percentiles]
    end
    
    subgraph "Feature Engineering"
        SlidingWindow[Sliding Window<br/>1min, 5min, 15min, 1hr]
        Aggregation[Aggregation<br/>Count, sum, avg, std]
        Normalization[Normalization<br/>Min-max, z-score]
        FeatureSelection[Feature Selection<br/>Top-K, correlation]
    end
    
    subgraph "ML Models"
        IsolationForest[Isolation Forest<br/>Unsupervised outlier detection]
        OCSVM[One-Class SVM<br/>Boundary-based detection]
        LSTM[LSTM Autoencoder<br/>Sequence anomalies]
        EnsembleModel[Ensemble Model<br/>Weighted voting]
    end
    
    AccessEvents --> TimeFeatures
    NetworkEvents --> LocationFeatures
    BehaviorEvents --> SequenceFeatures
    
    TimeFeatures --> SlidingWindow
    LocationFeatures --> SlidingWindow
    SequenceFeatures --> SlidingWindow
    
    SlidingWindow --> Aggregation
    Aggregation --> Normalization
    Normalization --> FeatureSelection
    FeatureSelection --> StatisticalFeatures
    
    StatisticalFeatures --> IsolationForest
    StatisticalFeatures --> OCSVM
    StatisticalFeatures --> LSTM
    
    IsolationForest --> EnsembleModel
    OCSVM --> EnsembleModel
    LSTM --> EnsembleModel
```

#### Anomaly Detection Models

##### 1. Isolation Forest
```python
# Model Configuration
isolation_forest_config = {
    "n_estimators": 200,
    "max_samples": "auto",
    "contamination": 0.1,
    "max_features": 1.0,
    "bootstrap": False,
    "random_state": 42
}

# Features for Isolation Forest
features = [
    "access_frequency_1h",
    "unique_endpoints_1h", 
    "permission_scope_deviation",
    "time_of_day_zscore",
    "source_ip_entropy",
    "api_call_pattern_deviation"
]
```

##### 2. One-Class SVM
```python
# Model Configuration
ocsvm_config = {
    "kernel": "rbf",
    "gamma": "scale",
    "nu": 0.05,
    "degree": 3,
    "coef0": 0.0
}

# Features for OCSVM
features = [
    "network_behavior_score",
    "permission_usage_pattern",
    "temporal_access_pattern",
    "resource_access_deviation",
    "authentication_pattern_score"
]
```

##### 3. LSTM Autoencoder
```python
# Model Architecture
lstm_autoencoder = {
    "sequence_length": 60,  # 1 hour of minute-level data
    "features": 15,
    "encoder_layers": [64, 32, 16],
    "decoder_layers": [16, 32, 64],
    "dropout": 0.2,
    "reconstruction_threshold": 0.95
}

# Sequence Features
sequence_features = [
    "api_calls_per_minute",
    "data_volume_per_minute",
    "error_rate_per_minute",
    "response_time_per_minute",
    "unique_resources_per_minute"
]
```

### Threat Scoring Algorithm

#### Multi-factor Threat Score Calculation
```mermaid
graph TB
    subgraph "Anomaly Scores"
        IFScore[Isolation Forest Score<br/>0.0 - 1.0]
        SVMScore[OCSVM Score<br/>0.0 - 1.0]
        LSTMScore[LSTM Reconstruction Error<br/>0.0 - 1.0]
    end
    
    subgraph "Context Scores"
        ThreatIntelScore[Threat Intel Score<br/>IOC matches, reputation]
        BaselineDeviation[Baseline Deviation<br/>Statistical significance]
        RiskFactors[Risk Factors<br/>Permissions, access scope]
    end
    
    subgraph "Weighted Ensemble"
        AnomalyEnsemble[Anomaly Ensemble<br/>Weighted average]
        ContextEnsemble[Context Ensemble<br/>Additive scoring]
        FinalScore[Final Threat Score<br/>0.0 - 10.0]
    end
    
    subgraph "Explainability"
        FeatureImportance[Feature Importance<br/>SHAP values]
        AnomalyExplanation[Anomaly Explanation<br/>Human-readable reasons]
        RecommendedActions[Recommended Actions<br/>Remediation suggestions]
    end
    
    IFScore --> AnomalyEnsemble
    SVMScore --> AnomalyEnsemble
    LSTMScore --> AnomalyEnsemble
    
    ThreatIntelScore --> ContextEnsemble
    BaselineDeviation --> ContextEnsemble
    RiskFactors --> ContextEnsemble
    
    AnomalyEnsemble --> FinalScore
    ContextEnsemble --> FinalScore
    
    FinalScore --> FeatureImportance
    FinalScore --> AnomalyExplanation
    FinalScore --> RecommendedActions
```

#### Threat Score Calculation Formula
```python
def calculate_threat_score(anomaly_scores, context_scores, entity_metadata):
    """
    Calculate final threat score with explainability
    
    Returns: (score: float, explanation: dict)
    """
    
    # Anomaly ensemble (weighted average)
    anomaly_weights = {
        'isolation_forest': 0.4,
        'ocsvm': 0.3,
        'lstm_autoencoder': 0.3
    }
    
    anomaly_score = sum(
        anomaly_scores[model] * weight 
        for model, weight in anomaly_weights.items()
    )
    
    # Context scoring (additive)
    context_score = (
        context_scores['threat_intel'] * 2.0 +
        context_scores['baseline_deviation'] * 1.5 +
        context_scores['risk_factors'] * 1.0
    )
    
    # Entity risk multiplier
    risk_multiplier = {
        'HIGH_PRIVILEGE': 1.5,
        'CROSS_ACCOUNT': 1.3,
        'EXTERNAL_ACCESS': 1.2,
        'STANDARD': 1.0
    }.get(entity_metadata['risk_level'], 1.0)
    
    # Final score (0-10 scale)
    raw_score = (anomaly_score * 5.0) + context_score
    final_score = min(raw_score * risk_multiplier, 10.0)
    
    # Generate explanation
    explanation = generate_explanation(
        anomaly_scores, context_scores, 
        entity_metadata, final_score
    )
    
    return final_score, explanation
```

### Event Schema

#### Activity Events
```json
{
  "event_type": "nhi.activity",
  "timestamp": "2024-01-15T14:23:45.123Z",
  "tenant_id": "tenant_123",
  "entity_id": "entity_456",
  "activity": {
    "type": "api_call",
    "endpoint": "/api/v1/sensitive-data",
    "method": "GET",
    "response_code": 200,
    "response_time_ms": 245,
    "data_volume_bytes": 1048576,
    "source_ip": "203.0.113.42",
    "user_agent": "python-requests/2.28.1",
    "authentication_method": "api_key"
  },
  "context": {
    "geolocation": {
      "country": "US",
      "region": "California",
      "city": "San Francisco",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "network": {
      "asn": "AS13335",
      "organization": "Cloudflare",
      "is_tor": false,
      "is_vpn": false
    }
  }
}
```

#### Threat Detection Results
```json
{
  "event_type": "threat.detected",
  "timestamp": "2024-01-15T14:23:46.789Z",
  "tenant_id": "tenant_123",
  "entity_id": "entity_456",
  "threat_score": 8.7,
  "risk_level": "HIGH",
  "anomaly_scores": {
    "isolation_forest": 0.92,
    "ocsvm": 0.85,
    "lstm_autoencoder": 0.78
  },
  "context_scores": {
    "threat_intel": 2.1,
    "baseline_deviation": 3.2,
    "risk_factors": 1.8
  },
  "explanation": {
    "primary_reasons": [
      "Unusual access time (3 std deviations from baseline)",
      "New source IP address not seen in 30 days",
      "Accessing sensitive endpoints outside normal pattern"
    ],
    "contributing_factors": [
      "High-privilege entity",
      "Cross-account access permissions",
      "No recent authentication"
    ],
    "feature_importance": {
      "time_of_day_zscore": 0.35,
      "source_ip_entropy": 0.28,
      "endpoint_sensitivity": 0.22,
      "access_frequency": 0.15
    }
  },
  "recommended_actions": [
    "Require re-authentication",
    "Temporarily restrict permissions",
    "Notify security team",
    "Monitor for 24 hours"
  ]
}
```

### Performance Optimization

#### Caching Strategy
```yaml
Cache Layers:
  L1_Cache: # Hot data (Redis)
    - Entity baselines (TTL: 1 hour)
    - ML model predictions (TTL: 5 minutes)
    - Threat intel IOCs (TTL: 15 minutes)
    
  L2_Cache: # Warm data (Redis)
    - Historical patterns (TTL: 24 hours)
    - Feature vectors (TTL: 6 hours)
    - Model artifacts (TTL: 7 days)
    
  L3_Cache: # Cold data (TimescaleDB)
    - Raw events (Retention: 7 years)
    - Aggregated metrics (Retention: 2 years)
    - Model training data (Retention: 1 year)

Cache Invalidation:
  - Baseline updates trigger cache refresh
  - Model retraining invalidates prediction cache
  - Threat intel updates trigger IOC cache refresh
```

#### Stream Processing Optimization
```yaml
Kafka Configuration:
  Partitions: 32 per topic
  Replication Factor: 3
  Batch Size: 16KB
  Linger MS: 5
  Compression: snappy
  
Consumer Configuration:
  Max Poll Records: 1000
  Fetch Min Bytes: 1KB
  Fetch Max Wait: 10ms
  Auto Commit: false
  
Processing Guarantees:
  - At-least-once delivery
  - Idempotent processing
  - Exactly-once semantics for critical paths
```
