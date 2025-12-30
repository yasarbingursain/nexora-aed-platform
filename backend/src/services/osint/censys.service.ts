/**
 * Censys Search Integration
 * IP enrichment with geolocation and metadata
 * Nexora AED Platform - Enterprise Grade
 */

import { logger } from '@/utils/logger';
import type { ThreatEntity } from '@/types/osint.types';

interface CensysLocation {
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

interface CensysHostView {
  ip: string;
  location?: CensysLocation;
  last_updated_at?: string;
  autonomous_system?: {
    asn?: number;
    name?: string;
    country_code?: string;
  };
  services?: Array<{
    port: number;
    service_name?: string;
  }>;
}

interface CensysHostResponse {
  result?: CensysHostView;
  error?: string;
}

/**
 * Create Bearer token header
 */
function createBearerAuth(apiToken: string): string {
  return `Bearer ${apiToken}`;
}

/**
 * Enrich threat entities with Censys geolocation data
 */
export async function enrichWithCensys(
  entities: ThreatEntity[],
  apiToken: string,
  maxIps: number = 50
): Promise<ThreatEntity[]> {
  if (!apiToken) {
    logger.warn('Censys API token not configured, skipping enrichment');
    return entities;
  }

  // Filter to IP addresses only
  const ipEntities = entities.filter(
    (e) => e.indicator_type === 'ipv4' || e.indicator_type === 'ipv6'
  ).slice(0, maxIps);

  if (ipEntities.length === 0) {
    logger.info('No IP addresses to enrich with Censys');
    return entities;
  }

  logger.info('Enriching IPs with Censys', { count: ipEntities.length });

  const authHeader = createBearerAuth(apiToken);
  let enrichedCount = 0;

  for (const entity of ipEntities) {
    try {
      const url = `https://search.censys.io/api/v2/hosts/${encodeURIComponent(entity.value)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout per IP
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.debug('IP not found in Censys', { ip: entity.value });
        } else if (response.status === 429) {
          logger.warn('Censys rate limit reached', { ip: entity.value });
          break; // Stop enriching to avoid further rate limiting
        } else {
          logger.warn('Censys API error', {
            ip: entity.value,
            status: response.status,
          });
        }
        continue;
      }

      const data = await response.json() as CensysHostResponse;
      const host = data.result;

      if (!host) {
        logger.debug('No Censys data for IP', { ip: entity.value });
        continue;
      }

      // Enrich with location data
      if (host.location) {
        if (host.location.country_code) {
          entity.country_code = host.location.country_code;
        }
        if (host.location.country) {
          entity.country_name = host.location.country;
        }
        if (host.location.city) {
          entity.city = host.location.city;
        }
        if (host.location.coordinates) {
          entity.latitude = host.location.coordinates.latitude;
          entity.longitude = host.location.coordinates.longitude;
        }
      }

      // Update last_seen if available
      if (host.last_updated_at) {
        entity.last_seen = host.last_updated_at;
      }

      // Add ASN info to tags
      if (host.autonomous_system?.name) {
        const tags = entity.tags || [];
        tags.push(`ASN:${host.autonomous_system.name}`);
        entity.tags = tags;
      }

      enrichedCount++;

      // Rate limiting: small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      logger.error('Censys enrichment error', {
        ip: entity.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Censys enrichment complete', {
    total: ipEntities.length,
    enriched: enrichedCount,
  });

  return entities;
}

/**
 * Search Censys for hosts matching criteria
 */
export async function searchCensysHosts(
  apiId: string,
  apiSecret: string,
  query: string,
  perPage: number = 50
): Promise<ThreatEntity[]> {
  if (!apiId || !apiSecret) {
    logger.warn('Censys API credentials not configured');
    return [];
  }

  try {
    const url = 'https://search.censys.io/api/v2/hosts/search';
    const authHeader = `Basic ${Buffer.from(`${apiId}:${apiSecret}`).toString('base64')}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        per_page: Math.min(perPage, 100),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.error('Censys search error', { status: response.status, query });
      return [];
    }

    const data = await response.json() as { result?: { hits?: any[] } };
    const hits = data.result?.hits || [];
    const now = new Date().toISOString();
    const entities: ThreatEntity[] = [];

    for (const hit of hits) {
      const entity: ThreatEntity = {
        id: `censys-${hit.ip}`,
        source: 'censys',
        indicator_type: hit.ip.includes(':') ? 'ipv6' : 'ipv4',
        value: hit.ip,
        first_seen: now,
        last_seen: hit.last_updated_at || now,
        severity: 5,
        sightings: 1,
      };

      // Add location data
      if (hit.location) {
        if (hit.location.country_code) entity.country_code = hit.location.country_code;
        if (hit.location.country) entity.country_name = hit.location.country;
        if (hit.location.city) entity.city = hit.location.city;
        if (hit.location.coordinates) {
          entity.latitude = hit.location.coordinates.latitude;
          entity.longitude = hit.location.coordinates.longitude;
        }
      }

      entities.push(entity);
    }

    logger.info('Censys search complete', { query, results: entities.length });

    return entities;
  } catch (error) {
    logger.error('Censys search error', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
