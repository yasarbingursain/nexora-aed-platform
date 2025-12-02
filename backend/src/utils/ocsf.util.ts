/**
 * OCSF Normalization Utility
 * Converts raw threat entities to OCSF-compliant events
 * Nexora AED Platform - Enterprise Grade
 */

import type {
  ThreatEntity,
  OcsfThreatEvent,
  OcsfActor,
  OcsfResource,
  OcsfMetadata,
  OcsfFindingInfo,
  OcsfObservable,
} from '@/types/osint.types';

const NEXORA_VERSION = '1.2.0';
const OCSF_VERSION = '1.1.0';

/**
 * Map risk label to OCSF severity ID
 */
function severityIdFromLabel(label: string): number {
  switch (label) {
    case 'critical': return 9;
    case 'high': return 7;
    case 'medium': return 5;
    case 'low': return 3;
    default: return 1;
  }
}

/**
 * Create OCSF Actor object
 */
function createActor(entity: ThreatEntity): OcsfActor {
  return {
    type: 'osint_feed',
    name: entity.source.toUpperCase(),
    uid: `${entity.source}-feed`,
    org: {
      name: 'Nexora LiveAtlas',
      uid: 'nexora-liveatlas',
    },
  };
}

/**
 * Create OCSF Resource object
 */
function createResource(entity: ThreatEntity): OcsfResource {
  const resource: OcsfResource = {
    type: entity.indicator_type,
    id: entity.value,
    uid: entity.id,
  };

  if (entity.latitude != null && entity.longitude != null) {
    resource.geo = {
      lat: entity.latitude,
      lon: entity.longitude,
      ...(entity.city && { city: entity.city }),
      ...(entity.country_name && { country: entity.country_name }),
    };
    if (entity.country_code) {
      resource.country_code = entity.country_code;
    }
  }

  return resource;
}

/**
 * Create OCSF Metadata object
 */
function createMetadata(): OcsfMetadata {
  const now = new Date().toISOString();
  return {
    product: {
      name: 'Nexora LiveAtlas',
      vendor_name: 'Nexora',
      version: NEXORA_VERSION,
      lang: 'en',
    },
    version: OCSF_VERSION,
    logged_time: now,
    processed_time: now,
  };
}

/**
 * Create OCSF Finding Info object
 */
function createFindingInfo(entity: ThreatEntity): OcsfFindingInfo {
  const title = entity.description || `${entity.indicator_type.toUpperCase()} Threat: ${entity.value}`;
  const now = new Date().toISOString();

  const findingInfo: OcsfFindingInfo = {
    title,
    uid: entity.id,
    first_seen_time: entity.first_seen,
    last_seen_time: entity.last_seen,
    created_time: entity.first_seen,
    modified_time: entity.last_seen || now,
  };

  if (entity.description) findingInfo.desc = entity.description;
  if (entity.tags) findingInfo.types = entity.tags;

  return findingInfo;
}

/**
 * Create OCSF Observable objects
 */
function createObservables(entity: ThreatEntity): OcsfObservable[] {
  const observable: OcsfObservable = {
    name: entity.indicator_type,
    type: entity.indicator_type,
    value: entity.value,
  };

  if (entity.risk_score != null && entity.risk_label != null) {
    observable.reputation = {
      score: entity.risk_score,
      label: entity.risk_label,
    };
  }

  return [observable];
}

/**
 * Calculate expiration time (24 hours from last seen)
 */
function calculateExpiration(lastSeen: string): string {
  const lastSeenDate = new Date(lastSeen);
  const expirationDate = new Date(lastSeenDate.getTime() + 24 * 60 * 60 * 1000);
  return expirationDate.toISOString();
}

/**
 * Convert ThreatEntity to OCSF-compliant ThreatEvent
 */
export function toOcsfEvent(entity: ThreatEntity): OcsfThreatEvent {
  const riskLabel = entity.risk_label ?? 'low';
  const riskScore = entity.risk_score ?? 0;
  const severity = riskLabel;
  const severityId = severityIdFromLabel(severity);

  const event: OcsfThreatEvent = {
    // Core Identity
    external_id: entity.id,
    source: entity.source,
    indicator_type: entity.indicator_type,
    value: entity.value,

    // OCSF Classification
    category_uid: 3,
    category_name: 'Finding',
    class_uid: 3001,
    class_name: 'Threat Finding',
    type_uid: 300101,
    type_name: 'OSINT Threat Finding',

    // Activity & Status
    activity_id: 1,
    activity_name: 'Detected',
    severity_id: severityId,
    severity,
    status_id: 1,
    status: 'New',

    // Risk Assessment
    risk_score: riskScore,
    risk_label: riskLabel,

    // Temporal
    first_seen: entity.first_seen,
    last_seen: entity.last_seen,

    // OCSF Objects
    actor: createActor(entity),
    resource: createResource(entity),
    metadata: createMetadata(),
    finding_info: createFindingInfo(entity),
  };

  // Optional fields
  if (entity.confidence != null) event.confidence = entity.confidence;
  if (entity.description) event.description = entity.description;
  if (entity.sightings) event.sightings = entity.sightings;
  if (entity.tags) event.tags = entity.tags;
  if (entity.country_code) event.country_code = entity.country_code;
  if (entity.country_name) event.country_name = entity.country_name;
  if (entity.city) event.city = entity.city;
  if (entity.latitude != null) event.latitude = entity.latitude;
  if (entity.longitude != null) event.longitude = entity.longitude;
  if (entity.last_seen) event.expires_at = calculateExpiration(entity.last_seen);
  
  const observables = createObservables(entity);
  if (observables.length > 0) event.observables = observables;

  return event;
}

/**
 * Batch convert multiple entities to OCSF events
 */
export function toOcsfEvents(entities: ThreatEntity[]): OcsfThreatEvent[] {
  return entities.map(toOcsfEvent);
}

/**
 * Validate OCSF event structure
 */
export function validateOcsfEvent(event: OcsfThreatEvent): boolean {
  // Required fields validation
  if (!event.external_id || !event.source || !event.value) {
    return false;
  }

  // OCSF classification validation
  if (event.category_uid !== 3 || event.class_uid !== 3001) {
    return false;
  }

  // Risk score validation
  if (event.risk_score < 0 || event.risk_score > 100) {
    return false;
  }

  // Confidence validation
  if (event.confidence != null && (event.confidence < 0 || event.confidence > 1)) {
    return false;
  }

  return true;
}
