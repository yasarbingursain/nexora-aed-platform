# Data Flow - NHI Discovery Pipeline
## Non-Human Identity Discovery and Inventory Management

### Overview
The NHI Discovery Pipeline continuously scans cloud environments, applications, and services to identify, catalog, and monitor non-human identities including API keys, service accounts, machine identities, and AI agents.

### Discovery Pipeline Flow
```mermaid
sequenceDiagram
    participant Scheduler as Scan Scheduler
    participant Discovery as Discovery Service
    participant Connectors as Cloud Connectors
    participant Baseline as Baseline Engine
    participant DB as PostgreSQL
    participant TimescaleDB as TimescaleDB
    participant Cache as Redis Cache
    participant Kafka as Event Stream
    participant Analytics as Analytics Service
    
    Note over Scheduler: Scheduled Discovery (Every 15 minutes)
    
    Scheduler->>Discovery: Trigger tenant scan
    Discovery->>DB: Get tenant configuration
    DB-->>Discovery: Scan targets & credentials
    
    loop For each cloud provider
        Discovery->>Connectors: Initiate scan (AWS/Azure/GCP)
        Connectors->>Connectors: Authenticate with provider
        
        Note over Connectors: Parallel scanning
        par AWS Scanning
            Connectors->>Connectors: Scan IAM users/roles
            Connectors->>Connectors: Scan service accounts
            Connectors->>Connectors: Scan API keys
            Connectors->>Connectors: Scan Lambda functions
        and Azure Scanning
            Connectors->>Connectors: Scan AD service principals
            Connectors->>Connectors: Scan managed identities
            Connectors->>Connectors: Scan key vault secrets
            Connectors->>Connectors: Scan function apps
        and GCP Scanning
            Connectors->>Connectors: Scan service accounts
            Connectors->>Connectors: Scan API keys
            Connectors->>Connectors: Scan Cloud Functions
        end
        
        Connectors-->>Discovery: Return discovered entities
    end
    
    Discovery->>Discovery: Deduplicate & normalize entities
    Discovery->>DB: Upsert entity inventory
    Discovery->>TimescaleDB: Store discovery events
    
    Note over Discovery: Entity Classification
    Discovery->>Discovery: Classify entity types
    Discovery->>Discovery: Calculate risk scores
    Discovery->>Cache: Cache entity metadata
    
    Note over Discovery: Baseline Establishment
    Discovery->>Baseline: Request baseline analysis
    Baseline->>TimescaleDB: Query historical behavior
    Baseline->>Baseline: Calculate behavioral baselines
    Baseline->>Cache: Cache baseline profiles
    Baseline-->>Discovery: Return baseline data
    
    Note over Discovery: Event Publishing
    Discovery->>Kafka: Publish nhi.discovered events
    Discovery->>Kafka: Publish nhi.updated events
    Discovery->>Kafka: Publish nhi.risk_scored events
    
    Note over Analytics: Real-time Processing
    Kafka-->>Analytics: Consume discovery events
    Analytics->>Analytics: Update ML features
    Analytics->>Analytics: Trigger anomaly detection
    Analytics->>Cache: Update prediction cache
```

### Entity Discovery Process

#### 1. Scan Orchestration
```mermaid
graph TB
    subgraph "Scan Orchestration"
        ScanScheduler[Scan Scheduler<br/>Cron-based triggers]
        TenantConfig[Tenant Configuration<br/>Scan targets & credentials]
        ScanManager[Scan Manager<br/>Parallel execution]
    end
    
    subgraph "Cloud Connectors"
        AWSConnector[AWS Connector<br/>IAM, STS, Secrets Manager]
        AzureConnector[Azure Connector<br/>AD, Key Vault, ARM]
        GCPConnector[GCP Connector<br/>IAM, Secret Manager]
        K8sConnector[Kubernetes Connector<br/>Service Accounts, Secrets]
    end
    
    subgraph "Discovery Results"
        EntityNormalizer[Entity Normalizer<br/>Common schema]
        Deduplicator[Deduplicator<br/>Cross-provider matching]
        RiskScorer[Risk Scorer<br/>Initial risk assessment]
    end
    
    ScanScheduler --> TenantConfig
    TenantConfig --> ScanManager
    ScanManager --> AWSConnector
    ScanManager --> AzureConnector
    ScanManager --> GCPConnector
    ScanManager --> K8sConnector
    
    AWSConnector --> EntityNormalizer
    AzureConnector --> EntityNormalizer
    GCPConnector --> EntityNormalizer
    K8sConnector --> EntityNormalizer
    
    EntityNormalizer --> Deduplicator
    Deduplicator --> RiskScorer
```

