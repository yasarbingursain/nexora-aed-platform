/**
 * OSINT Orchestrator Service
 * Coordinates threat intelligence ingestion pipeline
 * Nexora AED Platform - Enterprise Grade
 */

import { logger } from '@/utils/logger';
import { fetchOtxLatest } from './otx.service';
import { enrichWithCensys } from './censys.service';
import { scoreEntities } from './risk-scoring.service';
import { toOcsfEvents } from '@/utils/ocsf.util';
import { upsertThreatEvents } from '@/repositories/threat-events.repository';
import type { ThreatEntity } from '@/types/osint.types';

interface OsintConfig {
  otxApiKey?: string;
  censysApiToken?: string;
  riskEngineUrl?: string;
  pollIntervalMs?: number;
  maxOtxIndicators?: number;
  maxCensysEnrichment?: number;
}

export class OsintOrchestrator {
  private config: OsintConfig;
  private isRunning: boolean = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(config: OsintConfig) {
    this.config = {
      pollIntervalMs: 5 * 60 * 1000, // 5 minutes default
      maxOtxIndicators: 50,
      maxCensysEnrichment: 50,
      ...config,
    };
  }

  /**
   * Start the orchestrator polling loop
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('OSINT orchestrator already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting OSINT orchestrator', {
      pollIntervalMs: this.config.pollIntervalMs,
    });

    // Run immediately
    this.runIngestionCycle().catch((error) => {
      logger.error('Initial ingestion cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Schedule recurring runs
    this.pollTimer = setInterval(() => {
      this.runIngestionCycle().catch((error) => {
        logger.error('Ingestion cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    logger.info('OSINT orchestrator stopped');
  }

  /**
   * Run a single ingestion cycle
   */
  private async runIngestionCycle(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting OSINT ingestion cycle');

    try {
      // Step 1: Fetch from OTX
      let entities: ThreatEntity[] = [];
      
      if (this.config.otxApiKey) {
        logger.info('Fetching indicators from OTX');
        entities = await fetchOtxLatest(
          this.config.otxApiKey,
          this.config.maxOtxIndicators
        );
        logger.info('OTX fetch complete', { count: entities.length });
      } else {
        logger.warn('OTX API key not configured, skipping OTX ingestion');
      }

      if (entities.length === 0) {
        logger.info('No entities to process, cycle complete');
        return;
      }

      // Step 2: Enrich with Censys (if configured)
      if (this.config.censysApiToken) {
        entities = await enrichWithCensys(
          entities,
          this.config.censysApiToken,
          this.config.maxCensysEnrichment
        );
        logger.info('Censys enrichment complete');
      } else {
        logger.warn('Censys credentials not configured, skipping enrichment');
      }

      // Step 3: Score with Risk Brain
      if (this.config.riskEngineUrl) {
        logger.info('Scoring entities with Risk Brain');
        entities = await scoreEntities(entities, this.config.riskEngineUrl);
        logger.info('Risk scoring complete');
      } else {
        logger.warn('Risk engine URL not configured, using default scoring');
        entities = await scoreEntities(entities, '');
      }

      // Step 4: Convert to OCSF format
      logger.info('Converting to OCSF format');
      const ocsfEvents = toOcsfEvents(entities);
      logger.info('OCSF conversion complete', { count: ocsfEvents.length });

      // Step 5: Upsert to database
      logger.info('Upserting to database');
      await upsertThreatEvents(ocsfEvents);
      logger.info('Database upsert complete');

      const duration = Date.now() - startTime;
      logger.info('OSINT ingestion cycle complete', {
        duration: `${duration}ms`,
        entitiesProcessed: entities.length,
      });
    } catch (error) {
      logger.error('OSINT ingestion cycle error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Run a single cycle manually (for testing/debugging)
   */
  async runOnce(): Promise<void> {
    await this.runIngestionCycle();
  }
}

/**
 * Create and configure orchestrator from environment
 */
export function createOrchestratorFromEnv(): OsintOrchestrator {
  const config: OsintConfig = {};

  if (process.env.OTX_API_KEY) config.otxApiKey = process.env.OTX_API_KEY;
  if (process.env.CENSYS_API_TOKEN) config.censysApiToken = process.env.CENSYS_API_TOKEN;
  if (process.env.RISK_ENGINE_URL) config.riskEngineUrl = process.env.RISK_ENGINE_URL;
  if (process.env.OSINT_POLL_INTERVAL_MS) {
    config.pollIntervalMs = parseInt(process.env.OSINT_POLL_INTERVAL_MS);
  }
  if (process.env.MAX_OTX_INDICATORS) {
    config.maxOtxIndicators = parseInt(process.env.MAX_OTX_INDICATORS);
  }
  if (process.env.MAX_CENSYS_ENRICHMENT) {
    config.maxCensysEnrichment = parseInt(process.env.MAX_CENSYS_ENRICHMENT);
  }

  return new OsintOrchestrator(config);
}
