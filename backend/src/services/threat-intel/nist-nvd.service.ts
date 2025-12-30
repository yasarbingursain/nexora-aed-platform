/**
 * NIST National Vulnerability Database (NVD) Integration Service
 * Standards: NIST SP 800-150, CVE/CVSS 3.1
 * 
 * Real-time CVE data from official NIST NVD API
 * NO FAKE DATA - ALL FROM OFFICIAL GOVERNMENT SOURCE
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import CircuitBreaker from 'opossum';

const prisma = new PrismaClient();

// NIST NVD API Response Schema (Official Structure)
const CVEItemSchema = z.object({
  cve: z.object({
    id: z.string(),
    sourceIdentifier: z.string().optional(),
    published: z.string(),
    lastModified: z.string(),
    vulnStatus: z.string().optional(),
    descriptions: z.array(z.object({
      lang: z.string(),
      value: z.string(),
    })),
    metrics: z.object({
      cvssMetricV31: z.array(z.object({
        source: z.string(),
        type: z.string(),
        cvssData: z.object({
          version: z.string(),
          vectorString: z.string(),
          attackVector: z.string(),
          attackComplexity: z.string(),
          privilegesRequired: z.string(),
          userInteraction: z.string(),
          scope: z.string(),
          confidentialityImpact: z.string(),
          integrityImpact: z.string(),
          availabilityImpact: z.string(),
          baseScore: z.number(),
          baseSeverity: z.string(),
        }),
        exploitabilityScore: z.number().optional(),
        impactScore: z.number().optional(),
      })).optional(),
      cvssMetricV2: z.array(z.any()).optional(),
    }).optional(),
    weaknesses: z.array(z.object({
      source: z.string(),
      type: z.string(),
      description: z.array(z.object({
        lang: z.string(),
        value: z.string(),
      })),
    })).optional(),
    configurations: z.array(z.any()).optional(),
    references: z.array(z.object({
      url: z.string(),
      source: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })).optional(),
  }),
});

const NVDResponseSchema = z.object({
  resultsPerPage: z.number(),
  startIndex: z.number(),
  totalResults: z.number(),
  format: z.string(),
  version: z.string(),
  timestamp: z.string(),
  vulnerabilities: z.array(z.object({
    cve: CVEItemSchema.shape.cve,
  })),
});

interface CVEData {
  id: string;
  severity: string;
  score: number;
  description: string;
  published: Date;
  lastModified: Date;
  vectorString: string;
  attackVector: string;
  references: string[];
  weaknesses: string[];
  affectedProducts: string[];
}

export class NISTNVDService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private readonly API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
  private readonly RATE_LIMIT = {
    withApiKey: 50, // requests per 30 seconds
    withoutApiKey: 5, // requests per 30 seconds
  };
  private requestCount = 0;
  private resetTime = Date.now() + 30000;

  constructor() {
    this.client = axios.create({
      baseURL: this.API_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'Nexora-AED-Platform/1.0',
        'Accept': 'application/json',
        ...(process.env.NIST_NVD_API_KEY && {
          'apiKey': process.env.NIST_NVD_API_KEY,
        }),
      },
    });

    // Circuit breaker to prevent overwhelming NIST servers
    this.circuitBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
      }
    );

    this.circuitBreaker.on('open', () => {
      logger.warn('NIST NVD circuit breaker opened - too many failures');
    });
  }

  /**
   * Enforce NIST NVD rate limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if period elapsed
    if (now >= this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 30000;
    }

    const limit = process.env.NIST_NVD_API_KEY 
      ? this.RATE_LIMIT.withApiKey 
      : this.RATE_LIMIT.withoutApiKey;

    if (this.requestCount >= limit) {
      const waitTime = this.resetTime - now;
      logger.info(`NIST NVD rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 30000;
    }

    this.requestCount++;
  }

  /**
   * Fetch recent high/critical CVEs from NIST NVD
   */
  async fetchRecentCriticalCVEs(daysBack: number = 7): Promise<CVEData[]> {
    await this.enforceRateLimit();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    try {
      const response = await this.circuitBreaker.fire(async () => {
        return await this.client.get('', {
          params: {
            lastModStartDate: startDate.toISOString(),
            lastModEndDate: endDate.toISOString(),
            cvssV3Severity: 'HIGH,CRITICAL',
            resultsPerPage: 100,
            startIndex: 0,
          },
        });
      });

      // Validate response against official NIST schema
      const validated = NVDResponseSchema.parse(response.data);

      const cves: CVEData[] = validated.vulnerabilities.map(vuln => {
        const cve = vuln.cve;
        const cvssV3 = cve.metrics?.cvssMetricV31?.[0];
        const description = cve.descriptions.find(d => d.lang === 'en')?.value || 'No description available';

        return {
          id: cve.id,
          severity: this.mapSeverity(cvssV3?.cvssData.baseSeverity || 'MEDIUM'),
          score: cvssV3?.cvssData.baseScore || 0,
          description,
          published: new Date(cve.published),
          lastModified: new Date(cve.lastModified),
          vectorString: cvssV3?.cvssData.vectorString || '',
          attackVector: cvssV3?.cvssData.attackVector || 'UNKNOWN',
          references: cve.references?.map(ref => ref.url) || [],
          weaknesses: cve.weaknesses?.flatMap(w => 
            w.description.map(d => d.value)
          ) || [],
          affectedProducts: this.extractAffectedProducts(cve),
        };
      });

      logger.info(`Fetched ${cves.length} CVEs from NIST NVD`, {
        daysBack,
        totalResults: validated.totalResults,
      });

      return cves;

    } catch (error) {
      logger.error('Failed to fetch NIST NVD data', { error });
      throw error;
    }
  }

  /**
   * Store CVEs in database with deduplication
   */
  async storeCVEsInDatabase(cves: CVEData[]): Promise<number> {
    let stored = 0;

    for (const cve of cves) {
      try {
        await prisma.threat.upsert({
          where: {
            externalId: cve.id,
          },
          update: {
            severity: cve.severity,
            description: cve.description,
            cvssScore: cve.score,
            lastSeen: new Date(),
            metadata: JSON.stringify({
              vectorString: cve.vectorString,
              attackVector: cve.attackVector,
              references: cve.references,
              weaknesses: cve.weaknesses,
              affectedProducts: cve.affectedProducts,
              published: cve.published,
              lastModified: cve.lastModified,
            }),
          },
          create: {
            externalId: cve.id,
            source: 'NIST_NVD',
            type: 'vulnerability',
            severity: cve.severity,
            description: cve.description,
            cvssScore: cve.score,
            firstSeen: new Date(),
            lastSeen: new Date(),
            organizationId: 'global', // Global threat intelligence
            status: 'active',
            metadata: JSON.stringify({
              vectorString: cve.vectorString,
              attackVector: cve.attackVector,
              references: cve.references,
              weaknesses: cve.weaknesses,
              affectedProducts: cve.affectedProducts,
              published: cve.published,
              lastModified: cve.lastModified,
            }),
          },
        });

        stored++;
      } catch (error) {
        logger.error(`Failed to store CVE ${cve.id}`, { error });
      }
    }

    logger.info(`Stored ${stored}/${cves.length} CVEs in database`);
    return stored;
  }

  /**
   * Get CVE statistics for dashboard
   */
  async getCVEStatistics(timeRange: string = '24h'): Promise<any> {
    const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    const [total, critical, high, medium, low] = await Promise.all([
      prisma.threat.count({
        where: {
          source: 'NIST_NVD',
          lastSeen: { gte: since },
        },
      }),
      prisma.threat.count({
        where: {
          source: 'NIST_NVD',
          severity: 'critical',
          lastSeen: { gte: since },
        },
      }),
      prisma.threat.count({
        where: {
          source: 'NIST_NVD',
          severity: 'high',
          lastSeen: { gte: since },
        },
      }),
      prisma.threat.count({
        where: {
          source: 'NIST_NVD',
          severity: 'medium',
          lastSeen: { gte: since },
        },
      }),
      prisma.threat.count({
        where: {
          source: 'NIST_NVD',
          severity: 'low',
          lastSeen: { gte: since },
        },
      }),
    ]);

    return {
      total,
      critical,
      high,
      medium,
      low,
      source: 'NIST National Vulnerability Database',
      lastUpdated: new Date(),
    };
  }

  /**
   * Search CVEs by keyword
   */
  async searchCVEs(keyword: string, limit: number = 20): Promise<CVEData[]> {
    await this.enforceRateLimit();

    try {
      const response = await this.circuitBreaker.fire(async () => {
        return await this.client.get('', {
          params: {
            keywordSearch: keyword,
            resultsPerPage: limit,
            startIndex: 0,
          },
        });
      });

      const validated = NVDResponseSchema.parse(response.data);

      return validated.vulnerabilities.map(vuln => {
        const cve = vuln.cve;
        const cvssV3 = cve.metrics?.cvssMetricV31?.[0];

        return {
          id: cve.id,
          severity: this.mapSeverity(cvssV3?.cvssData.baseSeverity || 'MEDIUM'),
          score: cvssV3?.cvssData.baseScore || 0,
          description: cve.descriptions.find(d => d.lang === 'en')?.value || '',
          published: new Date(cve.published),
          lastModified: new Date(cve.lastModified),
          vectorString: cvssV3?.cvssData.vectorString || '',
          attackVector: cvssV3?.cvssData.attackVector || 'UNKNOWN',
          references: cve.references?.map(ref => ref.url) || [],
          weaknesses: cve.weaknesses?.flatMap(w => 
            w.description.map(d => d.value)
          ) || [],
          affectedProducts: this.extractAffectedProducts(cve),
        };
      });

    } catch (error) {
      logger.error('CVE search failed', { keyword, error });
      return [];
    }
  }

  private mapSeverity(nvdSeverity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low',
      'NONE': 'info',
    };
    return map[nvdSeverity.toUpperCase()] || 'medium';
  }

  private extractAffectedProducts(cve: any): string[] {
    const products = new Set<string>();

    cve.configurations?.forEach((config: any) => {
      config.nodes?.forEach((node: any) => {
        node.cpeMatch?.forEach((cpe: any) => {
          if (cpe.criteria) {
            // CPE format: cpe:2.3:a:vendor:product:version:...
            const parts = cpe.criteria.split(':');
            if (parts.length >= 5) {
              const vendor = parts[3];
              const product = parts[4];
              if (vendor && product) {
                products.add(`${vendor}/${product}`);
              }
            }
          }
        });
      });
    });

    return Array.from(products);
  }
}
