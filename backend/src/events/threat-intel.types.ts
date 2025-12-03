/**
 * Threat Intelligence Event Types
 * Used across all event bus implementations
 */

export interface ThreatIntelEvent {
  source: string;
  ioc_type: string;
  count: number;
  timestamp: string;
}
