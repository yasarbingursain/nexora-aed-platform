/**
 * OSINT Threat Intelligence Types
 * Nexora AED Platform - Enterprise Grade
 */

export type ThreatSource = 'otx' | 'censys' | 'manual';

export type IndicatorType = 'ipv4' | 'ipv6' | 'domain' | 'url' | 'hash' | 'email' | 'other';

export type RiskLabel = 'low' | 'medium' | 'high' | 'critical';

export type SeverityLabel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Raw Threat Entity from OSINT sources
 */
export interface ThreatEntity {
  id: string;
  source: ThreatSource;
  indicator_type: IndicatorType;
  value: string;
  
  description?: string;
  first_seen: string;
  last_seen: string;
  
  // Geolocation
  country_code?: string;
  country_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  
  // Risk Assessment
  severity?: number;
  sightings?: number;
  confidence?: number;
  tags?: string[];
  
  // Computed by Risk Brain
  risk_score?: number;
  risk_label?: RiskLabel;
}

/**
 * OCSF Actor Object
 */
export interface OcsfActor {
  type: string;
  name: string;
  uid?: string;
  org?: {
    name: string;
    uid?: string;
  };
}

/**
 * OCSF Resource Object
 */
export interface OcsfResource {
  type: string;
  id: string;
  uid?: string;
  geo?: {
    lat: number;
    lon: number;
    city?: string;
    country?: string;
  };
  country_code?: string;
}

/**
 * OCSF Metadata Object
 */
export interface OcsfMetadata {
  product: {
    name: string;
    vendor_name: string;
    version: string;
    lang?: string;
  };
  version: string;
  logged_time?: string;
  processed_time?: string;
}

/**
 * OCSF Finding Info Object
 */
export interface OcsfFindingInfo {
  title: string;
  desc?: string;
  uid?: string;
  types?: string[];
  first_seen_time: string;
  last_seen_time: string;
  created_time: string;
  modified_time: string;
}

/**
 * OCSF Observable Object
 */
export interface OcsfObservable {
  name: string;
  type: string;
  value: string;
  reputation?: {
    score: number;
    label: string;
  };
}

/**
 * Complete OCSF Threat Event
 */
export interface OcsfThreatEvent {
  // Core Identity
  external_id: string;
  source: string;
  indicator_type: string;
  value: string;
  
  // OCSF Classification
  category_uid: number;
  category_name: string;
  class_uid: number;
  class_name: string;
  type_uid: number;
  type_name: string;
  
  // Activity & Status
  activity_id: number;
  activity_name: string;
  severity_id: number;
  severity: string;
  status_id: number;
  status: string;
  
  // Risk
  risk_score: number;
  risk_label: string;
  confidence?: number;
  
  // Details
  description?: string;
  sightings?: number;
  tags?: string[];
  
  // Geolocation
  country_code?: string;
  country_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  
  // Temporal
  first_seen: string;
  last_seen: string;
  expires_at?: string;
  
  // OCSF Objects
  actor: OcsfActor;
  resource: OcsfResource;
  metadata: OcsfMetadata;
  finding_info: OcsfFindingInfo;
  observables?: OcsfObservable[];
  
  // Multi-tenancy
  organization_id?: string;
}

/**
 * Risk Scoring Request
 */
export interface RiskScoreRequest {
  id: string;
  source: ThreatSource;
  indicator_type: IndicatorType;
  value: string;
  description?: string;
  first_seen: string;
  last_seen: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  severity?: number;
  sightings?: number;
}

/**
 * Risk Scoring Response
 */
export interface RiskScoreResponse {
  risk_score: number;
  risk_label: RiskLabel;
}

/**
 * SOAR Blocklist
 */
export interface SoarBlocklist {
  generated_at: string;
  expires_at: string;
  total_items: number;
  ips: string[];
  domains: string[];
  urls: string[];
  metadata: {
    min_risk_score: number;
    max_items: number;
    sources: string[];
  };
}
