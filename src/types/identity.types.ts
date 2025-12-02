export interface Identity {
  id: string
  name: string
  type: IdentityType
  status: IdentityStatus
  description?: string
  environment: string
  owner: string
  tags: string[]
  metadata: IdentityMetadata
  riskScore: number
  lastActivity: string
  createdAt: string
  updatedAt: string
  baseline?: IdentityBaseline
  observations: IdentityObservation[]
}

export enum IdentityType {
  SERVICE_ACCOUNT = 'service_account',
  API_KEY = 'api_key',
  CERTIFICATE = 'certificate',
  AI_AGENT = 'ai_agent',
  OAUTH_TOKEN = 'oauth_token',
  SSH_KEY = 'ssh_key',
  TOKEN = 'token',
  DATABASE_USER = 'database_user',
  CLOUD_ROLE = 'cloud_role',
  CONTAINER = 'container',
  DEVICE = 'device',
}

export enum IdentityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  QUARANTINED = 'quarantined',
  ROTATING = 'rotating',
  COMPROMISED = 'compromised',
}

export interface IdentityMetadata {
  source: string
  region: string
  cloudProvider?: string
  namespace?: string
  cluster?: string
  application?: string
  team?: string
  costCenter?: string
  compliance?: ComplianceInfo
  createdBy?: string
  lastRotated?: string
  expiresAt?: string
  permissions?: string[]
  integrations?: string[]
  customFields?: Record<string, any>
}

export interface ComplianceInfo {
  frameworks: string[]
  classification: 'public' | 'internal' | 'confidential' | 'restricted'
  dataTypes: string[]
  retentionPeriod?: number
}

export interface IdentityBaseline {
  id: string
  identityId: string
  accessPatterns: AccessPattern[]
  geographicLocations: string[]
  timePatterns: TimeWindow[]
  resourceAccess: ResourceAccess[]
  behaviorFingerprint: string
  confidenceScore: number
  createdAt: string
  updatedAt: string
}

export interface AccessPattern {
  resource: string
  actions: string[]
  frequency: number
  timeWindows: TimeWindow[]
  locations: string[]
}

export interface TimeWindow {
  start: string
  end: string
  timezone: string
}

export interface BehaviorProfile {
  avgSessionDuration: number
  typicalHours: number[]
  commonLocations: string[]
  resourceAccess: ResourceAccess[]
  riskIndicators: RiskIndicator[]
}

export interface ResourceAccess {
  resource: string
  frequency: number
  lastAccess: string
  permissions: string[]
}

export interface RiskIndicator {
  type: string
  value: number
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface IdentityObservation {
  id: string
  identityId: string
  timestamp: string
  type: ObservationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  details: Record<string, any>
  source: string
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

export enum ObservationType {
  ANOMALOUS_ACCESS = 'anomalous_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNUSUAL_LOCATION = 'unusual_location',
  OFF_HOURS_ACCESS = 'off_hours_access',
  FAILED_AUTHENTICATION = 'failed_authentication',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  POLICY_VIOLATION = 'policy_violation',
  CREDENTIAL_EXPOSURE = 'credential_exposure',
}

export interface IdentitySearchFilters {
  types?: IdentityType[]
  statuses?: IdentityStatus[]
  riskScoreMin?: number
  riskScoreMax?: number
  owners?: string[]
  tags?: string[]
  environments?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface IdentitySearchResult {
  identities: Identity[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface IdentityAction {
  id: string
  identityId: string
  type: IdentityActionType
  status: ActionStatus
  requestedBy: string
  requestedAt: string
  approvedBy?: string
  approvedAt?: string
  executedAt?: string
  completedAt?: string
  reason: string
  details: Record<string, any>
  rollbackPlan?: RollbackPlan
}

export enum IdentityActionType {
  ROTATE = 'rotate',
  QUARANTINE = 'quarantine',
  DECEPTION = 'deception',
  DISABLE = 'disable',
  DELETE = 'delete',
  UPDATE_PERMISSIONS = 'update_permissions',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
}

export enum ActionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLED_BACK = 'rolled_back',
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
