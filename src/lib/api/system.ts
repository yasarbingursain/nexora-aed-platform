// System Health API Client - Live Data Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  connections: number;
  uptime: number;
}

export interface SystemAlert {
  id: string;
  type: 'system' | 'security' | 'customer';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: Date;
  customer?: string;
}

export interface SystemHealthResponse {
  metrics: SystemMetrics;
  alerts: SystemAlert[];
  status: 'healthy' | 'degraded' | 'critical';
}

export async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/system/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`System health API error: ${response.status}`);

    const data = await response.json();
    
    return {
      metrics: data.metrics,
      alerts: data.alerts.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
      })),
      status: data.status,
    };
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    throw error;
  }
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/system/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to acknowledge alert: ${response.status}`);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    throw error;
  }
}
