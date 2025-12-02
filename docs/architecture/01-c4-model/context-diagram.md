# C4 Model - Context Diagram
## Nexora Autonomous Entity Defense Platform

### System Context
```mermaid
graph TB
    subgraph "External Actors"
        SecOps[Security Operations Teams]
        Auditors[Compliance Auditors]
        DevOps[DevOps Engineers]
        CISO[CISO/Security Leadership]
    end
    
    subgraph "External Systems"
        SIEM[SIEM Systems<br/>Splunk, Chronicle, QRadar]
        ThreatIntel[Threat Intelligence<br/>MISP, STIX/TAXII]
        CloudProviders[Cloud Providers<br/>AWS, Azure, GCP]
        IdentityProviders[Identity Providers<br/>Okta, Azure AD, Auth0]
        Ticketing[Ticketing Systems<br/>Jira, ServiceNow]
    end
    
    subgraph "Nexora Platform"
        NexoraPlatform[Nexora AED Platform<br/>Autonomous Entity Defense]
    end
    
    subgraph "Monitored Infrastructure"
        NHI[Non-Human Identities<br/>API Keys, Service Accounts,<br/>AI Agents, Bots]
        Applications[Applications & Services]
        Databases[Databases & Data Stores]
        Infrastructure[Cloud Infrastructure]
    end
    
    %% User Interactions
    SecOps --> NexoraPlatform
    Auditors --> NexoraPlatform
    DevOps --> NexoraPlatform
    CISO --> NexoraPlatform
    
    %% External System Integrations
    NexoraPlatform <--> SIEM
    NexoraPlatform <--> ThreatIntel
    NexoraPlatform <--> CloudProviders
    NexoraPlatform <--> IdentityProviders
    NexoraPlatform --> Ticketing
    
    %% Monitoring Relationships
    NexoraPlatform --> NHI
    NexoraPlatform --> Applications
    NexoraPlatform --> Databases
    NexoraPlatform --> Infrastructure
    
    classDef userClass fill:#e1f5fe
    classDef systemClass fill:#f3e5f5
    classDef nexoraClass fill:#e8f5e8
    classDef monitoredClass fill:#fff3e0
    
    class SecOps,Auditors,DevOps,CISO userClass
    class SIEM,ThreatIntel,CloudProviders,IdentityProviders,Ticketing systemClass
    class NexoraPlatform nexoraClass
    class NHI,Applications,Databases,Infrastructure monitoredClass
```

### Context Description

#### Primary Users
- **Security Operations Teams**: Monitor threats, investigate incidents, manage remediation
- **Compliance Auditors**: Review audit trails, generate compliance reports
- **DevOps Engineers**: Configure integrations, manage NHI lifecycle
- **CISO/Security Leadership**: Strategic oversight, risk assessment, policy management

#### External Systems Integration
- **SIEM Systems**: Bi-directional event sharing, correlation, and enrichment
- **Threat Intelligence**: Consume IOCs, TTPs, and share threat data via STIX/TAXII
- **Cloud Providers**: Monitor resources, manage identities, execute remediation
- **Identity Providers**: Federated authentication, user provisioning, SSO
- **Ticketing Systems**: Automated incident creation, workflow integration

#### Monitored Entities
- **Non-Human Identities**: API keys, service accounts, machine identities, AI agents
- **Applications & Services**: Microservices, APIs, web applications, mobile apps
- **Databases & Data Stores**: SQL/NoSQL databases, data lakes, caches
- **Cloud Infrastructure**: Compute, storage, networking, serverless functions

### Key Capabilities
1. **Real-time NHI Discovery**: Continuous scanning and inventory management
2. **Behavioral Analytics**: ML-based anomaly detection and risk scoring
3. **Autonomous Remediation**: Automated response with human approval workflows
4. **Threat Intelligence**: Global threat sharing and correlation
5. **Compliance Reporting**: Immutable audit trails and regulatory compliance
6. **Zero Trust Architecture**: Continuous verification and least privilege access
