// NHITI Feed Type Definitions
export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ThreatType = 'agent-fingerprint' | 'token-abuse' | 'bot-signature' | 'malicious-ip';

export interface ThreatIndicator {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  title: string;
  description: string;
  confidence: number;
  industry: string;
  affectedOrgs: number;
  timestamp: Date;
  details: string;
  sourceIp?: string;
  targetEntity?: string;
}

export interface NHITIStats {
  totalShared: number;
  detectedGlobally: number;
  avgConfidence: number;
  blockRate: number;
}

export interface ThreatTypeDistribution {
  type: string;
  percentage: number;
  color: string;
  count: number;
}

export interface ContributingOrg {
  industry: string;
  count: number;
}

export interface NHITIFeedResponse {
  indicators: ThreatIndicator[];
  stats: NHITIStats;
  distribution: ThreatTypeDistribution[];
  contributors: ContributingOrg[];
  lastUpdate: string;
}
