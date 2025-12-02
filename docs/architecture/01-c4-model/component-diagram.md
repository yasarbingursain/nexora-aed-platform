# C4 Model - Component Diagram
## Core Services Component Architecture

### Discovery Service Components
```mermaid
graph TB
    subgraph "Discovery Service"
        subgraph "API Layer"
            DiscoveryAPI[Discovery REST API<br/>Express.js Router<br/>CRUD operations]
            DiscoveryGRPC[Discovery gRPC Server<br/>High-performance scanning]
        end
        
        subgraph "Business Logic"
            ScanOrchestrator[Scan Orchestrator<br/>Manages scan workflows]
            BaselineEngine[Baseline Engine<br/>Establishes normal behavior]
            InventoryManager[Inventory Manager<br/>NHI lifecycle management]
            RiskCalculator[Risk Calculator<br/>Threat scoring engine]
        end
        
        subgraph "Connectors"
            AWSConnector[AWS Connector<br/>IAM, STS, Secrets Manager]
            AzureConnector[Azure Connector<br/>AD, Key Vault, ARM]
            GCPConnector[GCP Connector<br/>IAM, Secret Manager]
            K8sConnector[Kubernetes Connector<br/>Service Accounts, Secrets]
            GitHubConnector[GitHub Connector<br/>Apps, Actions, Tokens]
        end
        
        subgraph "Data Access"
            EntityRepository[Entity Repository<br/>PostgreSQL + Graph queries]
            EventPublisher[Event Publisher<br/>Kafka producer]
            CacheManager[Cache Manager<br/>Redis operations]
        end
    end
    
    %% API to Business Logic
    DiscoveryAPI --> ScanOrchestrator
    DiscoveryAPI --> InventoryManager
    DiscoveryGRPC --> ScanOrchestrator
    DiscoveryGRPC --> BaselineEngine
    
    %% Business Logic interactions
    ScanOrchestrator --> AWSConnector
    ScanOrchestrator --> AzureConnector
    ScanOrchestrator --> GCPConnector
    ScanOrchestrator --> K8sConnector
    ScanOrchestrator --> GitHubConnector
    
    BaselineEngine --> EntityRepository
    BaselineEngine --> CacheManager
    InventoryManager --> EntityRepository
    InventoryManager --> EventPublisher
    RiskCalculator --> EntityRepository
    RiskCalculator --> CacheManager
    
    %% Data flow
    ScanOrchestrator --> EntityRepository
    ScanOrchestrator --> EventPublisher
    
    classDef apiClass fill:#e1f5fe
    classDef businessClass fill:#e8f5e8
    classDef connectorClass fill:#fff3e0
    classDef dataClass fill:#f3e5f5
    
    class DiscoveryAPI,DiscoveryGRPC apiClass
    class ScanOrchestrator,BaselineEngine,InventoryManager,RiskCalculator businessClass
    class AWSConnector,AzureConnector,GCPConnector,K8sConnector,GitHubConnector connectorClass
    class EntityRepository,EventPublisher,CacheManager dataClass
```

### Analytics Service Components
```mermaid
graph TB
    subgraph "Analytics Service"
        subgraph "API Layer"
            AnalyticsAPI[Analytics REST API<br/>FastAPI + Pydantic<br/>ML model endpoints]
            StreamingAPI[Streaming API<br/>WebSocket + Server-Sent Events]
        end
        
        subgraph "ML Pipeline"
            FeatureExtractor[Feature Extractor<br/>Time-series features]
            AnomalyDetector[Anomaly Detector<br/>Isolation Forest + OCSVM]
            BehaviorAnalyzer[Behavior Analyzer<br/>Statistical models]
            ThreatScorer[Threat Scorer<br/>Risk aggregation]
            ModelTrainer[Model Trainer<br/>Continuous learning]
        end
        
        subgraph "Real-time Processing"
            EventProcessor[Event Processor<br/>Kafka consumer]
            StreamProcessor[Stream Processor<br/>Sliding window analysis]
            AlertManager[Alert Manager<br/>Threshold monitoring]
        end
        
        subgraph "Data Access"
            TimeseriesRepository[Timeseries Repository<br/>TimescaleDB queries]
            ModelRepository[Model Repository<br/>MLflow + Redis cache]
            PredictionCache[Prediction Cache<br/>Hot predictions]
        end
    end
    
    %% API to ML Pipeline
    AnalyticsAPI --> FeatureExtractor
    AnalyticsAPI --> AnomalyDetector
    AnalyticsAPI --> BehaviorAnalyzer
    StreamingAPI --> AlertManager
    
    %% ML Pipeline flow
    FeatureExtractor --> AnomalyDetector
    AnomalyDetector --> BehaviorAnalyzer
    BehaviorAnalyzer --> ThreatScorer
    ModelTrainer --> AnomalyDetector
    ModelTrainer --> BehaviorAnalyzer
    
    %% Real-time processing
    EventProcessor --> StreamProcessor
    StreamProcessor --> FeatureExtractor
    StreamProcessor --> AlertManager
    AlertManager --> StreamingAPI
    
    %% Data access
    FeatureExtractor --> TimeseriesRepository
    AnomalyDetector --> ModelRepository
    AnomalyDetector --> PredictionCache
    BehaviorAnalyzer --> TimeseriesRepository
    ThreatScorer --> PredictionCache
    ModelTrainer --> ModelRepository
    
    classDef apiClass fill:#e1f5fe
    classDef mlClass fill:#e8f5e8
    classDef streamClass fill:#fff3e0
    classDef dataClass fill:#f3e5f5
    
    class AnalyticsAPI,StreamingAPI apiClass
    class FeatureExtractor,AnomalyDetector,BehaviorAnalyzer,ThreatScorer,ModelTrainer mlClass
    class EventProcessor,StreamProcessor,AlertManager streamClass
    class TimeseriesRepository,ModelRepository,PredictionCache dataClass
```

