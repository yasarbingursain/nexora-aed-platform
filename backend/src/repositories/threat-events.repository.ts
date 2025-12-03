/**
 * Threat Events Repository
 * Database operations for OCSF threat events
 * Nexora AED Platform - Enterprise Grade
 */

import { pool } from '@/config/database';
import { logger } from '@/utils/logger';
import type { OcsfThreatEvent } from '@/types/osint.types';

/**
 * Upsert threat events to database
 */
export async function upsertThreatEvents(events: OcsfThreatEvent[]): Promise<void> {
  if (!events.length) {
    logger.debug('No threat events to upsert');
    return;
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const event of events) {
      await client.query(
        `
        INSERT INTO threat_events (
          external_id, source, indicator_type, value,
          category_uid, category_name, class_uid, class_name, type_uid, type_name,
          activity_id, activity_name, severity_id, severity, status_id, status,
          risk_score, risk_label, confidence,
          description, sightings, tags,
          country_code, country_name, city, latitude, longitude,
          first_seen, last_seen, expires_at,
          actor, resource, metadata, finding_info, observables,
          organization_id,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27,
          $28, $29, $30, $31, $32, $33, $34, $35, $36,
          now(), now()
        )
        ON CONFLICT (external_id)
        DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          risk_label = EXCLUDED.risk_label,
          confidence = EXCLUDED.confidence,
          severity_id = EXCLUDED.severity_id,
          severity = EXCLUDED.severity,
          status_id = EXCLUDED.status_id,
          status = EXCLUDED.status,
          last_seen = EXCLUDED.last_seen,
          expires_at = EXCLUDED.expires_at,
          description = EXCLUDED.description,
          sightings = EXCLUDED.sightings,
          tags = EXCLUDED.tags,
          country_code = EXCLUDED.country_code,
          country_name = EXCLUDED.country_name,
          city = EXCLUDED.city,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          actor = EXCLUDED.actor,
          resource = EXCLUDED.resource,
          metadata = EXCLUDED.metadata,
          finding_info = EXCLUDED.finding_info,
          observables = EXCLUDED.observables,
          updated_at = now()
        `,
        [
          event.external_id, event.source, event.indicator_type, event.value,
          event.category_uid, event.category_name, event.class_uid, event.class_name,
          event.type_uid, event.type_name,
          event.activity_id, event.activity_name, event.severity_id, event.severity,
          event.status_id, event.status,
          event.risk_score, event.risk_label, event.confidence || null,
          event.description || null, event.sightings || null, event.tags || null,
          event.country_code || null, event.country_name || null, event.city || null,
          event.latitude || null, event.longitude || null,
          event.first_seen, event.last_seen, event.expires_at || null,
          JSON.stringify(event.actor), JSON.stringify(event.resource),
          JSON.stringify(event.metadata), JSON.stringify(event.finding_info),
          event.observables ? JSON.stringify(event.observables) : null,
          event.organization_id || null,
        ]
      );
    }

    await client.query('COMMIT');
    
    logger.info('Upserted threat events', { count: events.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to upsert threat events', {
      error: error instanceof Error ? error.message : 'Unknown error',
      count: events.length,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get latest threat events
 */
export async function getLatestThreatEvents(limit: number = 100, organizationId?: string) {
  const client = await pool.connect();
  
  try {
    const query = organizationId
      ? 'SELECT * FROM threat_events WHERE organization_id = $1 OR organization_id IS NULL ORDER BY last_seen DESC LIMIT $2'
      : 'SELECT * FROM threat_events ORDER BY last_seen DESC LIMIT $1';
    
    const params = organizationId ? [organizationId, limit] : [limit];
    const result = await client.query(query, params);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get threat events for map visualization (with geolocation)
 */
export async function getThreatEventsForMap(limit: number = 200, organizationId?: string) {
  const client = await pool.connect();
  
  try {
    const query = organizationId
      ? `SELECT * FROM threat_events 
         WHERE (organization_id = $1 OR organization_id IS NULL)
         AND latitude IS NOT NULL AND longitude IS NOT NULL
         ORDER BY risk_score DESC, last_seen DESC LIMIT $2`
      : `SELECT * FROM threat_events 
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL
         ORDER BY risk_score DESC, last_seen DESC LIMIT $1`;
    
    const params = organizationId ? [organizationId, limit] : [limit];
    const result = await client.query(query, params);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get threat statistics
 */
export async function getThreatStatistics(organizationId?: string) {
  const client = await pool.connect();
  
  try {
    const whereClause = organizationId 
      ? 'WHERE organization_id = $1 OR organization_id IS NULL'
      : '';
    const params = organizationId ? [organizationId] : [];
    
    const result = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low,
        COUNT(*) FILTER (WHERE status_id = 1) as new_threats,
        AVG(risk_score) as avg_risk_score,
        COUNT(DISTINCT source) as sources
       FROM threat_events ${whereClause}`,
      params
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}
