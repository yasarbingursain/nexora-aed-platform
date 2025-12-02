// Organization Detail Type Definitions
export interface Organization {
  id: string;
  name: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  createdAt: Date;
  industry: string;
  region: string;
  contactEmail: string;
  complianceFrameworks: string[];
  users: number;
  entities: number;
  threats: number;
  revenue: number;
  riskScore: number;
  lastActivity: Date;
  growthRate: number;
}

export interface OrganizationMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEntities: number;
  entitiesGrowth: number;
  threatsDetected: number;
  threatsBlocked: number;
  uptime: number;
  apiCalls: number;
}

export interface EntityBreakdown {
  type: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ThreatActivity {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entityName: string;
  timestamp: Date;
  status: 'active' | 'investigating' | 'resolved';
  description: string;
}

export interface BillingInfo {
  plan: string;
  monthlyRevenue: number;
  annualRevenue: number;
  paymentMethod: string;
  nextBillingDate: Date;
  billingHistory: BillingTransaction[];
}

export interface BillingTransaction {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export interface OrganizationSettings {
  autoRemediation: boolean;
  notificationEmail: string;
  slackWebhook?: string;
  retentionDays: number;
  complianceMode: boolean;
  apiRateLimit: number;
}

export interface OrganizationDetailResponse {
  organization: Organization;
  metrics: OrganizationMetrics;
  entityBreakdown: EntityBreakdown[];
  recentThreats: ThreatActivity[];
  billing: BillingInfo;
  settings: OrganizationSettings;
}
