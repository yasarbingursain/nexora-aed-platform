/**
 * Threat Intelligence Ingestion Scheduler
 * Standards: NIST SP 800-150 (Automated Threat Intelligence)
 */

import cron from 'node-cron';
import { Mutex } from 'async-mutex';
import { ThreatIntelIngestionService } from '@/services/threat-intel/ingestion.service';
import { logger } from '@/utils/logger';

const ingestionService = new ThreatIntelIngestionService();

export class ThreatIntelScheduler {
  private mutex = new Mutex();
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Start all scheduled ingestion jobs
   */
  start(): void {
    logger.info('Starting threat intel scheduler');

    // High-priority sources: Every 2 minutes
    const highPriorityTask = cron.schedule('*/2 * * * *', async () => {
      if (this.mutex.isLocked()) {
        logger.warn('Previous high-priority ingestion still running, skipping');
        return;
      }

      const release = await this.mutex.acquire();
      try {
        logger.info('Running high-priority ingestion');
        await Promise.all([
          ingestionService.ingestURLhaus(),
          ingestionService.ingestThreatFox(),
        ]);
      } catch (error) {
        logger.error('High-priority ingestion failed', { error });
      } finally {
        release();
      }
    });

    // Medium-priority sources: Every 5 minutes
    const mediumPriorityTask = cron.schedule('*/5 * * * *', async () => {
      if (this.mutex.isLocked()) {
        logger.warn('Previous medium-priority ingestion still running, skipping');
        return;
      }

      const release = await this.mutex.acquire();
      try {
        logger.info('Running medium-priority ingestion');
        await ingestionService.ingestMalwareBazaar();
      } catch (error) {
        logger.error('Medium-priority ingestion failed', { error });
      } finally {
        release();
      }
    });

    // Full ingestion cycle: Every 15 minutes
    const fullCycleTask = cron.schedule('*/15 * * * *', async () => {
      if (this.mutex.isLocked()) {
        logger.warn('Previous full ingestion still running, skipping');
        return;
      }

      const release = await this.mutex.acquire();
      try {
        logger.info('Running full ingestion cycle');
        await ingestionService.ingestAll();
      } catch (error) {
        logger.error('Full ingestion failed', { error });
      } finally {
        release();
      }
    });

    this.tasks.push(highPriorityTask, mediumPriorityTask, fullCycleTask);
    logger.info('Threat intel scheduler started');
  }

  stop(): void {
    this.tasks.forEach((task) => task.stop());
    this.tasks = [];
    logger.info('Threat intel scheduler stopped');
  }
}
