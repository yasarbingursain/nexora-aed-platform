/**
 * Enterprise Threat Intelligence Ingestion Service
 * Standards: NIST SP 800-150, OWASP ASVS 4.0, ISO 27001:2022 A.8.16
 * 
 * Security Controls:
 * - Rate limiting per source (prevent API bans)
 * - Input validation (prevent injection attacks)
 * - Circuit breaker pattern (prevent cascade failures)
 * - Audit logging (compliance requirement)
 * - Error handling with DLQ (dead letter queue)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { THREAT_INTEL_SOURCES, INGESTION_CONFIG, ThreatIntelSource } from './sources.config';
import { getEventBus } from '@/events/event-bus.factory';
import { ThreatIntelEvent } from '@/events/threat-intel.types';
import { z } from 'zod';
import CircuitBreaker from 'opossum';
import DOMPurify from 'isomorphic-dompurify';

const prisma = new PrismaClient();

// Validation schemas (OWASP ASVS 4.0 - Input Validation)
const URLhausResponseSchema = z.object({
  query_status: z.string(),
  urls: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    url_status: z.string(),
    threat: z.string(),
    tags: z.array(z.string()).optional(),
    dateadded: z.string(),
  })),
});

const MalwareBazaarResponseSchema = z.object({
  query_status: z.string(),
  data: z.array(z.object({
    sha256_hash: z.string().length(64),
    md5_hash: z.string().length(32),
    file_name: z.string(),
    file_type: z.string(),
    file_size: z.number(),
    signature: z.string().optional(),
    first_seen: z.string(),
    tags: z.array(z.string()).optional(),
  })),
});

const ThreatFoxResponseSchema = z.object({
  query_status: z.string(),
  data: z.array(z.object({
    id: z.string(),
    ioc: z.string(),
    ioc_type: z.string(),
    threat_type: z.string(),
    malware: z.string().optional(),
    confidence_level: z.number(),
    first_seen: z.string(),
    tags: z.array(z.string()).optional(),
  })),
});

export class ThreatIntelIngestionService {
  private httpClients: Map<string, AxiosInstance> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private eventBus = getEventBus();
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor() {
    this.initializeHttpClients();
    this.initializeCircuitBreakers();
  }

  /**
   * Initialize HTTP clients with security headers
   */
  private initializeHttpClients(): void {
    Object.entries(THREAT_INTEL_SOURCES).forEach(([key, source]) => {
      if (!source.enabled) return;

      const client = axios.create({
        baseURL: source.url,
        timeout: 30000,
        headers: {
          'User-Agent': 'Nexora-ThreatIntel/1.0',
          'Accept': 'application/json',
          ...(source.authentication?.type === 'api_key' && {
            [source.authentication.headerName!]: process.env[`${key.toUpperCase()}_API_KEY`],
          }),
        },
        // Security: Validate SSL certificates
        httpsAgent: {
          rejectUnauthorized: true,
        },
      });

      // Request interceptor for rate limiting
      client.interceptors.request.use(async (config) => {
        await this.enforceRateLimit(key, source);
        return config;
      });

      // Response interceptor for error handling
      client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
          logger.error(`HTTP error for ${key}`, {
            status: error.response?.status,
            message: error.message,
          });
          throw error;
        }
      );

      this.httpClients.set(key, client);
    });
  }

  /**
   * Initialize circuit breakers for each source
   */
  private initializeCircuitBreakers(): void {
    Object.keys(THREAT_INTEL_SOURCES).forEach((key) => {
      const breaker = new CircuitBreaker(
        async (fn: () => Promise<any>) => fn(),
        {
          timeout: INGESTION_CONFIG.circuitBreaker.timeout,
          errorThresholdPercentage: 50,
          resetTimeout: INGESTION_CONFIG.circuitBreaker.resetTimeout,
        }
      );

      breaker.on('open', () => {
        logger.warn(`Circuit breaker opened for ${key}`);
      });

      breaker.on('halfOpen', () => {
        logger.info(`Circuit breaker half-open for ${key}`);
      });

      breaker.on('close', () => {
        logger.info(`Circuit breaker closed for ${key}`);
      });

      this.circuitBreakers.set(key, breaker);
    });
  }

  /**
   * Enforce rate limiting per source
   */
  private async enforceRateLimit(key: string, source: ThreatIntelSource): Promise<void> {
    const now = Date.now();
    const limiter = this.rateLimiters.get(key) || { count: 0, resetAt: now };

    // Reset if period has elapsed
    if (now >= limiter.resetAt) {
      const periodMs = this.getPeriodInMs(source.rateLimit.period);
      this.rateLimiters.set(key, {
        count: 1,
        resetAt: now + periodMs,
      });
      return;
    }

    // Check if rate limit exceeded
    if (limiter.count >= source.rateLimit.requests) {
      const waitTime = limiter.resetAt - now;
      logger.warn(`Rate limit reached for ${key}, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimiters.delete(key);
      return this.enforceRateLimit(key, source);
    }

    // Increment counter
    this.rateLimiters.set(key, {
      count: limiter.count + 1,
      resetAt: limiter.resetAt,
    });
  }

  private getPeriodInMs(period: string): number {
    const periods: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }

  /**
   * Sanitize IOC value to prevent XSS
   */
  private sanitizeIocValue(value: string): string {
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
  }

  /**
   * Ingest malicious URLs from URLhaus
   */
  async ingestURLhaus(): Promise<number> {
    const source = THREAT_INTEL_SOURCES.urlhaus;
    if (!source.enabled) return 0;

    const breaker = this.circuitBreakers.get('urlhaus')!;
    const client = this.httpClients.get('urlhaus')!;

    try {
      const response = await breaker.fire(async () => {
        return await client.get(source.endpoints.recent);
      });

      // Validate response schema
      const validated = URLhausResponseSchema.parse(response.data);
      
      if (validated.query_status !== 'ok') {
        logger.warn('URLhaus query failed', { status: validated.query_status });
        return 0;
      }

      // Filter for malware_download only
      const maliciousUrls = validated.urls.filter((u) => u.threat === 'malware_download');

      // Batch insert to database
      const inserted = await this.batchInsertIOCs(
        maliciousUrls.map((url) => ({
          organization_id: 'global', // Global threat intel
          sample_id: null,
          ioc_type: 'url',
          ioc_value: this.sanitizeIocValue(url.url),
          threat_score: 0.95,
          is_known_malicious: true,
          threat_intel_sources: ['urlhaus'],
          extraction_method: 'api_ingestion',
          tags: url.tags || [],
          first_seen_at: new Date(url.dateadded),
          created_at: new Date(),
        }))
      );

      // Stream to EventBus for real-time processing
      await this.eventBus.publishThreatIntel({
        source: 'urlhaus',
        ioc_type: 'url',
        count: inserted,
        timestamp: new Date().toISOString(),
      });

      logger.info(`URLhaus: Ingested ${inserted} malicious URLs`);
      return inserted;

    } catch (error) {
      logger.error('URLhaus ingestion failed', { error });
      await this.sendToDeadLetterQueue('urlhaus', error);
      return 0;
    }
  }

  /**
   * Ingest malware samples from MalwareBazaar
   */
  async ingestMalwareBazaar(): Promise<number> {
    const source = THREAT_INTEL_SOURCES.malwarebazaar;
    if (!source.enabled) return 0;

    const breaker = this.circuitBreakers.get('malwarebazaar')!;
    const client = this.httpClients.get('malwarebazaar')!;

    try {
      const response = await breaker.fire(async () => {
        return await client.post(source.endpoints.recent, {
          selector: 'time',
        });
      });

      const validated = MalwareBazaarResponseSchema.parse(response.data);

      if (validated.query_status !== 'ok') {
        logger.warn('MalwareBazaar query failed');
        return 0;
      }

      // Insert into malware_samples table
      const inserted = await this.batchInsertSamples(
        validated.data.map((sample) => ({
          organization_id: 'global',
          submission_type: 'file',
          file_hash_sha256: sample.sha256_hash,
          file_hash_md5: sample.md5_hash,
          file_name: this.sanitizeIocValue(sample.file_name),
          file_size: BigInt(sample.file_size),
          file_type: sample.file_type,
          status: 'completed',
          risk_score: 0.9,
          risk_level: 'critical',
          is_malicious: true,
          malware_family: sample.signature || 'unknown',
          tags: sample.tags || [],
          created_at: new Date(sample.first_seen),
        }))
      );

      await this.eventBus.publishThreatIntel({
        source: 'malwarebazaar',
        ioc_type: 'malware_sample',
        count: inserted,
        timestamp: new Date().toISOString(),
        organization_id: 'global',
      });

      logger.info(`MalwareBazaar: Ingested ${inserted} malware samples`);
      return inserted;

    } catch (error) {
      logger.error('MalwareBazaar ingestion failed', { error });
      await this.sendToDeadLetterQueue('malwarebazaar', error);
      return 0;
    }
  }

  /**
   * Ingest IOCs from ThreatFox
   */
  async ingestThreatFox(): Promise<number> {
    const source = THREAT_INTEL_SOURCES.threatfox;
    if (!source.enabled) return 0;

    const breaker = this.circuitBreakers.get('threatfox')!;
    const client = this.httpClients.get('threatfox')!;

    try {
      const response = await breaker.fire(async () => {
        return await client.post(source.endpoints.recent, {
          query: 'get_iocs',
          days: 1,
        });
      });

      const validated = ThreatFoxResponseSchema.parse(response.data);

      if (validated.query_status !== 'ok') {
        logger.warn('ThreatFox query failed');
        return 0;
      }

      const inserted = await this.batchInsertIOCs(
        validated.data.map((ioc) => ({
          organization_id: 'global',
          sample_id: null,
          ioc_type: ioc.ioc_type,
          ioc_value: this.sanitizeIocValue(ioc.ioc),
          threat_score: ioc.confidence_level / 100,
          is_known_malicious: true,
          threat_intel_sources: ['threatfox'],
          extraction_method: 'api_ingestion',
          tags: ioc.tags || [],
          first_seen_at: new Date(ioc.first_seen),
          created_at: new Date(),
        }))
      );

      await this.eventBus.publishThreatIntel({
        source: 'threatfox',
        ioc_type: 'mixed',
        count: inserted,
        timestamp: new Date().toISOString(),
      });

      logger.info(`ThreatFox: Ingested ${inserted} IOCs`);
      return inserted;

    } catch (error) {
      logger.error('ThreatFox ingestion failed', { error });
      await this.sendToDeadLetterQueue('threatfox', error);
      return 0;
    }
  }

  /**
   * Batch insert IOCs with duplicate handling
   */
  private async batchInsertIOCs(iocs: any[]): Promise<number> {
    const batches = this.chunkArray(iocs, INGESTION_CONFIG.batchSize);
    let totalInserted = 0;

    for (const batch of batches) {
      try {
        const result = await prisma.malwareIoc.createMany({
          data: batch,
          skipDuplicates: true, // Prevent unique constraint violations
        });
        totalInserted += result.count;
      } catch (error) {
        logger.error('Batch insert failed', { error, batchSize: batch.length });
      }
    }

    return totalInserted;
  }

  /**
   * Batch insert malware samples
   */
  private async batchInsertSamples(samples: any[]): Promise<number> {
    const batches = this.chunkArray(samples, INGESTION_CONFIG.batchSize);
    let totalInserted = 0;

    for (const batch of batches) {
      try {
        const result = await prisma.malwareSample.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += result.count;
      } catch (error) {
        logger.error('Batch insert failed', { error });
      }
    }

    return totalInserted;
  }

  /**
   * Dead letter queue for failed ingestions
   */
  private async sendToDeadLetterQueue(source: string, error: any): Promise<void> {
    await prisma.ingestionFailure.create({
      data: {
        source,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? (error.stack || null) : null,
        retryCount: 0,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Main ingestion orchestrator
   */
  async ingestAll(): Promise<void> {
    logger.info('Starting threat intel ingestion cycle');

    const results = await Promise.allSettled([
      this.ingestURLhaus(),
      this.ingestMalwareBazaar(),
      this.ingestThreatFox(),
    ]);

    const totalIngested = results
      .filter((r) => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r as PromiseFulfilledResult<number>).value, 0);

    logger.info(`Ingestion cycle complete: ${totalIngested} total threats`);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Shutdown service and cleanup
   */
  async shutdown(): Promise<void> {
    await prisma.$disconnect();
  }
}
