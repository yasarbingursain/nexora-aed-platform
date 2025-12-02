// Analytics API Client - Live Data Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface AnalyticsMetrics {
  threatsDetected: number;
  threatsChange: number;
  autoResolved: number;
  autoResolvedChange: number;
  medianTTR: number;
  ttrChange: number;
  costPerRequest: number;
}

export interface ThreatTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AttackVector {
  name: string;
  percentage: number;
  count: number;
}

export interface MitreAttack {
  tactic: string;
  coverage: number;
}

export interface ROIMetrics {
  nexoraCostAnnual: number;
  threatsAutoRemediated: number;
  costPerManualResponse: number;
  avoidedLaborCost: number;
  avgDataBreachCost: number;
  threatsPrevented: number;
  estimatedRiskReduction: number;
  totalValue: number;
  roi: number;
}

export interface AnalyticsResponse {
  metrics: AnalyticsMetrics;
  threatTrends: ThreatTrend[];
  attackVectors: AttackVector[];
  mitreAttack: MitreAttack[];
  roi: ROIMetrics;
}

export async function fetchAnalytics(dateRange: string = '30d'): Promise<AnalyticsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/analytics?range=${dateRange}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Analytics API error: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    throw error;
  }
}

export async function exportReport(format: 'pdf' | 'csv' | 'json'): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/analytics/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                 format === 'csv' ? 'text/csv' : 
                 'application/pdf',
      },
    });

    if (!response.ok) throw new Error(`Failed to export report: ${response.status}`);

    return await response.blob();
  } catch (error) {
    console.error('Failed to export report:', error);
    throw error;
  }
}
