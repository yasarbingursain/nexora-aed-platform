/**
 * Risk Scoring Service
 * Integrates with ML Risk Brain (FastAPI)
 * Nexora AED Platform - Enterprise Grade
 */

import { logger } from '@/utils/logger';
import type { ThreatEntity, RiskScoreRequest, RiskScoreResponse } from '@/types/osint.types';

/**
 * Score threat entity using ML Risk Brain
 */
export async function scoreEntity(
  entity: ThreatEntity,
  riskEngineUrl: string
): Promise<ThreatEntity> {
  if (!riskEngineUrl) {
    logger.warn('Risk engine URL not configured, using default scoring');
    return applyDefaultScoring(entity);
  }

  try {
    const request: RiskScoreRequest = {
      id: entity.id,
      source: entity.source,
      indicator_type: entity.indicator_type,
      value: entity.value,
      first_seen: entity.first_seen,
      last_seen: entity.last_seen,
    };

    // Optional fields
    if (entity.description) request.description = entity.description;
    if (entity.country_code) request.country_code = entity.country_code;
    if (entity.latitude != null) request.latitude = entity.latitude;
    if (entity.longitude != null) request.longitude = entity.longitude;
    if (entity.severity != null) request.severity = entity.severity;
    if (entity.sightings != null) request.sightings = entity.sightings;

    const response = await fetch(riskEngineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      logger.warn('Risk engine error, using default scoring', {
        status: response.status,
        entityId: entity.id,
      });
      return applyDefaultScoring(entity);
    }

    const result = await response.json() as RiskScoreResponse;

    entity.risk_score = result.risk_score;
    entity.risk_label = result.risk_label;

    return entity;
  } catch (error) {
    logger.error('Risk scoring error, using default', {
      entityId: entity.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return applyDefaultScoring(entity);
  }
}

/**
 * Batch score multiple entities
 */
export async function scoreEntities(
  entities: ThreatEntity[],
  riskEngineUrl: string
): Promise<ThreatEntity[]> {
  const scored: ThreatEntity[] = [];

  for (const entity of entities) {
    const scoredEntity = await scoreEntity(entity, riskEngineUrl);
    scored.push(scoredEntity);
    
    // Small delay to avoid overwhelming the risk engine
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return scored;
}

/**
 * Apply default risk scoring (fallback)
 */
function applyDefaultScoring(entity: ThreatEntity): ThreatEntity {
  const severity = entity.severity || 5;
  const sightings = entity.sightings || 1;
  
  // Base score from severity (0-10) → 0-60 points
  let score = (severity / 10) * 60;
  
  // Sightings bonus (up to +20 points)
  score += Math.min(sightings, 10) * 2;
  
  // Recency bonus (up to +10 points)
  const lastSeen = new Date(entity.last_seen);
  const ageHours = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
  
  if (ageHours < 1) {
    score += 10;
  } else if (ageHours < 24) {
    score += 7;
  } else if (ageHours < 72) {
    score += 4;
  }
  
  // Geolocation bonus (if available, +10 points)
  if (entity.latitude != null && entity.longitude != null) {
    score += 10;
  }
  
  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Determine risk label
  let label: RiskScoreResponse['risk_label'];
  if (score >= 80) {
    label = 'critical';
  } else if (score >= 60) {
    label = 'high';
  } else if (score >= 40) {
    label = 'medium';
  } else {
    label = 'low';
  }
  
  entity.risk_score = Math.round(score * 100) / 100;
  entity.risk_label = label;
  
  return entity;
}
