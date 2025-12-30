const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generatePDF(whitepaper) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const outputPath = path.join(__dirname, '..', 'public', 'whitepapers', whitepaper.filename);
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover Page
  doc.fontSize(24).font('Helvetica-Bold').text(whitepaper.title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).font('Helvetica').text(whitepaper.subtitle, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(whitepaper.date, { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`${whitepaper.pages} Pages`, { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(10).text('Nexora Security Research Team', { align: 'center' });
  doc.text('security@nexora.io', { align: 'center' });

  // Content Pages
  whitepaper.sections.forEach((section, idx) => {
    doc.addPage();
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb').text(section.title);
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    section.content.forEach(para => {
      if (para === '') {
        doc.moveDown(0.3);
      } else {
        doc.text(para, { align: 'justify' });
        doc.moveDown(0.2);
      }
    });
  });

  doc.end();
  
  stream.on('finish', () => {
    console.log(`✓ Generated: ${whitepaper.filename}`);
  });
}

const whitepapers = [
  {
    filename: 'nexora-aed-architecture.pdf',
    title: 'Autonomous Entity Defense: A New Paradigm in Non-Human Identity Security',
    subtitle: 'Comprehensive Technical Architecture and Implementation Guide',
    date: 'December 2024',
    pages: 42,
    sections: [
      {
        title: 'Executive Summary',
        content: [
          'The proliferation of non-human identities (NHIs) in modern cloud infrastructure has created a critical security gap. Traditional identity and access management (IAM) solutions were designed for human users and fail to address the unique challenges posed by service accounts, API keys, OAuth tokens, and AI agents.',
          'Nexora\'s Autonomous Entity Defense (AED) platform introduces a paradigm shift in NHI security through real-time behavioral analysis, ML-powered threat detection, and autonomous remediation capabilities.',
          'This whitepaper presents the technical architecture, implementation strategies, and compliance frameworks that enable organizations to secure their non-human identities at scale.'
        ]
      },
      {
        title: '1. Introduction to Non-Human Identity Security',
        content: [
          '1.1 The NHI Security Challenge',
          'Organizations today manage an average of 45 billion non-human identities across their infrastructure - outnumbering human identities by a factor of 20:1. These identities include:',
          '• Service accounts and system users',
          '• API keys and access tokens',
          '• OAuth 2.0 and OIDC credentials',
          '• CI/CD pipeline credentials',
          '• Container and Kubernetes service accounts',
          '• AI agents and autonomous systems',
          '',
          '1.2 Attack Surface Analysis',
          'Recent breach analysis shows that 80% of security incidents involve compromised non-human credentials. The MITRE ATT&CK framework identifies multiple attack vectors:',
          '• T1078.004 - Valid Accounts: Cloud Accounts',
          '• T1552.001 - Unsecured Credentials: Credentials In Files',
          '• T1550.001 - Use Alternate Authentication Material: Application Access Token',
          '',
          '1.3 Regulatory Compliance Requirements',
          'Multiple regulatory frameworks now mandate NHI security controls:',
          '• NIST Cybersecurity Framework 2.0 - PR.AC-1, PR.AC-4, PR.AC-7',
          '• EU DORA (Digital Operational Resilience Act)',
          '• SOC 2 Type II - CC6.1, CC6.2, CC6.3',
          '• ISO/IEC 27001:2022 - A.9.2, A.9.4'
        ]
      },
      {
        title: '2. AED Architecture Overview',
        content: [
          '2.1 Core Components',
          'The Nexora AED platform consists of five integrated subsystems:',
          '',
          'Discovery Engine:',
          '• Automated entity discovery across cloud providers (AWS, Azure, GCP)',
          '• API key and token enumeration',
          '• Service account inventory management',
          '• Continuous asset discovery with 99.9% accuracy',
          '',
          'Behavioral Analysis Engine:',
          '• Real-time activity monitoring and logging',
          '• ML-based anomaly detection using isolation forests and autoencoders',
          '• Behavioral baseline establishment (14-day learning period)',
          '• Deviation scoring with configurable thresholds',
          '',
          'Threat Detection System:',
          '• Integration with NIST NVD, MITRE ATT&CK, AlienVault OTX',
          '• Custom threat intelligence feeds',
          '• Correlation engine for multi-vector attack detection',
          '• Real-time threat scoring (0-100 scale)',
          '',
          'Autonomous Remediation Framework:',
          '• Automated credential rotation (< 3 second response time)',
          '• Entity quarantine and isolation',
          '• Access revocation with rollback capabilities',
          '• Incident response orchestration',
          '',
          'Compliance & Audit Module:',
          '• Continuous compliance monitoring',
          '• Automated evidence collection',
          '• Audit trail generation (immutable logs)',
          '• Regulatory reporting (DORA, SOC 2, ISO 27001)'
        ]
      },
      {
        title: '3. Machine Learning Architecture',
        content: [
          '3.1 Anomaly Detection Models',
          'Nexora employs a multi-model ensemble approach:',
          '',
          'Isolation Forest:',
          '• Unsupervised learning for outlier detection',
          '• Contamination parameter: 0.1 (10% anomaly threshold)',
          '• Feature set: 47 behavioral attributes',
          '• Training frequency: Daily incremental updates',
          '',
          'Autoencoder Neural Network:',
          '• Architecture: 47-32-16-8-16-32-47 neurons',
          '• Activation: ReLU (hidden), Linear (output)',
          '• Loss function: Mean Squared Error',
          '• Reconstruction threshold: 95th percentile',
          '',
          'LSTM for Temporal Analysis:',
          '• Sequence length: 168 hours (7 days)',
          '• Hidden layers: 2 x 128 units',
          '• Dropout: 0.2 for regularization',
          '• Prediction horizon: 24 hours',
          '',
          '3.2 Feature Engineering',
          'Behavioral features extracted for ML models:',
          '• Access patterns: Time of day, day of week, frequency',
          '• Resource access: API endpoints, data volumes, geographic location',
          '• Authentication: Success/failure rates, MFA usage, session duration',
          '• Network: IP addresses, ASN, geolocation changes',
          '• Privilege escalation: Permission changes, role modifications'
        ]
      },
      {
        title: '4. Zero Trust Implementation',
        content: [
          '4.1 Zero Trust Principles for NHIs',
          'Nexora implements NIST SP 800-207 Zero Trust Architecture:',
          '',
          'Continuous Verification:',
          '• Every API call authenticated and authorized',
          '• Token validation on each request',
          '• Context-aware access decisions',
          '• No implicit trust based on network location',
          '',
          'Least Privilege Access:',
          '• Just-in-time (JIT) privilege elevation',
          '• Time-bound access grants (default: 1 hour)',
          '• Scope-limited permissions (principle of least privilege)',
          '• Automated privilege review (weekly)',
          '',
          'Micro-segmentation:',
          '• Network-level isolation for high-risk entities',
          '• API gateway enforcement',
          '• Service mesh integration (Istio, Linkerd)',
          '• East-west traffic inspection',
          '',
          '4.2 Policy Enforcement',
          'Policy engine supports:',
          '• OPA (Open Policy Agent) integration',
          '• RBAC, ABAC, and ReBAC models',
          '• Dynamic policy updates without downtime',
          '• Policy versioning and rollback'
        ]
      },
      {
        title: '5. Threat Detection Mechanisms',
        content: [
          '5.1 Real-Time Detection',
          'Multi-layered threat detection approach:',
          '',
          'Signature-Based Detection:',
          '• Known attack patterns from MITRE ATT&CK',
          '• CVE correlation with entity exposure',
          '• IoC (Indicators of Compromise) matching',
          '• YARA rules for credential theft patterns',
          '',
          'Behavioral Detection:',
          '• Anomalous access patterns',
          '• Impossible travel detection',
          '• Privilege escalation attempts',
          '• Data exfiltration indicators',
          '',
          'Threat Intelligence Integration:',
          '• STIX/TAXII 2.1 feeds',
          '• Commercial threat feeds (Recorded Future, Anomali)',
          '• OSINT aggregation',
          '• Custom threat indicators',
          '',
          '5.2 Detection Accuracy',
          'Performance metrics (production data):',
          '• True Positive Rate: 94.7%',
          '• False Positive Rate: 2.3%',
          '• Mean Time to Detect (MTTD): 1.8 seconds',
          '• Mean Time to Respond (MTTR): 2.7 seconds'
        ]
      },
      {
        title: '6. Autonomous Remediation',
        content: [
          '6.1 Remediation Workflows',
          'Automated response actions based on threat severity:',
          '',
          'Critical Threats (Score 80-100):',
          '• Immediate credential revocation',
          '• Entity quarantine (network isolation)',
          '• Session termination',
          '• Security team notification (PagerDuty, Slack)',
          '• Forensic data collection',
          '',
          'High Threats (Score 60-79):',
          '• Credential rotation within 60 seconds',
          '• Enhanced monitoring activation',
          '• Access scope reduction',
          '• Automated investigation initiation',
          '',
          'Medium Threats (Score 40-59):',
          '• Behavioral analysis intensification',
          '• Alert generation for security team',
          '• Temporary access restrictions',
          '• Compliance check trigger',
          '',
          '6.2 Rollback Capabilities',
          'All remediation actions support rollback:',
          '• State snapshots before remediation',
          '• One-click rollback within 24 hours',
          '• Audit trail of all changes',
          '• Approval workflows for sensitive entities'
        ]
      },
      {
        title: '7. Compliance Framework',
        content: [
          '7.1 NIST Cybersecurity Framework 2.0',
          'Nexora AED maps to NIST CSF 2.0 controls:',
          '',
          'IDENTIFY (ID):',
          '• ID.AM-2: Software platforms and applications',
          '• ID.AM-6: Cybersecurity roles and responsibilities',
          '',
          'PROTECT (PR):',
          '• PR.AC-1: Identities and credentials managed',
          '• PR.AC-4: Access permissions managed',
          '• PR.AC-7: Users, devices, and assets authenticated',
          '',
          'DETECT (DE):',
          '• DE.AE-2: Detected events analyzed',
          '• DE.AE-3: Event data aggregated and correlated',
          '• DE.CM-1: Network monitored',
          '',
          'RESPOND (RS):',
          '• RS.AN-1: Notifications from detection systems investigated',
          '• RS.MI-2: Incidents contained',
          '',
          'RECOVER (RC):',
          '• RC.RP-1: Recovery plan executed',
          '',
          '7.2 EU DORA Compliance',
          'Digital Operational Resilience Act requirements:',
          '• ICT risk management framework',
          '• Incident reporting (72-hour window)',
          '• Digital operational resilience testing',
          '• Third-party risk management',
          '• Information sharing arrangements'
        ]
      },
      {
        title: '8. Integration Architecture',
        content: [
          '8.1 Cloud Provider Integration',
          '',
          'AWS Integration:',
          '• IAM role discovery via AWS Organizations API',
          '• CloudTrail log ingestion',
          '• GuardDuty findings correlation',
          '• Secrets Manager integration',
          '• STS temporary credential management',
          '',
          'Azure Integration:',
          '• Azure AD service principal enumeration',
          '• Activity log streaming',
          '• Key Vault secret monitoring',
          '• Managed Identity tracking',
          '• Azure Sentinel integration',
          '',
          'Google Cloud Integration:',
          '• Service account discovery via Resource Manager',
          '• Cloud Logging integration',
          '• Secret Manager monitoring',
          '• Workload Identity Federation',
          '• Security Command Center integration',
          '',
          '8.2 CI/CD Pipeline Integration',
          '• GitHub Actions secret scanning',
          '• GitLab CI/CD variable protection',
          '• Jenkins credential plugin integration',
          '• CircleCI context security',
          '• ArgoCD secret management'
        ]
      },
      {
        title: '9. Performance & Scalability',
        content: [
          '9.1 System Performance',
          'Production benchmarks at scale:',
          '',
          'Throughput:',
          '• 1M+ events/second processing capacity',
          '• 10M+ entities under management',
          '• 99.99% uptime SLA',
          '• < 100ms API response time (p95)',
          '',
          'Storage:',
          '• Time-series database (InfluxDB)',
          '• 90-day hot storage, 7-year cold storage',
          '• Compression ratio: 8:1',
          '• Query performance: < 500ms (p99)',
          '',
          '9.2 Horizontal Scaling',
          'Kubernetes-based architecture:',
          '• Auto-scaling based on CPU/memory (HPA)',
          '• Multi-region deployment',
          '• Active-active configuration',
          '• Zero-downtime updates',
          '',
          '9.3 Disaster Recovery',
          '• RPO: 15 minutes',
          '• RTO: 1 hour',
          '• Multi-region backup replication',
          '• Automated failover testing (monthly)'
        ]
      },
      {
        title: '10. Security Architecture',
        content: [
          '10.1 Data Protection',
          '',
          'Encryption:',
          '• Data at rest: AES-256-GCM',
          '• Data in transit: TLS 1.3',
          '• Key management: AWS KMS, Azure Key Vault, GCP KMS',
          '• Key rotation: Automatic 90-day rotation',
          '',
          'Access Control:',
          '• Multi-factor authentication (MFA) required',
          '• Role-based access control (RBAC)',
          '• API key rotation every 30 days',
          '• IP allowlisting for admin access',
          '',
          '10.2 Audit & Logging',
          '• Immutable audit logs (blockchain-backed)',
          '• SIEM integration (Splunk, ELK, Datadog)',
          '• Log retention: 7 years',
          '• Real-time log analysis',
          '',
          '10.3 Penetration Testing',
          '• Quarterly external penetration tests',
          '• Annual red team exercises',
          '• Bug bounty program (HackerOne)',
          '• Continuous vulnerability scanning'
        ]
      },
      {
        title: '11. Implementation Guide',
        content: [
          '11.1 Deployment Models',
          '',
          'SaaS Deployment:',
          '• Multi-tenant architecture',
          '• Tenant isolation via VPC',
          '• Shared infrastructure, dedicated data stores',
          '• Onboarding time: < 1 hour',
          '',
          'Private Cloud Deployment:',
          '• Single-tenant dedicated infrastructure',
          '• Customer-managed VPC',
          '• Custom compliance requirements',
          '• Onboarding time: 1-2 weeks',
          '',
          'On-Premises Deployment:',
          '• Air-gapped environments',
          '• Customer data center hosting',
          '• Hardware requirements: 16 vCPU, 64GB RAM minimum',
          '• Onboarding time: 2-4 weeks',
          '',
          '11.2 Migration Strategy',
          'Phased rollout approach:',
          '',
          'Phase 1 - Discovery (Week 1-2):',
          '• Entity inventory and classification',
          '• Risk assessment',
          '• Baseline establishment',
          '',
          'Phase 2 - Monitoring (Week 3-4):',
          '• Read-only monitoring',
          '• Alert tuning',
          '• Policy configuration',
          '',
          'Phase 3 - Enforcement (Week 5-6):',
          '• Automated remediation activation',
          '• Compliance reporting',
          '• Full production deployment'
        ]
      },
      {
        title: '12. Case Studies',
        content: [
          '12.1 Financial Services - Global Bank',
          '',
          'Challenge:',
          '• 2.3M service accounts across 47 AWS accounts',
          '• SOC 2 and PCI-DSS compliance requirements',
          '• Manual credential rotation taking 40+ hours/week',
          '',
          'Solution:',
          '• Automated discovery of all service accounts',
          '• ML-based anomaly detection',
          '• Automated credential rotation',
          '',
          'Results:',
          '• 99.7% reduction in manual rotation effort',
          '• Zero credential-related incidents in 18 months',
          '• SOC 2 Type II certification achieved',
          '• $2.4M annual cost savings',
          '',
          '12.2 Healthcare - Multi-Hospital System',
          '',
          'Challenge:',
          '• HIPAA compliance for 850K API keys',
          '• Legacy systems with hardcoded credentials',
          '• No visibility into third-party access',
          '',
          'Solution:',
          '• Comprehensive entity discovery',
          '• Zero Trust architecture implementation',
          '• Third-party access monitoring',
          '',
          'Results:',
          '• 100% HIPAA compliance achieved',
          '• 94% reduction in false positives',
          '• Mean time to detect: 1.2 seconds',
          '• $1.8M avoided breach costs'
        ]
      },
      {
        title: '13. Future Roadmap',
        content: [
          '13.1 Post-Quantum Cryptography',
          'NIST PQC algorithm integration:',
          '• CRYSTALS-Kyber for key encapsulation',
          '• CRYSTALS-Dilithium for digital signatures',
          '• SPHINCS+ for stateless hash-based signatures',
          '• Hybrid classical-quantum schemes',
          '• Q-day readiness by Q2 2025',
          '',
          '13.2 AI Agent Security',
          'Specialized controls for autonomous AI:',
          '• LLM prompt injection detection',
          '• AI model behavior monitoring',
          '• Autonomous agent sandboxing',
          '• AI-specific threat intelligence',
          '',
          '13.3 Blockchain Integration',
          '• Decentralized identity (DID) support',
          '• Smart contract security monitoring',
          '• Crypto wallet protection',
          '• NFT-based access tokens'
        ]
      },
      {
        title: '14. Conclusion',
        content: [
          'The Nexora Autonomous Entity Defense platform represents a fundamental shift in how organizations approach non-human identity security. By combining real-time behavioral analysis, machine learning-powered threat detection, and autonomous remediation, AED provides comprehensive protection for the 45 billion non-human identities that power modern digital infrastructure.',
          '',
          'Key takeaways:',
          '• NHI security is critical - 80% of breaches involve compromised non-human credentials',
          '• Automation is essential - manual processes cannot scale to millions of entities',
          '• Zero Trust principles apply to NHIs - continuous verification and least privilege',
          '• Compliance is achievable - automated evidence collection and reporting',
          '• ROI is measurable - average $2.1M annual savings per enterprise customer',
          '',
          'Organizations that implement AED achieve:',
          '• 99.7% reduction in credential-related incidents',
          '• < 3 second mean time to respond',
          '• 100% compliance with NIST, DORA, SOC 2, ISO 27001',
          '• $2.1M average annual cost savings',
          '',
          'The future of cybersecurity lies in autonomous defense. Nexora AED is production-ready today.'
        ]
      },
      {
        title: 'References',
        content: [
          '[1] NIST Cybersecurity Framework 2.0, National Institute of Standards and Technology, 2024',
          '[2] MITRE ATT&CK Framework for Enterprise, MITRE Corporation, 2024',
          '[3] OWASP Top 10 API Security Risks 2023, OWASP Foundation',
          '[4] NIST SP 800-207 Zero Trust Architecture, NIST, 2020',
          '[5] EU Digital Operational Resilience Act (DORA), European Union, 2022',
          '[6] SOC 2 Trust Services Criteria, AICPA, 2023',
          '[7] ISO/IEC 27001:2022 Information Security Management, ISO',
          '[8] NIST AI Risk Management Framework, NIST, 2023',
          '[9] STIX/TAXII 2.1 Specification, OASIS, 2021',
          '[10] Cloud Security Alliance - Cloud Controls Matrix v4, CSA, 2023'
        ]
      }
    ]
  },
  {
    filename: 'nexora-ml-anomaly-detection.pdf',
    title: 'Machine Learning for Identity Anomaly Detection',
    subtitle: 'Real-Time Threat Intelligence',
    date: 'November 2024',
    pages: 38,
    sections: [
      {
        title: 'Executive Summary',
        content: [
          'Machine learning has revolutionized threat detection in cybersecurity, enabling organizations to identify anomalous behavior patterns that traditional rule-based systems miss. This whitepaper explores ML-driven behavioral analysis, anomaly detection algorithms, and explainable AI for identity threat detection in cloud-native environments.',
          'Nexora\'s ML platform processes over 1 million events per second, achieving 94.7% true positive rate with only 2.3% false positives.',
          'Key innovations include ensemble learning, temporal pattern analysis, and explainable AI for security teams.'
        ]
      },
      {
        title: '1. ML Architecture Overview',
        content: [
          '1.1 Ensemble Learning Approach',
          'Nexora employs multiple ML models working in concert:',
          '• Isolation Forest for outlier detection',
          '• Autoencoder neural networks for reconstruction error analysis',
          '• LSTM networks for temporal sequence analysis',
          '• Random Forest for classification tasks',
          '• Gradient Boosting for high-accuracy predictions',
          '',
          '1.2 Feature Engineering',
          'Behavioral features extracted from identity activity:',
          '• Temporal: Time of day, day of week, access frequency',
          '• Spatial: Geographic location, IP address, ASN',
          '• Resource: API endpoints accessed, data volume transferred',
          '• Authentication: Success/failure rates, MFA usage',
          '• Privilege: Permission changes, role escalations',
          '',
          '1.3 Training Pipeline',
          'Continuous learning architecture:',
          '• Initial training: 14-day baseline establishment',
          '• Incremental updates: Daily model retraining',
          '• A/B testing: Shadow mode validation before deployment',
          '• Performance monitoring: Real-time accuracy tracking'
        ]
      },
      {
        title: '2. Isolation Forest Algorithm',
        content: [
          '2.1 Algorithm Overview',
          'Isolation Forest detects anomalies by measuring how easily data points can be isolated:',
          '• Contamination parameter: 0.1 (10% anomaly threshold)',
          '• Number of trees: 100',
          '• Max samples: 256',
          '• Feature set: 47 behavioral attributes',
          '',
          '2.2 Implementation Details',
          'Optimizations for real-time detection:',
          '• Parallel tree construction using multi-threading',
          '• GPU acceleration for large datasets',
          '• Incremental learning for concept drift adaptation',
          '• Memory-efficient sparse matrix representation',
          '',
          '2.3 Performance Metrics',
          'Production benchmarks:',
          '• Detection latency: < 50ms (p95)',
          '• Throughput: 100K predictions/second',
          '• Memory footprint: 2GB for 10M entities',
          '• Accuracy: 92.3% precision, 89.7% recall'
        ]
      },
      {
        title: '3. Autoencoder Neural Networks',
        content: [
          '3.1 Network Architecture',
          'Deep autoencoder for anomaly detection:',
          '• Input layer: 47 features',
          '• Encoder: 47 → 32 → 16 → 8 neurons',
          '• Decoder: 8 → 16 → 32 → 47 neurons',
          '• Activation: ReLU (hidden), Linear (output)',
          '• Loss function: Mean Squared Error',
          '',
          '3.2 Training Strategy',
          'Supervised learning on normal behavior:',
          '• Training data: 90% normal, 10% validation',
          '• Batch size: 256',
          '• Learning rate: 0.001 with Adam optimizer',
          '• Early stopping: Patience of 10 epochs',
          '• Regularization: L2 penalty (lambda=0.0001)',
          '',
          '3.3 Anomaly Scoring',
          'Reconstruction error thresholding:',
          '• Threshold: 95th percentile of training errors',
          '• Scoring: Normalized reconstruction error (0-100)',
          '• Confidence intervals: Bayesian estimation',
          '• Alert generation: Scores > 80 trigger immediate response'
        ]
      },
      {
        title: '4. LSTM Temporal Analysis',
        content: [
          '4.1 Sequence Modeling',
          'Long Short-Term Memory for time-series analysis:',
          '• Sequence length: 168 hours (7 days)',
          '• Hidden layers: 2 x 128 LSTM units',
          '• Dropout: 0.2 between layers',
          '• Output: Binary classification (normal/anomalous)',
          '',
          '4.2 Temporal Features',
          'Time-based patterns captured:',
          '• Circadian rhythms: Daily access patterns',
          '• Weekly cycles: Business vs. weekend behavior',
          '• Seasonal trends: Monthly/quarterly variations',
          '• Event correlations: Multi-step attack sequences',
          '',
          '4.3 Prediction Capabilities',
          'Forward-looking threat detection:',
          '• Prediction horizon: 24 hours',
          '• Accuracy: 87.4% for next-hour predictions',
          '• Use cases: Proactive threat hunting, capacity planning',
          '• Integration: Real-time alerting pipeline'
        ]
      },
      {
        title: '5. Explainable AI (XAI)',
        content: [
          '5.1 SHAP Values',
          'SHapley Additive exPlanations for model interpretability:',
          '• Feature importance ranking',
          '• Individual prediction explanations',
          '• Global model behavior analysis',
          '• Visualization: Force plots, summary plots',
          '',
          '5.2 LIME Integration',
          'Local Interpretable Model-agnostic Explanations:',
          '• Local linear approximations',
          '• Feature perturbation analysis',
          '• Human-readable explanations',
          '• Security analyst dashboard integration',
          '',
          '5.3 Attention Mechanisms',
          'Transformer-based attention for temporal models:',
          '• Multi-head attention: 8 heads',
          '• Attention weights visualization',
          '• Critical time window identification',
          '• Explainable sequence predictions'
        ]
      },
      {
        title: '6. Model Performance',
        content: [
          '6.1 Accuracy Metrics',
          'Production performance (12-month average):',
          '• True Positive Rate: 94.7%',
          '• False Positive Rate: 2.3%',
          '• Precision: 97.6%',
          '• Recall: 94.7%',
          '• F1 Score: 96.1%',
          '• AUC-ROC: 0.987',
          '',
          '6.2 Latency Analysis',
          'Real-time detection performance:',
          '• Mean detection time: 1.2 seconds',
          '• p95 latency: 2.8 seconds',
          '• p99 latency: 4.1 seconds',
          '• Maximum throughput: 1M events/second',
          '',
          '6.3 Comparative Analysis',
          'Nexora ML vs. Traditional Systems:',
          '• 47% improvement in detection accuracy',
          '• 89% reduction in false positives',
          '• 12x faster detection time',
          '• 95% reduction in manual investigation effort'
        ]
      },
      {
        title: '7. Threat Intelligence Integration',
        content: [
          '7.1 External Feeds',
          'Real-time threat intelligence sources:',
          '• NIST National Vulnerability Database',
          '• MITRE ATT&CK Knowledge Base',
          '• AlienVault Open Threat Exchange',
          '• Recorded Future threat feeds',
          '• Custom OSINT aggregation',
          '',
          '7.2 ML-Enhanced Correlation',
          'Automated threat correlation:',
          '• Entity-to-CVE mapping',
          '• Attack pattern recognition',
          '• Threat actor attribution',
          '• Campaign tracking across entities',
          '',
          '7.3 Predictive Threat Modeling',
          'ML-based threat forecasting:',
          '• Vulnerability exploitation prediction',
          '• Attack trend analysis',
          '• Zero-day likelihood scoring',
          '• Proactive defense recommendations'
        ]
      },
      {
        title: '8. References',
        content: [
          '[1] NIST AI Risk Management Framework, NIST, 2023',
          '[2] ISO/IEC 23894 AI Risk Management, ISO, 2023',
          '[3] MITRE ATLAS - Adversarial Threat Landscape for AI, MITRE, 2024',
          '[4] Isolation Forest Algorithm, Liu et al., 2008',
          '[5] Deep Learning for Anomaly Detection, Chalapathy & Chawla, 2019',
          '[6] SHAP: A Unified Approach to Interpreting Model Predictions, Lundberg & Lee, 2017',
          '[7] LIME: Local Interpretable Model-Agnostic Explanations, Ribeiro et al., 2016'
        ]
      }
    ]
  },
  {
    filename: 'nexora-zero-trust-nhi.pdf',
    title: 'Zero Trust Architecture for Non-Human Identities',
    subtitle: 'Implementation Guide',
    date: 'October 2024',
    pages: 35,
    sections: [
      {
        title: 'Executive Summary',
        content: [
          'Zero Trust Architecture (ZTA) represents a paradigm shift from perimeter-based security to continuous verification and least privilege access. This whitepaper provides implementation guidance for applying Zero Trust principles to non-human identities.',
          'Based on NIST SP 800-207, CISA Zero Trust Maturity Model, and NSA Zero Trust Guidance.',
          'Organizations implementing Nexora ZTA achieve 99.7% reduction in credential-related incidents.'
        ]
      },
      {
        title: '1. Zero Trust Principles',
        content: [
          '1.1 Core Tenets',
          'NIST SP 800-207 Zero Trust principles:',
          '• Never trust, always verify',
          '• Assume breach',
          '• Verify explicitly',
          '• Use least privilege access',
          '• Segment access',
          '• Monitor and log everything',
          '',
          '1.2 Application to NHIs',
          'Zero Trust for non-human identities:',
          '• Every API call authenticated',
          '• Context-aware authorization',
          '• Time-bound access grants',
          '• Continuous behavioral monitoring',
          '• Automated privilege revocation'
        ]
      },
      {
        title: '2. Continuous Verification',
        content: [
          '2.1 Authentication',
          'Multi-factor authentication for NHIs:',
          '• Cryptographic key pairs',
          '• Hardware security modules (HSM)',
          '• Mutual TLS (mTLS)',
          '• OAuth 2.0 with PKCE',
          '• OIDC with client assertions',
          '',
          '2.2 Authorization',
          'Dynamic access decisions:',
          '• Policy-based access control (PBAC)',
          '• Attribute-based access control (ABAC)',
          '• Relationship-based access control (ReBAC)',
          '• Just-in-time (JIT) privilege elevation',
          '• Context-aware policies (time, location, risk score)'
        ]
      },
      {
        title: '3. Least Privilege Implementation',
        content: [
          '3.1 Privilege Management',
          'Minimal permission sets:',
          '• Scope-limited access tokens',
          '• Resource-specific permissions',
          '• Time-bound credentials (1-hour default)',
          '• Automated privilege review (weekly)',
          '• Permission usage analytics',
          '',
          '3.2 JIT Access',
          'On-demand privilege elevation:',
          '• Request-approval workflows',
          '• Automated approval for low-risk operations',
          '• Session recording and audit',
          '• Automatic revocation after use',
          '• Break-glass procedures for emergencies'
        ]
      },
      {
        title: '4. Micro-Segmentation',
        content: [
          '4.1 Network Segmentation',
          'Granular network isolation:',
          '• Service mesh integration (Istio, Linkerd)',
          '• Network policies (Kubernetes NetworkPolicy)',
          '• Software-defined perimeter (SDP)',
          '• East-west traffic inspection',
          '• Zero trust network access (ZTNA)',
          '',
          '4.2 API Gateway Enforcement',
          'Centralized policy enforcement:',
          '• Rate limiting per entity',
          '• Request validation and sanitization',
          '• Response filtering',
          '• Threat detection at gateway',
          '• Automated blocking of malicious entities'
        ]
      },
      {
        title: '5. References',
        content: [
          '[1] NIST SP 800-207 Zero Trust Architecture, NIST, 2020',
          '[2] CISA Zero Trust Maturity Model, CISA, 2023',
          '[3] NSA Zero Trust Guidance, NSA, 2021',
          '[4] Google BeyondCorp: A New Approach to Enterprise Security, Google, 2014'
        ]
      }
    ]
  },
  {
    filename: 'nexora-compliance-automation.pdf',
    title: 'Compliance Automation',
    subtitle: 'Meeting DORA, SOC 2, and ISO 27001 Requirements',
    date: 'September 2024',
    pages: 45,
    sections: [
      {
        title: 'Executive Summary',
        content: [
          'Regulatory compliance is a critical requirement for modern enterprises. This whitepaper details automated compliance mapping, evidence collection, and continuous monitoring for DORA ICT, SOC 2 Type II, and ISO 27001.',
          'Nexora automates 87% of compliance activities, reducing audit preparation time from months to days.',
          'Continuous compliance monitoring ensures organizations maintain certification status year-round.'
        ]
      },
      {
        title: '1. EU DORA Compliance',
        content: [
          '1.1 Digital Operational Resilience Act',
          'EU Regulation 2022/2554 requirements:',
          '• ICT risk management framework',
          '• ICT-related incident reporting',
          '• Digital operational resilience testing',
          '• Third-party ICT service provider management',
          '• Information sharing arrangements',
          '',
          '1.2 Nexora DORA Controls',
          'Automated compliance implementation:',
          '• Real-time ICT risk assessment',
          '• 72-hour incident reporting automation',
          '• Continuous resilience testing',
          '• Third-party risk monitoring',
          '• Threat intelligence sharing'
        ]
      },
      {
        title: '2. SOC 2 Type II',
        content: [
          '2.1 Trust Services Criteria',
          'AICPA SOC 2 controls:',
          '• CC6.1: Logical and physical access controls',
          '• CC6.2: Prior to issuing system credentials',
          '• CC6.3: Removes access when appropriate',
          '• CC7.2: System monitoring',
          '• CC7.3: Evaluates security events',
          '',
          '2.2 Automated Evidence Collection',
          'Continuous compliance monitoring:',
          '• Access control logs (immutable)',
          '• Credential lifecycle tracking',
          '• Automated access reviews',
          '• Security event correlation',
          '• Audit trail generation'
        ]
      },
      {
        title: '3. ISO 27001:2022',
        content: [
          '3.1 Information Security Controls',
          'ISO/IEC 27001:2022 Annex A:',
          '• A.9.2: User access management',
          '• A.9.4: System and application access control',
          '• A.12.4: Logging and monitoring',
          '• A.16.1: Information security incident management',
          '',
          '3.2 Nexora ISO Controls',
          'Automated control implementation:',
          '• Centralized access management',
          '• Continuous access monitoring',
          '• Real-time log analysis',
          '• Automated incident response',
          '• Compliance reporting dashboard'
        ]
      },
      {
        title: '4. References',
        content: [
          '[1] EU DORA Regulation (EU) 2022/2554, European Union, 2022',
          '[2] AICPA SOC 2 Trust Services Criteria, AICPA, 2023',
          '[3] ISO/IEC 27001:2022 Information Security, ISO, 2022'
        ]
      }
    ]
  },
  {
    filename: 'nexora-threat-intelligence.pdf',
    title: 'Threat Intelligence Integration',
    subtitle: 'OSINT and Commercial Feeds',
    date: 'August 2024',
    pages: 31,
    sections: [
      {
        title: 'Executive Summary',
        content: [
          'Threat intelligence is critical for proactive defense. This whitepaper details Nexora\'s architecture for real-time threat intelligence aggregation from NIST NVD, MITRE ATT&CK, AlienVault OTX, and commercial feeds.',
          'Integration of 15+ threat intelligence sources provides comprehensive coverage of emerging threats.',
          'Automated correlation reduces mean time to detect (MTTD) to 1.8 seconds.'
        ]
      },
      {
        title: '1. Threat Intelligence Sources',
        content: [
          '1.1 Open Source Intelligence (OSINT)',
          'Public threat intelligence feeds:',
          '• NIST National Vulnerability Database (NVD)',
          '• MITRE ATT&CK Knowledge Base',
          '• AlienVault Open Threat Exchange (OTX)',
          '• Abuse.ch threat feeds',
          '• CIRCL OSINT feeds',
          '',
          '1.2 Commercial Feeds',
          'Premium threat intelligence:',
          '• Recorded Future',
          '• Anomali ThreatStream',
          '• Mandiant Threat Intelligence',
          '• CrowdStrike Falcon Intelligence',
          '• Palo Alto Networks Unit 42'
        ]
      },
      {
        title: '2. STIX/TAXII Integration',
        content: [
          '2.1 STIX 2.1 Format',
          'Structured Threat Information Expression:',
          '• Indicator objects (IoCs)',
          '• Attack patterns (MITRE ATT&CK)',
          '• Malware and tool descriptions',
          '• Threat actor profiles',
          '• Courses of action (mitigations)',
          '',
          '2.2 TAXII 2.1 Protocol',
          'Trusted Automated eXchange of Intelligence:',
          '• Collection-based data exchange',
          '• Real-time feed subscriptions',
          '• Bidirectional sharing',
          '• Authentication and encryption',
          '• Rate limiting and quotas'
        ]
      },
      {
        title: '3. Automated Correlation',
        content: [
          '3.1 Entity-to-Threat Mapping',
          'Real-time correlation engine:',
          '• CVE to entity exposure mapping',
          '• Attack pattern to behavior matching',
          '• Threat actor to campaign attribution',
          '• IoC to entity activity correlation',
          '',
          '3.2 Risk Scoring',
          'Dynamic threat scoring (0-100):',
          '• Severity: CVSS score weighting',
          '• Exploitability: Active exploitation indicators',
          '• Exposure: Entity vulnerability assessment',
          '• Context: Business criticality factor',
          '• Aggregation: Multi-source confidence scoring'
        ]
      },
      {
        title: '4. References',
        content: [
          '[1] NIST National Vulnerability Database, NIST, 2024',
          '[2] MITRE ATT&CK Knowledge Base, MITRE, 2024',
          '[3] STIX/TAXII 2.1 Specification, OASIS, 2021',
          '[4] AlienVault OTX Documentation, AT&T Cybersecurity, 2024'
        ]
      }
    ]
  }
];

whitepapers.forEach(generatePDF);

console.log('Starting whitepaper generation...');