### Remediation Service Components
```mermaid
graph TB
    subgraph "Remediation Service"
        subgraph "API Layer"
            RemediationAPI[Remediation REST API<br/>Express.js + Joi validation]
            WorkflowAPI[Workflow API<br/>BPMN engine integration]
        end
        
        subgraph "Workflow Engine"
            WorkflowOrchestrator[Workflow Orchestrator<br/>Zeebe BPMN engine]
            ActionExecutor[Action Executor<br/>Remediation actions]
            ApprovalManager[Approval Manager<br/>Human-in-the-loop]
            RollbackManager[Rollback Manager<br/>Action reversal]
        end
        
        subgraph "Action Types"
            RotateAction[Rotate Action<br/>Credential rotation]
            QuarantineAction[Quarantine Action<br/>Access suspension]
            DeceptionAction[Deception Action<br/>Honeypot deployment]
            NotificationAction[Notification Action<br/>Alert dispatch]
        end
        
        subgraph "Integrations"
            CloudIntegrator[Cloud Integrator<br/>Multi-cloud actions]
            SIEMIntegrator[SIEM Integrator<br/>Event forwarding]
            TicketingIntegrator[Ticketing Integrator<br/>Incident creation]
        end
        
        subgraph "Data Access"
            WorkflowRepository[Workflow Repository<br/>PostgreSQL state]
            ActionRepository[Action Repository<br/>Execution history]
            EventPublisher[Event Publisher<br/>Kafka producer]
        end
    end
    
    %% API to Workflow Engine
    RemediationAPI --> WorkflowOrchestrator
    RemediationAPI --> ApprovalManager
    WorkflowAPI --> WorkflowOrchestrator
    
    %% Workflow Engine interactions
    WorkflowOrchestrator --> ActionExecutor
    WorkflowOrchestrator --> ApprovalManager
    ActionExecutor --> RotateAction
    ActionExecutor --> QuarantineAction
    ActionExecutor --> DeceptionAction
    ActionExecutor --> NotificationAction
    ApprovalManager --> RollbackManager
    
    %% Action execution
    RotateAction --> CloudIntegrator
    QuarantineAction --> CloudIntegrator
    DeceptionAction --> CloudIntegrator
    NotificationAction --> SIEMIntegrator
    NotificationAction --> TicketingIntegrator
    
    %% Data persistence
    WorkflowOrchestrator --> WorkflowRepository
    ActionExecutor --> ActionRepository
    ActionExecutor --> EventPublisher
    RollbackManager --> ActionRepository
    
    classDef apiClass fill:#e1f5fe
    classDef workflowClass fill:#e8f5e8
    classDef actionClass fill:#fff3e0
    classDef integrationClass fill:#f3e5f5
    classDef dataClass fill:#fce4ec
    
    class RemediationAPI,WorkflowAPI apiClass
    class WorkflowOrchestrator,ActionExecutor,ApprovalManager,RollbackManager workflowClass
    class RotateAction,QuarantineAction,DeceptionAction,NotificationAction actionClass
    class CloudIntegrator,SIEMIntegrator,TicketingIntegrator integrationClass
    class WorkflowRepository,ActionRepository,EventPublisher dataClass
```

### Component Design Principles

#### Separation of Concerns
- **API Layer**: Request validation, authentication, response formatting
- **Business Logic**: Core domain logic, business rules, orchestration
- **Data Access**: Repository pattern, caching, event publishing
- **External Integrations**: Adapter pattern for third-party systems

#### Dependency Injection
- Constructor injection for testability
- Interface-based abstractions
- Configuration-driven implementations
- Mock-friendly for unit testing

#### Error Handling
- Structured error responses
- Circuit breaker patterns
- Retry mechanisms with exponential backoff
- Dead letter queues for failed operations

#### Performance Optimization
- Connection pooling for databases
- Async/await for I/O operations
- Caching at multiple layers
- Batch processing for bulk operations

#### Security Integration
- Input validation at API boundaries
- Authorization checks in business logic
- Secure credential handling
- Audit logging for all operations

### Technology Choices by Component

#### Discovery Service (Go)
- **Rationale**: High-performance concurrent scanning, strong typing
- **Frameworks**: Gin (HTTP), gRPC-Go, GORM (ORM)
- **Libraries**: AWS SDK, Azure SDK, GCP SDK, Kubernetes client-go

#### Analytics Service (Python)
- **Rationale**: Rich ML ecosystem, scientific computing libraries
- **Frameworks**: FastAPI, Pydantic, SQLAlchemy
- **Libraries**: scikit-learn, pandas, numpy, MLflow

#### Remediation Service (Node.js)
- **Rationale**: Event-driven architecture, JSON handling, rapid development
- **Frameworks**: Express.js, Joi validation, Zeebe Node.js client
- **Libraries**: AWS SDK, Azure SDK, node-cron, bull queue
