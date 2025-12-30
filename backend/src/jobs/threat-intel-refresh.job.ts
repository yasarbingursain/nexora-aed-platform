/**
 * Threat Intelligence Refresh Job
 * Scheduled job to fetch and update threat intelligence from all sources
 * 
 * NO FAKE DATA - FETCHES FROM REAL SOURCES ONLY
 */

import { ThreatIntelAggregatorService } from '../services/threat-intel/aggregator.service';
import { logger } from '../utils/logger';

export class ThreatIntelRefreshJob {
  private aggregator: ThreatIntelAggregatorService;
  private isRunning = false;

  constructor() {
    this.aggregator = new ThreatIntelAggregatorService();
  }

  /**
   * Execute threat intelligence refresh
   */
  async execute(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Threat intelligence refresh already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting threat intelligence refresh job');

      const counts = await this.aggregator.aggregateAllSources();

      const duration = Date.now() - startTime;

      logger.info('Threat intelligence refresh completed', {
        counts,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Threat intelligence refresh failed', { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Schedule job to run at specified interval
   */
  schedule(intervalMinutes: number = 30): NodeJS.Timeout {
    logger.info(`Scheduling threat intelligence refresh every ${intervalMinutes} minutes`);

    // Run immediately on startup
    this.execute().catch(error => {
      logger.error('Initial threat intelligence refresh failed', { error });
    });

    // Schedule recurring execution
    return setInterval(() => {
      this.execute().catch(error => {
        logger.error('Scheduled threat intelligence refresh failed', { error });
      });
    }, intervalMinutes * 60 * 1000);
  }
}

// Export singleton instance
export const threatIntelRefreshJob = new ThreatIntelRefreshJob();

// Auto-start if running as main module
if (require.main === module) {
  threatIntelRefreshJob.execute()
    .then(() => {
      logger.info('Manual threat intelligence refresh completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Manual threat intelligence refresh failed', { error });
      process.exit(1);
    });
}
