/**
 * SOAR (Security Orchestration, Automation and Response) Service
 * Automated blocklist generation for WAF/Gateway integration
 * Nexora AED Platform - Enterprise Grade
 */

import { pool } from '@/config/database';
import { logger } from '@/utils/logger';
import type { SoarBlocklist } from '@/types/osint.types';

/**
 * Build blocklist from threat events
 */
export async function buildBlocklist(
  minRiskScore: number = 60,
  maxItems: number = 500,
  organizationId?: string
): Promise<SoarBlocklist> {
  const client = await pool.connect();
  
  try {
    const whereClause = organizationId
      ? 'WHERE risk_score >= $1 AND (organization_id = $2 OR organization_id IS NULL)'
      : 'WHERE risk_score >= $1';
    
    const params = organizationId ? [minRiskScore, organizationId, maxItems] : [minRiskScore, maxItems];
    const limitParam = organizationId ? '$3' : '$2';
    
    const result = await client.query(
      `SELECT indicator_type, value, source
       FROM threat_events
       ${whereClause}
       ORDER BY risk_score DESC, last_seen DESC
       LIMIT ${limitParam}`,
      params
    );

    const ips = new Set<string>();
    const domains = new Set<string>();
    const urls = new Set<string>();
    const sources = new Set<string>();

    for (const row of result.rows) {
      const type = row.indicator_type as string;
      const value = row.value as string;
      sources.add(row.source);

      if (type === 'ipv4' || type === 'ipv6') {
        ips.add(value);
      } else if (type === 'domain') {
        domains.add(value);
      } else if (type === 'url') {
        urls.add(value);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const blocklist: SoarBlocklist = {
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      total_items: ips.size + domains.size + urls.size,
      ips: Array.from(ips),
      domains: Array.from(domains),
      urls: Array.from(urls),
      metadata: {
        min_risk_score: minRiskScore,
        max_items: maxItems,
        sources: Array.from(sources),
      },
    };

    logger.info('Generated SOAR blocklist', {
      ips: ips.size,
      domains: domains.size,
      urls: urls.size,
      total: blocklist.total_items,
      minRiskScore,
    });

    return blocklist;
  } finally {
    client.release();
  }
}

/**
 * Get blocklist statistics
 */
export async function getBlocklistStats(organizationId?: string) {
  const client = await pool.connect();
  
  try {
    const whereClause = organizationId
      ? 'WHERE organization_id = $1 OR organization_id IS NULL'
      : '';
    const params = organizationId ? [organizationId] : [];
    
    const result = await client.query(
      `SELECT 
        COUNT(*) FILTER (WHERE risk_score >= 80) as critical_threats,
        COUNT(*) FILTER (WHERE risk_score >= 60) as high_threats,
        COUNT(*) FILTER (WHERE indicator_type IN ('ipv4', 'ipv6')) as total_ips,
        COUNT(*) FILTER (WHERE indicator_type = 'domain') as total_domains,
        COUNT(*) FILTER (WHERE indicator_type = 'url') as total_urls
       FROM threat_events ${whereClause}`,
      params
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}
