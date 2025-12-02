export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  timestamp: string
  requestId: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  requestId: string
  path: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: Record<string, any>
  sort?: SortOption[]
}

export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
}

export interface SearchParams {
  q?: string
  page?: number
  pageSize?: number
  sort?: SortOption[]
  filters?: Record<string, any>
}

export interface WebSocketMessage<T = any> {
  type: string
  data: T
  timestamp: string
  id: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: 'Bearer'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: Permission[]
  tenantId: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  preferences: UserPreferences
  mfaEnabled: boolean
}

export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
  AUDITOR = 'auditor',
}

export interface Permission {
  resource: string
  actions: string[]
  conditions?: Record<string, any>
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationPreferences
  dashboard: DashboardPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  threatAlerts: boolean
  systemUpdates: boolean
  weeklyReports: boolean
}

export interface DashboardPreferences {
  layout: 'grid' | 'list'
  widgets: string[]
  refreshInterval: number
  defaultTimeRange: string
}

export interface LoginRequest {
  email: string
  password: string
  mfaCode?: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
  requiresMfa: boolean
  mfaChallenge?: MfaChallenge
}

export interface MfaChallenge {
  type: 'totp' | 'sms' | 'email'
  challengeId: string
  expiresAt: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirmRequest {
  token: string
  newPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface Tenant {
  id: string
  name: string
  domain: string
  plan: 'starter' | 'professional' | 'enterprise'
  isActive: boolean
  settings: TenantSettings
  limits: TenantLimits
  createdAt: string
  updatedAt: string
}

export interface TenantSettings {
  allowedDomains: string[]
  ssoEnabled: boolean
  mfaRequired: boolean
  sessionTimeout: number
  passwordPolicy: PasswordPolicy
  auditRetention: number
  complianceFrameworks: string[]
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
  preventReuse: number
  maxAge: number
}

export interface TenantLimits {
  maxUsers: number
  maxIdentities: number
  maxThreats: number
  storageQuota: number
  apiCallsPerMonth: number
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: Widget[]
  layout: DashboardLayout
  isDefault: boolean
  isPublic: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Widget {
  id: string
  type: WidgetType
  title: string
  config: WidgetConfig
  position: WidgetPosition
  size: WidgetSize
}

export enum WidgetType {
  THREAT_OVERVIEW = 'threat_overview',
  IDENTITY_RISK = 'identity_risk',
  COMPLIANCE_STATUS = 'compliance_status',
  ACTIVITY_TIMELINE = 'activity_timeline',
  TOP_THREATS = 'top_threats',
  RISK_TRENDS = 'risk_trends',
  ENTITY_GRAPH = 'entity_graph',
  METRICS_CHART = 'metrics_chart',
}

export interface WidgetConfig {
  timeRange?: string
  filters?: Record<string, any>
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min'
  groupBy?: string[]
  limit?: number
}

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetSize {
  width: number
  height: number
}

export interface DashboardLayout {
  columns: number
  rowHeight: number
  margin: [number, number]
  containerPadding: [number, number]
}

export interface Compliance {
  id: string
  framework: ComplianceFramework
  status: ComplianceStatus
  score: number
  lastAssessment: string
  nextAssessment: string
  requirements: ComplianceRequirement[]
  evidence: ComplianceEvidence[]
  gaps: ComplianceGap[]
}

export enum ComplianceFramework {
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  NIST = 'nist',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  CCPA = 'ccpa',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_ASSESSED = 'not_assessed',
}

export interface ComplianceRequirement {
  id: string
  title: string
  description: string
  status: ComplianceStatus
  evidence: string[]
  lastReviewed: string
  nextReview: string
  owner: string
}

export interface ComplianceEvidence {
  id: string
  type: 'document' | 'screenshot' | 'log' | 'report' | 'certificate'
  title: string
  description: string
  url: string
  uploadedBy: string
  uploadedAt: string
  expiresAt?: string
}

export interface ComplianceGap {
  id: string
  requirementId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation: string
  estimatedEffort: number
  dueDate: string
  assignee: string
  status: 'open' | 'in_progress' | 'resolved'
}

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  outcome: 'success' | 'failure'
  riskScore: number
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealth[]
  lastUpdated: string
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  uptime: number
  lastCheck: string
  details?: Record<string, any>
}

// Re-export threat types
export type {
  Threat,
  ThreatSeverity,
  ThreatStatus,
  ThreatCategory,
  ThreatIndicator,
  ThreatMetadata,
  ThreatTimelineEvent,
  RemediationPlan,
  ThreatSearchFilters as ThreatFilters,
} from './threat.types'

// Re-export identity types (using correct names from identity.types.ts)
export type {
  Identity as Entity,
  IdentityType as EntityType,
  IdentityStatus as EntityStatus,
  IdentityMetadata as EntityMetadata,
} from './identity.types'

// Additional types for API responses
export interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  title: string
  description: string
  actor: string
  details: Record<string, any>
  automated: boolean
}

export interface Metrics {
  totalThreats: number
  criticalThreats: number
  resolvedThreats: number
  avgResponseTime: number
  entitiesMonitored: number
  riskScore: number
  complianceScore: number
  trends: MetricTrend[]
}

export interface MetricTrend {
  timestamp: string
  value: number
  label: string
}
