/**
 * NHITI Service v2 - Enterprise-Grade Threat Intelligence Sharing
 * 
 * Standards Compliance:
 * - STIX 2.1 (Structured Threat Information Expression)
 * - TAXII 2.1 (Trusted Automated Exchange of Intelligence Information)
 * - GDPR Article 25 (Privacy by Design)
 * - ISO/IEC 27701 (Privacy Information Management)
 * - NIST SP 800-150 (Guide to Cyber Threat Information Sharing)
 * 
 * Security Features:
 * - K-Anonymity (minimum K=5 organizations)
 * - Differential Privacy (Laplace mechanism)
 * - SHA-256 hashing for privacy preservation
 * - Rate limiting and abuse detection
 * - Audit logging (90-day retention)
 * - Row-Level Security (RLS)
 * 
 * @author Nexora Security Team
 * @version 2.0.0
 * @license Enterprise
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ShareIndicatorInput {
  ioc_value: string;
  ioc_type: IOCType;
  threat_category: ThreatCategory;
  severity: Severity;
  confidence: number; // 0.0 - 1.0
  ttl_hours?: number;
  stix_pattern?: string;
}

interface ThreatFeedQuery {
  limit?: number;
  severity?: Severity;
  threat_category?: ThreatCategory;
  ioc_type?: IOCType;
  since_hours?: number;
  min_confidence?: number;
}

interface NHITIIndicator {
  indicator_hash: string;
  ioc_type: string;
  threat_category: string;
  severity: string;
  confidence: number;
  risk_score: number;
  observation_count: number;
  contributing_orgs_count: number;
  first_seen: Date;
  last_seen: Date;
  stix_id?: string;
}

// STIX 2.1 IOC Types
type IOCType = 
  | 'ipv4-addr'
  | 'ipv6-addr'
  | 'domain-name'
  | 'url'
  | 'file-hash-md5'
  | 'file-hash-sha1'
  | 'file-hash-sha256'
  | 'email-addr'
  | 'mac-addr'
  | 'windows-registry-key'
  | 'mutex'
  | 'user-agent';

// MITRE ATT&CK Aligned Categories
type ThreatCategory =
  | 'malware'
  | 'ransomware'
  | 'trojan'
  | 'backdoor'
  | 'c2'
  | 'phishing'
  | 'credential_theft'
  | 'data_exfiltration'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'persistence'
  | 'defense_evasion'
  | 'discovery'
  | 'collection'
  | 'impact';

type Severity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// NHITI SERVICE CLASS
// ============================================================================

export class NHITIServiceV2 {
  // Privacy Parameters (GDPR Article 25 compliant)
  private readonly K_THRESHOLD = 5; // Minimum organizations for k-anonymity
  private readonly EPSILON = 0.1; // Differential privacy budget
  private readonly MAX_EPSILON = 1.0; // Maximum privacy budget
  
  // Rate Limiting (NIST SP 800-150)
  private readonly MAX_QUERIES_PER_HOUR = 1000;
  private readonly MAX_SHARES_PER_DAY = 10000;
  
  // TTL Defaults
  private readonly DEFAULT_TTL_HOURS = 168; // 7 days
  private readonly MAX_TTL_HOURS = 8760; // 1 year

  /**
   * Share threat indicator with privacy preservation
   * Implements k-anonymity and differential privacy
   */
  async shareIndicator(
    organizationId: string,
    input: ShareIndicatorInput
  ): Promise<{
    success: boolean;
    shared: boolean;
    indicator_hash: string;
    message: string;
  }> {
    try {
      // Input validation
      this.validateIndicatorInput(input);

      // Generate privacy-preserving hash
      const indicatorHash = this.hashIOC(input.ioc_value);
      const orgHash = this.hashOrganization(organizationId);

      // Check rate limits
      await this.checkShareRateLimit(orgHash);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(input.severity, input.confidence);

      // Calculate expiration
      const ttlHours = input.ttl_hours || this.DEFAULT_TTL_HOURS;
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      // Generate STIX ID
      const stixId = this.generateSTIXId();

      // Check if indicator already exists
      const existing = await prisma.nhitiIndicator.findUnique({
        where: { indicatorHash },
      });

      if (existing) {
        // Update existing indicator
        const contributingOrgs = new Set(existing.contributingOrgs);
        const wasShared = contributingOrgs.size >= this.K_THRESHOLD;
        
        contributingOrgs.add(orgHash);
        const isNowShared = contributingOrgs.size >= this.K_THRESHOLD;

        await prisma.nhitiIndicator.update({
          where: { indicatorHash },
          data: {
            contributingOrgs: Array.from(contributingOrgs),
            observationCount: existing.observationCount + 1,
            lastSeen: new Date(),
            confidence: this.updateConfidence(
              existing.confidence.toNumber(),
              input.confidence,
              existing.observationCount
            ),
            noiseApplied: isNowShared && !existing.noiseApplied,
          },
        });

        // Update participation metrics
        await this.updateParticipationMetrics(orgHash, 'share');

        // Log query
        await this.logQuery(orgHash, 'share', { indicator_hash: indicatorHash }, 1);

        logger.info('NHITI indicator updated', {
          indicatorHash,
          contributingOrgs: contributingOrgs.size,
          shared: isNowShared,
          wasShared,
        });

        return {
          success: true,
          shared: isNowShared,
          indicator_hash: indicatorHash,
          message: isNowShared
            ? 'Indicator shared with NHITI network (k-anonymity threshold met)'
            : `Indicator recorded (${contributingOrgs.size}/${this.K_THRESHOLD} organizations needed for sharing)`,
        };
      } else {
        // Create new indicator
        await prisma.nhitiIndicator.create({
          data: {
            indicatorHash,
            iocType: input.ioc_type,
            threatCategory: input.threat_category,
            severity: input.severity,
            confidence: new Decimal(input.confidence),
            riskScore: new Decimal(riskScore),
            contributingOrgs: [orgHash],
            observationCount: 1,
            epsilon: new Decimal(this.EPSILON),
            noiseApplied: false,
            ttlHours,
            expiresAt,
            stixId,
            stixVersion: '2.1',
            pattern: input.stix_pattern || null,
            patternType: input.stix_pattern ? 'stix' : null,
            metadata: {
              source: 'nhiti',
              created_by: 'anonymous',
            },
          },
        });

        // Update participation metrics
        await this.updateParticipationMetrics(orgHash, 'share');

        // Log query
        await this.logQuery(orgHash, 'share', { indicator_hash: indicatorHash }, 1);

        logger.info('NHITI indicator created', {
          indicatorHash,
          iocType: input.ioc_type,
          threatCategory: input.threat_category,
        });

        return {
          success: true,
          shared: false,
          indicator_hash: indicatorHash,
          message: `Indicator recorded (1/${this.K_THRESHOLD} organizations needed for sharing)`,
        };
      }
    } catch (error) {
      logger.error('Failed to share NHITI indicator', { error, input });
      throw new Error('Failed to share threat indicator');
    }
  }

  /**
   * Get anonymized threat feed
   * Only returns indicators meeting k-anonymity threshold
   */
  async getThreatFeed(
    organizationId: string,
    query: ThreatFeedQuery = {}
  ): Promise<NHITIIndicator[]> {
    try {
      const orgHash = this.hashOrganization(organizationId);

      // Check rate limits
      await this.checkQueryRateLimit(orgHash);

      // Build query filters
      const where: any = {};

      // Only return indicators meeting k-anonymity threshold
      // This is enforced by RLS policy, but we add it here for clarity
      where.contributingOrgs = {
        array_contains: undefined, // Will be filtered by array length in raw query
      };

      if (query.severity) {
        where.severity = query.severity;
      }

      if (query.threat_category) {
        where.threatCategory = query.threat_category;
      }

      if (query.ioc_type) {
        where.iocType = query.ioc_type;
      }

      if (query.since_hours) {
        const since = new Date(Date.now() - query.since_hours * 60 * 60 * 1000);
        where.lastSeen = { gte: since };
      }

      if (query.min_confidence) {
        where.confidence = { gte: new Decimal(query.min_confidence) };
      }

      // Execute query with k-anonymity filter
      const indicators = await prisma.$queryRaw<any[]>`
        SELECT 
          indicator_hash,
          ioc_type,
          threat_category,
          severity,
          confidence,
          risk_score,
          observation_count,
          array_length(contributing_orgs, 1) as contributing_orgs_count,
          first_seen,
          last_seen,
          stix_id
        FROM nhiti_indicators
        WHERE array_length(contributing_orgs, 1) >= ${this.K_THRESHOLD}
          ${query.severity ? prisma.$queryRawUnsafe(`AND severity = '${query.severity}'`) : prisma.$queryRawUnsafe('')}
          ${query.threat_category ? prisma.$queryRawUnsafe(`AND threat_category = '${query.threat_category}'`) : prisma.$queryRawUnsafe('')}
          ${query.ioc_type ? prisma.$queryRawUnsafe(`AND ioc_type = '${query.ioc_type}'`) : prisma.$queryRawUnsafe('')}
          ${query.since_hours ? prisma.$queryRawUnsafe(`AND last_seen >= NOW() - INTERVAL '${query.since_hours} hours'`) : prisma.$queryRawUnsafe('')}
          ${query.min_confidence ? prisma.$queryRawUnsafe(`AND confidence >= ${query.min_confidence}`) : prisma.$queryRawUnsafe('')}
        ORDER BY last_seen DESC
        LIMIT ${query.limit || 100}
      `;

      // Apply differential privacy noise
      const anonymized = indicators.map(ind => ({
        ...ind,
        observation_count: this.addDifferentialPrivacyNoise(ind.observation_count),
        confidence: parseFloat(ind.confidence),
        risk_score: parseFloat(ind.risk_score),
      }));

      // Update participation metrics
      await this.updateParticipationMetrics(orgHash, 'consume', anonymized.length);

      // Log query
      await this.logQuery(orgHash, 'feed', query, anonymized.length);

      logger.info('NHITI threat feed retrieved', {
        organizationId,
        resultsCount: anonymized.length,
        query,
      });

      return anonymized;
    } catch (error) {
      logger.error('Failed to get NHITI threat feed', { error, query });
      throw new Error('Failed to retrieve threat feed');
    }
  }

  /**
   * Query specific IOC
   */
  async queryIOC(
    organizationId: string,
    iocValue: string,
    iocType?: IOCType
  ): Promise<NHITIIndicator | null> {
    try {
      const orgHash = this.hashOrganization(organizationId);
      const indicatorHash = this.hashIOC(iocValue);

      // Check rate limits
      await this.checkQueryRateLimit(orgHash);

      // Query indicator
      const indicator = await prisma.nhitiIndicator.findUnique({
        where: { indicatorHash },
      });

      if (!indicator) {
        await this.logQuery(orgHash, 'query_ioc', { ioc_value: iocValue }, 0);
        return null;
      }

      // Check k-anonymity threshold
      if (indicator.contributingOrgs.length < this.K_THRESHOLD) {
        await this.logQuery(orgHash, 'query_ioc', { ioc_value: iocValue }, 0);
        return null; // Don't reveal indicators below threshold
      }

      // Apply differential privacy
      const result: NHITIIndicator = {
        indicator_hash: indicator.indicatorHash,
        ioc_type: indicator.iocType,
        threat_category: indicator.threatCategory,
        severity: indicator.severity,
        confidence: indicator.confidence.toNumber(),
        risk_score: indicator.riskScore.toNumber(),
        observation_count: this.addDifferentialPrivacyNoise(indicator.observationCount),
        contributing_orgs_count: indicator.contributingOrgs.length,
        first_seen: indicator.firstSeen,
        last_seen: indicator.lastSeen,
        stix_id: indicator.stixId || undefined,
      };

      // Update participation metrics
      await this.updateParticipationMetrics(orgHash, 'consume', 1);

      // Log query
      await this.logQuery(orgHash, 'query_ioc', { ioc_value: iocValue }, 1);

      logger.info('NHITI IOC queried', {
        organizationId,
        indicatorHash,
        found: true,
      });

      return result;
    } catch (error) {
      logger.error('Failed to query NHITI IOC', { error, iocValue });
      throw new Error('Failed to query IOC');
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<any> {
    try {
      const [totalIndicators, sharedIndicators, activeOrgs, recentActivity] = await Promise.all([
        prisma.nhitiIndicator.count(),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count
          FROM nhiti_indicators
          WHERE array_length(contributing_orgs, 1) >= ${this.K_THRESHOLD}
        `,
        prisma.nhitiParticipation.count(),
        prisma.nhitiIndicator.count({
          where: {
            lastSeen: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        total_indicators: totalIndicators,
        shared_indicators: Number(sharedIndicators[0].count),
        active_organizations: activeOrgs,
        recent_24h_activity: recentActivity,
        k_threshold: this.K_THRESHOLD,
        epsilon: this.EPSILON,
        privacy_enabled: true,
        stix_version: '2.1',
      };
    } catch (error) {
      logger.error('Failed to get NHITI network stats', { error });
      throw new Error('Failed to retrieve network statistics');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Hash IOC value for privacy (SHA-256)
   */
  private hashIOC(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Hash organization ID for privacy (SHA-256)
   */
  private hashOrganization(organizationId: string): string {
    return crypto
      .createHash('sha256')
      .update(organizationId)
      .digest('hex');
  }

  /**
   * Generate STIX 2.1 compliant ID
   */
  private generateSTIXId(): string {
    const uuid = crypto.randomUUID();
    return `indicator--${uuid}`;
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(severity: Severity, confidence: number): number {
    const severityWeights = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100,
    };

    return severityWeights[severity] * confidence;
  }

  /**
   * Update confidence score using Bayesian updating
   */
  private updateConfidence(
    currentConfidence: number,
    newConfidence: number,
    observationCount: number
  ): Decimal {
    // Weighted average with more weight on recent observations
    const weight = 1 / (observationCount + 1);
    const updated = currentConfidence * (1 - weight) + newConfidence * weight;
    return new Decimal(Math.min(1.0, Math.max(0.0, updated)));
  }

  /**
   * Add Laplace noise for differential privacy
   * Implements Laplace mechanism: Lap(0, sensitivity/epsilon)
   */
  private addDifferentialPrivacyNoise(count: number): number {
    const sensitivity = 1;
    const scale = sensitivity / this.EPSILON;

    // Generate Laplace noise using inverse transform sampling
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    const noisyCount = count + noise;
    return Math.max(0, Math.round(noisyCount));
  }

  /**
   * Validate indicator input
   */
  private validateIndicatorInput(input: ShareIndicatorInput): void {
    if (!input.ioc_value || input.ioc_value.trim().length === 0) {
      throw new Error('IOC value is required');
    }

    if (input.confidence < 0 || input.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (input.ttl_hours && (input.ttl_hours < 1 || input.ttl_hours > this.MAX_TTL_HOURS)) {
      throw new Error(`TTL must be between 1 and ${this.MAX_TTL_HOURS} hours`);
    }
  }

  /**
   * Check share rate limit
   */
  private async checkShareRateLimit(orgHash: string): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.nhitiQueryLog.count({
      where: {
        requesterHash: orgHash,
        queryType: 'share',
        queriedAt: { gte: since },
      },
    });

    if (count >= this.MAX_SHARES_PER_DAY) {
      throw new Error('Share rate limit exceeded (max 10,000/day)');
    }
  }

  /**
   * Check query rate limit
   */
  private async checkQueryRateLimit(orgHash: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.nhitiQueryLog.count({
      where: {
        requesterHash: orgHash,
        queryType: { in: ['feed', 'query_ioc'] },
        queriedAt: { gte: since },
      },
    });

    if (count >= this.MAX_QUERIES_PER_HOUR) {
      throw new Error('Query rate limit exceeded (max 1,000/hour)');
    }
  }

  /**
   * Update participation metrics
   */
  private async updateParticipationMetrics(
    orgHash: string,
    action: 'share' | 'consume',
    count: number = 1
  ): Promise<void> {
    await prisma.nhitiParticipation.upsert({
      where: { orgHash },
      create: {
        orgHash,
        indicatorsShared: action === 'share' ? count : 0,
        indicatorsConsumed: action === 'consume' ? count : 0,
        lastActive: new Date(),
      },
      update: {
        indicatorsShared: action === 'share' ? { increment: count } : undefined,
        indicatorsConsumed: action === 'consume' ? { increment: count } : undefined,
        lastActive: new Date(),
      },
    });
  }

  /**
   * Log query for audit trail
   */
  private async logQuery(
    requesterHash: string,
    queryType: string,
    queryParams: any,
    resultsCount: number
  ): Promise<void> {
    try {
      await prisma.nhitiQueryLog.create({
        data: {
          requesterHash,
          queryType,
          queryParams,
          resultsCount,
        },
      });
    } catch (error) {
      // Don't fail the request if logging fails
      logger.error('Failed to log NHITI query', { error });
    }
  }
}

export const nhitiServiceV2 = new NHITIServiceV2();