#### 2. Entity Classification
```yaml
Entity Types:
  API_KEY:
    - REST API keys
    - GraphQL tokens
    - Third-party service keys
    
  SERVICE_ACCOUNT:
    - Cloud service accounts (AWS IAM roles, Azure managed identities)
    - Kubernetes service accounts
    - Database service users
    
  MACHINE_IDENTITY:
    - X.509 certificates
    - SSH keys
    - Kerberos principals
    
  AI_AGENT:
    - LLM API tokens
    - Autonomous agents
    - Chatbot credentials
    
  BOT_ACCOUNT:
    - CI/CD pipeline tokens
    - Monitoring service accounts
    - Automation scripts

Risk Factors:
  HIGH_RISK:
    - Admin privileges
    - Cross-account access
    - No rotation policy
    - Unused for >90 days
    
  MEDIUM_RISK:
    - Limited scope access
    - Infrequent usage
    - Shared credentials
    
  LOW_RISK:
    - Read-only access
    - Regular rotation
    - Scoped permissions
```

### Baseline Establishment

#### Behavioral Baseline Calculation
```mermaid
graph TB
    subgraph "Baseline Engine"
        HistoricalAnalysis[Historical Analysis<br/>30-day lookback]
        PatternDetection[Pattern Detection<br/>Usage patterns]
        BaselineCalculation[Baseline Calculation<br/>Statistical models]
    end
    
    subgraph "Baseline Metrics"
        AccessPatterns[Access Patterns<br/>Time, location, frequency]
        PermissionUsage[Permission Usage<br/>API calls, resource access]
        NetworkBehavior[Network Behavior<br/>Source IPs, endpoints]
        DataAccess[Data Access<br/>Databases, files, APIs]
    end
    
    subgraph "Baseline Storage"
        BaselineProfiles[Baseline Profiles<br/>Per-entity baselines]
        ThresholdConfig[Threshold Configuration<br/>Anomaly detection limits]
        BaselineCache[Baseline Cache<br/>Hot baseline data]
    end
    
    HistoricalAnalysis --> PatternDetection
    PatternDetection --> BaselineCalculation
    
    BaselineCalculation --> AccessPatterns
    BaselineCalculation --> PermissionUsage
    BaselineCalculation --> NetworkBehavior
    BaselineCalculation --> DataAccess
    
    AccessPatterns --> BaselineProfiles
    PermissionUsage --> BaselineProfiles
    NetworkBehavior --> BaselineProfiles
    DataAccess --> BaselineProfiles
    
    BaselineProfiles --> ThresholdConfig
    BaselineProfiles --> BaselineCache
```

### Event Schema

#### Discovery Events
```json
{
  "event_type": "nhi.discovered",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "tenant_123",
  "entity": {
    "id": "entity_456",
    "type": "SERVICE_ACCOUNT",
    "provider": "AWS",
    "name": "lambda-execution-role",
    "arn": "arn:aws:iam::123456789012:role/lambda-execution-role",
    "created_at": "2024-01-10T08:00:00Z",
    "last_used": "2024-01-15T09:45:00Z",
    "permissions": [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ],
    "risk_score": 3.2,
    "risk_factors": ["unused_permissions", "broad_scope"]
  },
  "discovery_metadata": {
    "scan_id": "scan_789",
    "connector": "aws-iam",
    "discovery_method": "api_scan"
  }
}
```

#### Baseline Events
```json
{
  "event_type": "nhi.baseline_established",
  "timestamp": "2024-01-15T10:35:00Z",
  "tenant_id": "tenant_123",
  "entity_id": "entity_456",
  "baseline": {
    "access_pattern": {
      "typical_hours": [9, 10, 11, 14, 15, 16],
      "typical_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "frequency_per_hour": 12.5,
      "variance": 2.1
    },
    "network_behavior": {
      "typical_source_ips": ["10.0.1.100", "10.0.1.101"],
      "typical_regions": ["us-east-1"],
      "endpoint_patterns": ["/api/v1/data", "/api/v1/logs"]
    },
    "permission_usage": {
      "used_permissions": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "unused_permissions": ["logs:CreateLogGroup"],
      "usage_frequency": {"logs:CreateLogStream": 0.8, "logs:PutLogEvents": 0.9}
    }
  }
}
```

### Performance Characteristics

#### Scalability Targets
- **Discovery Rate**: 10,000 entities/minute per connector
- **Concurrent Scans**: 50 parallel tenant scans
- **Event Throughput**: 100K events/second
- **Baseline Calculation**: <5 minutes for new entities

#### Optimization Strategies
- **Incremental Scanning**: Only scan changed resources
- **Caching**: Redis cache for entity metadata and baselines
- **Batch Processing**: Bulk database operations
- **Connection Pooling**: Reuse cloud provider connections
- **Rate Limiting**: Respect cloud provider API limits
