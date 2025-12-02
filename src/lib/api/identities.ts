// Identities API Client - Live Data Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Identity {
  id: string;
  name: string;
  type: 'api_key' | 'service_account' | 'ai_agent' | 'ssh_key' | 'oauth_token';
  owner: string;
  team?: string;
  environment?: string;
  riskScore: number;
  lastSeen: Date;
  createdAt: Date;
  lastRotation?: Date;
  status: 'active' | 'inactive' | 'suspended';
}

export interface IdentityDetail extends Identity {
  spiffeId?: string;
  imageDigest?: string;
  imageVerified?: boolean;
  sbomPresent?: boolean;
  region?: string;
  totalEvents: number;
  eventsGrowth: number;
  baselineBehavior: {
    resources: Array<{ path: string; percentage: number }>;
    scopes: string[];
    regions: Array<{ region: string; percentage: number }>;
    activityHours: string;
  };
  recentAnomalies: Array<{
    timestamp: Date;
    description: string;
    riskScore: number;
  }>;
}

export interface IdentitiesResponse {
  identities: Identity[];
  total: number;
  page: number;
  totalPages: number;
  summary: {
    apiKeys: number;
    serviceAccounts: number;
    aiAgents: number;
    sshKeys: number;
    oauthTokens: number;
  };
}

export async function fetchIdentities(
  page: number = 1,
  limit: number = 25,
  filters?: {
    type?: string;
    search?: string;
    riskLevel?: string;
  }
): Promise<IdentitiesResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/customer/identities?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Identities API error: ${response.status}`);

    const data = await response.json();
    
    return {
      identities: data.identities.map((identity: any) => ({
        ...identity,
        lastSeen: new Date(identity.lastSeen),
        createdAt: new Date(identity.createdAt),
        lastRotation: identity.lastRotation ? new Date(identity.lastRotation) : undefined,
      })),
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
      summary: data.summary,
    };
  } catch (error) {
    console.error('Failed to fetch identities:', error);
    throw error;
  }
}

export async function fetchIdentityDetail(identityId: string): Promise<IdentityDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/identities/${identityId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Identity detail API error: ${response.status}`);

    const data = await response.json();
    
    return {
      ...data,
      lastSeen: new Date(data.lastSeen),
      createdAt: new Date(data.createdAt),
      lastRotation: data.lastRotation ? new Date(data.lastRotation) : undefined,
      recentAnomalies: data.recentAnomalies.map((anomaly: any) => ({
        ...anomaly,
        timestamp: new Date(anomaly.timestamp),
      })),
    };
  } catch (error) {
    console.error('Failed to fetch identity detail:', error);
    throw error;
  }
}

export async function rotateIdentity(identityId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/identities/${identityId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to rotate identity: ${response.status}`);
  } catch (error) {
    console.error('Failed to rotate identity:', error);
    throw error;
  }
}

export async function suspendIdentity(identityId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/identities/${identityId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to suspend identity: ${response.status}`);
  } catch (error) {
    console.error('Failed to suspend identity:', error);
    throw error;
  }
}
