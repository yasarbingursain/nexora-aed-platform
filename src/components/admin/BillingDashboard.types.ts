export interface RevenueMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  arpu: number;
  growth: number;
}

export interface RevenueByTier {
  tier: string;
  revenue: number;
  percentage: number;
  customerCount: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
}

export interface FailedPayment {
  id: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  dueDate: Date;
  reason: string;
  attempts: number;
}

export interface ChurnRiskCustomer {
  id: string;
  organizationName: string;
  plan: string;
  revenue: number;
  riskScore: number;
  riskFactors: string[];
  lastActivity: Date;
}

export interface BillingDashboardResponse {
  metrics: RevenueMetrics;
  revenueByTier: RevenueByTier[];
  monthlyRevenue: MonthlyRevenue[];
  failedPayments: FailedPayment[];
  churnRisk: ChurnRiskCustomer[];
}
