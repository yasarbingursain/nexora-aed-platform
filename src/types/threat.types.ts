export interface Threat {
  id: string
  title: string
  description: string
  severity: ThreatSeverity
  status: ThreatStatus
  category: ThreatCategory
  source: string
  detectedAt: string
  updatedAt: string
  affectedEntities: string[]
  indicators: ThreatIndicator[]
  mitreTactics: string[]
  mitreId?: string
  confidence: number
  falsePositiveScore: number
  metadata: ThreatMetadata
  timeline: ThreatTimelineEvent[]
  remediation?: RemediationPlan
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ThreatStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  IGNORED = 'ignored',
}

export enum ThreatCategory {
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  LATERAL_MOVEMENT = 'lateral_movement',
  DATA_EXFILTRATION = 'data_exfiltration',
  CREDENTIAL_ABUSE = 'credential_abuse',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  INSIDER_THREAT = 'insider_threat',
  SUPPLY_CHAIN = 'supply_chain',
  VULNERABILITY_EXPLOIT = 'vulnerability_exploit',
}

export interface ThreatIndicator {
  type: IndicatorType
  value: string
  confidence: number
  source: string
  firstSeen: string
  lastSeen: string
  context: Record<string, any>
}

export enum IndicatorType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  FILE_HASH = 'file_hash',
  EMAIL = 'email',
  USER_AGENT = 'user_agent',
  CERTIFICATE = 'certificate',
  PROCESS = 'process',
  REGISTRY_KEY = 'registry_key',
  NETWORK_SIGNATURE = 'network_signature',
}

export interface ThreatMetadata {
  source: string
  region: string
  environment: string
  detectionRule: string
  ruleVersion: string
  analystNotes?: string
  externalReferences: ExternalReference[]
  tags: string[]
  killChainPhase?: string
}

export interface ExternalReference {
  source: string
  url: string
  description: string
  type: 'report' | 'advisory' | 'article' | 'tool' | 'other'
}

export interface ThreatTimelineEvent {
  id: string
  timestamp: string
  type: TimelineEventType
  description: string
  actor: string
  details: Record<string, any>
  automated: boolean
}

export enum TimelineEventType {
  DETECTED = 'detected',
  ASSIGNED = 'assigned',
  INVESTIGATED = 'investigated',
  ESCALATED = 'escalated',
  CONTAINED = 'contained',
  REMEDIATED = 'remediated',
  CLOSED = 'closed',
  REOPENED = 'reopened',
  COMMENT_ADDED = 'comment_added',
  STATUS_CHANGED = 'status_changed',
}

export interface RemediationPlan {
  id: string
  threatId: string
  status: RemediationStatus
  priority: RemediationPriority
  estimatedEffort: number
  steps: RemediationStep[]
  automatedSteps: number
  manualSteps: number
  approvalRequired: boolean
  approvedBy?: string
  approvedAt?: string
  executedAt?: string
  completedAt?: string
  rollbackPlan?: RollbackPlan
}

export enum RemediationStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RemediationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface RemediationStep {
  id: string
  order: number
  title: string
  description: string
  type: RemediationStepType
  automated: boolean
  estimatedDuration: number
  dependencies: string[]
  status: StepStatus
  executedAt?: string
  completedAt?: string
  output?: string
  error?: string
}

export enum RemediationStepType {
  ISOLATE = 'isolate',
  QUARANTINE = 'quarantine',
  ROTATE_CREDENTIALS = 'rotate_credentials',
  DISABLE_ACCOUNT = 'disable_account',
  BLOCK_IP = 'block_ip',
  UPDATE_FIREWALL = 'update_firewall',
  PATCH_SYSTEM = 'patch_system',
  COLLECT_EVIDENCE = 'collect_evidence',
  NOTIFY_STAKEHOLDERS = 'notify_stakeholders',
  CUSTOM_SCRIPT = 'custom_script',
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface RollbackPlan {
  steps: RollbackStep[]
  estimatedDuration: number
  riskLevel: 'low' | 'medium' | 'high'
  dependencies: string[]
}

export interface RollbackStep {
  order: number
  action: string
  description: string
  automated: boolean
  estimatedDuration: number
}

export interface ThreatSearchFilters {
  severities?: ThreatSeverity[]
  severity?: ThreatSeverity[] // Alias for API compatibility
  statuses?: ThreatStatus[]
  status?: ThreatStatus[] // Alias for API compatibility
  categories?: ThreatCategory[]
  sources?: string[]
  dateRange?: {
    start: string
    end: string
  }
  from?: Date // Date range start
  to?: Date // Date range end
  entity_id?: string // Filter by specific entity
  confidenceMin?: number
  affectedEntities?: string[]
  mitreTactics?: string[]
}

export interface ThreatSearchResult {
  threats: Threat[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  aggregations: ThreatAggregations
}

export interface ThreatAggregations {
  bySeverity: Record<ThreatSeverity, number>
  byStatus: Record<ThreatStatus, number>
  byCategory: Record<ThreatCategory, number>
  bySource: Record<string, number>
  timeline: TimelinePoint[]
}

export interface TimelinePoint {
  timestamp: string
  count: number
  severity: ThreatSeverity
}

export interface ThreatIntelligence {
  id: string
  type: 'ioc' | 'ttp' | 'campaign' | 'actor'
  value: string
  confidence: number
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  description: string
  references: ExternalReference[]
  stixId?: string
  tlp: 'white' | 'green' | 'amber' | 'red'
}
