/**
 * Threat Intelligence Aggregator Service
 * Coordinates all threat intelligence sources
 * 
 * NO FAKE DATA - AGGREGATES REAL SOURCES ONLY
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { NISTNVDService } from './nist-nvd.service';
import { MITREAttackService } from './mitre-attack.service';
import { ThreatIntelIngestionService } from './ingestion.service';

const prisma = new PrismaClient();

export class ThreatIntelAggregatorService {
  private nistService: NISTNVDService;
  private mitreService: MITREAttackService;
  private ingestionService: ThreatIntelIngestionService;

  constructor() {
    this.nistService = new NISTNVDService();
    this.mitreService = new MITREAttackService();
    this.ingestionService = new ThreatIntelIngestionService();
  }

  /**
   * Aggregate all threat intelligence sources
   */
  async aggregateAllSources(): Promise<{
    nist: number;
    mitre: number;
    urlhaus: number;
    malwareBazaar: number;
    threatFox: number;
    total: number;
  }> {
    logger.info('Starting threat intelligence aggregation from all sources');

    const results = await Promise.allSettled([
      // NIST NVD - Official US Government CVE database
      this.aggregateNISTCVEs(),
      
      // MITRE ATT&CK - Official adversary tactics/techniques
      this.aggregateMITRETechniques(),
      
      // URLhaus - Malicious URLs (abuse.ch)
      this.ingestionService.ingestURLhaus(),
      
      // MalwareBazaar - Malware samples (abuse.ch)
      this.ingestionService.ingestMalwareBazaar(),
      
      // ThreatFox - IOCs (abuse.ch)
      this.ingestionService.ingestThreatFox(),
    ]);

    const counts = {
      nist: results[0].status === 'fulfilled' ? results[0].value : 0,
      mitre: results[1].status === 'fulfilled' ? results[1].value : 0,
      urlhaus: results[2].status === 'fulfilled' ? results[2].value : 0,
      malwareBazaar: results[3].status === 'fulfilled' ? results[3].value : 0,
      threatFox: results[4].status === 'fulfilled' ? results[4].value : 0,
      total: 0,
    };

    counts.total = Object.values(counts).reduce((sum, val) => sum + val, 0) - counts.total;

    logger.info('Threat intelligence aggregation complete', counts);

    return counts;
  }

  /**
   * Aggregate NIST NVD CVEs
   */
  private async aggregateNISTCVEs(): Promise<number> {
    try {
      const cves = await this.nistService.fetchRecentCriticalCVEs(7);
      const stored = await this.nistService.storeCVEsInDatabase(cves);
      return stored;
    } catch (error) {
      logger.error('Failed to aggregate NIST CVEs', { error });
      return 0;
    }
  }

  /**
   * Aggregate MITRE ATT&CK techniques
   */
  private async aggregateMITRETechniques(): Promise<number> {
    try {
      const techniques = await this.mitreService.fetchEnterpriseTechniques();
      const stored = await this.mitreService.storeTechniquesInDatabase(techniques);
      return stored;
    } catch (error) {
      logger.error('Failed to aggregate MITRE techniques', { error });
      return 0;
    }
  }

  /**
   * Get aggregated threat statistics
   */
  async getAggregatedStatistics(timeRange: string = '24h'): Promise<any> {
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    const [totalThreats, bySource, bySeverity, recentThreats] = await Promise.all([
      prisma.threat.count({
        where: {
          lastSeen: { gte: since },
        },
      }),
      prisma.threat.groupBy({
        by: ['source'],
        where: {
          lastSeen: { gte: since },
        },
        _count: true,
      }),
      prisma.threat.groupBy({
        by: ['severity'],
        where: {
          lastSeen: { gte: since },
        },
        _count: true,
      }),
      prisma.threat.findMany({
        where: {
          lastSeen: { gte: since },
        },
        orderBy: {
          lastSeen: 'desc',
        },
        take: 100,
        select: {
          id: true,
          externalId: true,
          source: true,
          type: true,
          severity: true,
          description: true,
          cvssScore: true,
          lastSeen: true,
          metadata: true,
        },
      }),
    ]);

    return {
      totalThreats,
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentThreats: recentThreats.map(threat => ({
        id: threat.externalId,
        source: threat.source,
        type: threat.type,
        severity: threat.severity,
        description: threat.description.substring(0, 200),
        score: threat.cvssScore,
        timestamp: threat.lastSeen,
        metadata: threat.metadata ? JSON.parse(threat.metadata) : {},
      })),
      sources: [
        'NIST_NVD',
        'MITRE_ATTCK',
        'URLhaus',
        'MalwareBazaar',
        'ThreatFox',
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Search threats across all sources
   */
  async searchThreats(query: string, limit: number = 50): Promise<any[]> {
    const threats = await prisma.threat.findMany({
      where: {
        OR: [
          { externalId: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: {
        lastSeen: 'desc',
      },
    });

    return threats.map(threat => ({
      id: threat.externalId,
      source: threat.source,
      type: threat.type,
      severity: threat.severity,
      description: threat.description,
      score: threat.cvssScore,
      timestamp: threat.lastSeen,
      metadata: threat.metadata ? JSON.parse(threat.metadata) : {},
    }));
  }
}
