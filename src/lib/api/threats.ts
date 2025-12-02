// Threats API Client - Live Data Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Threat {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  entityName: string;
  entityType: string;
  riskScore: number;
  mlConfidence: number;
  reasons: string[];
  mlBreakdown: {
    graph: number;
    temporal: number;
    morphing: number;
    statistical: number;
  };
  status: 'active' | 'investigating' | 'resolved';
  details?: string;
}

export interface ThreatsResponse {
  threats: Threat[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
}

export async function fetchThreats(
  page: number = 1,
  limit: number = 10,
  filters?: {
    severity?: string;
    status?: string;
    search?: string;
  }
): Promise<ThreatsResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && { search: filters.search }),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/customer/threats?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Threats API error: ${response.status}`);

    const data = await response.json();
    
    return {
      threats: data.threats.map((threat: any) => ({
        ...threat,
        timestamp: new Date(threat.timestamp),
      })),
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
      stats: data.stats,
    };
  } catch (error) {
    console.error('Failed to fetch threats:', error);
    throw error;
  }
}

export async function quarantineThreat(threatId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/threats/${threatId}/quarantine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to quarantine: ${response.status}`);
  } catch (error) {
    console.error('Failed to quarantine threat:', error);
    throw error;
  }
}

export async function rotateCredentials(threatId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/threats/${threatId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to rotate credentials: ${response.status}`);
  } catch (error) {
    console.error('Failed to rotate credentials:', error);
    throw error;
  }
}

export async function dismissThreat(threatId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/threats/${threatId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to dismiss threat: ${response.status}`);
  } catch (error) {
    console.error('Failed to dismiss threat:', error);
    throw error;
  }
}
