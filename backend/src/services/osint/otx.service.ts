/**
 * AlienVault OTX (Open Threat Exchange) Integration
 * Real-time OSINT threat intelligence ingestion
 * Nexora AED Platform - Enterprise Grade
 */

import { logger } from '@/utils/logger';
import type { ThreatEntity, IndicatorType } from '@/types/osint.types';

interface OtxIndicator {
  id: number;
  indicator: string;
  type: string;
  created: string;
  modified: string;
  description?: string;
  title?: string;
  content?: string;
}

interface OtxPulse {
  id: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  indicators: OtxIndicator[];
  tags: string[];
}

interface OtxPulsesResponse {
  count: number;
  results: OtxPulse[];
}

interface OtxLatestResponse {
  results: OtxIndicator[];
  count?: number;
}

/**
 * Map OTX indicator type to standard indicator type
 */
function mapOtxType(otxType: string): IndicatorType {
  const lower = otxType.toLowerCase();
  
  if (lower.includes('ipv4') || lower === 'ip') return 'ipv4';
  if (lower.includes('ipv6')) return 'ipv6';
  if (lower.includes('domain') || lower.includes('hostname')) return 'domain';
  if (lower.includes('url')) return 'url';
  if (lower.includes('hash') || lower.includes('md5') || lower.includes('sha')) return 'hash';
  if (lower.includes('email')) return 'email';
  
  return 'other';
}

/**
 * Fetch latest indicators from OTX
 */
export async function fetchOtxLatest(apiKey: string, limit: number = 50): Promise<ThreatEntity[]> {
  if (!apiKey) {
    logger.warn('OTX API key not configured, skipping OTX ingestion');
    return [];
  }

  try {
    const url = `https://otx.alienvault.com/api/v1/pulses/subscribed?limit=${Math.min(limit, 50)}`;
    
    logger.info('Fetching latest pulses from OTX', { limit });

    const response = await fetch(url, {
      headers: {
        'X-OTX-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OTX API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return [];
    }

    const data = await response.json() as OtxPulsesResponse;
    
    if (!data.results || data.results.length === 0) {
      logger.info('No pulses returned from OTX');
      return [];
    }

    logger.info('OTX pulses fetched', { pulseCount: data.results.length });

    // Extract all indicators from all pulses
    const allIndicators: OtxIndicator[] = [];
    for (const pulse of data.results) {
      if (pulse.indicators && pulse.indicators.length > 0) {
        allIndicators.push(...pulse.indicators);
      }
    }

    if (allIndicators.length === 0) {
      logger.info('No indicators found in pulses');
      return [];
    }

    logger.info('Indicators extracted from pulses', { count: allIndicators.length });

    // Map OTX indicators to ThreatEntity format
    const now = new Date().toISOString();
    const entities: ThreatEntity[] = allIndicators.slice(0, limit).map((indicator) => {
      const entity: ThreatEntity = {
        id: `otx-${indicator.id}`,
        source: 'otx',
        indicator_type: mapOtxType(indicator.type),
        value: indicator.indicator,
        first_seen: indicator.created,
        last_seen: indicator.modified || now,
        severity: 5, // Default medium severity
        sightings: 1,
      };

      // Optional fields
      const desc = indicator.description || indicator.title || indicator.content;
      if (desc) entity.description = desc;
      if (indicator.type) entity.tags = [indicator.type];

      return entity;
    });

    logger.info('Successfully fetched OTX indicators', {
      total: entities.length,
      types: [...new Set(entities.map(e => e.indicator_type))],
    });

    return entities;
  } catch (error) {
    logger.error('OTX fetch error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Fetch specific pulse from OTX
 */
export async function fetchOtxPulse(apiKey: string, pulseId: string): Promise<ThreatEntity[]> {
  if (!apiKey) {
    logger.warn('OTX API key not configured');
    return [];
  }

  try {
    const url = `https://otx.alienvault.com/api/v1/pulses/${pulseId}`;
    
    const response = await fetch(url, {
      headers: {
        'X-OTX-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.error('OTX pulse fetch error', { pulseId, status: response.status });
      return [];
    }

    const pulse = await response.json() as OtxPulse;
    const now = new Date().toISOString();
    const entities: ThreatEntity[] = [];

    for (const indicator of pulse.indicators || []) {
      const entity: ThreatEntity = {
        id: `otx-pulse-${pulseId}-${indicator.id}`,
        source: 'otx',
        indicator_type: mapOtxType(indicator.type),
        value: indicator.indicator,
        first_seen: pulse.created || now,
        last_seen: pulse.modified || now,
        severity: 5,
        sightings: 1,
      };

      // Optional fields
      const desc = pulse.description || indicator.description;
      if (desc) entity.description = desc;
      
      const tags = [pulse.name, indicator.type].filter(Boolean);
      if (tags.length > 0) entity.tags = tags;

      entities.push(entity);
    }

    logger.info('Fetched OTX pulse', { pulseId, indicators: entities.length });

    return entities;
  } catch (error) {
    logger.error('OTX pulse fetch error', {
      pulseId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
