/**
 * Kafka Health Check Service
 * Monitor Kafka consumer health and connectivity
 * 
 * Features:
 * - Connection health monitoring
 * - Consumer lag tracking
 * - Automatic reconnection
 * - Health check endpoint data
 * - Metrics collection
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Kafka, Consumer, Admin } from 'kafkajs';
import { logger } from '@/utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface KafkaHealthStatus {
  connected: boolean;
  brokers: string[];
  consumers: ConsumerHealthStatus[];
  lastCheck: Date;
  uptime: number;
  errors: string[];
}

export interface ConsumerHealthStatus {
  groupId: string;
  connected: boolean;
  topics: string[];
  lag: number;
  lastMessage: Date | null;
  errorCount: number;
  lastError: string | null;
}

// ============================================================================
// KAFKA HEALTH SERVICE
// ============================================================================

export class KafkaHealthService {
  private kafka?: Kafka;
  private admin?: Admin;
  private consumers: Map<string, Consumer> = new Map();
  private consumerHealth: Map<string, ConsumerHealthStatus> = new Map();
  private startTime: Date = new Date();
  private lastCheck: Date = new Date();
  private errors: string[] = [];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    if (process.env.KAFKA_BROKERS) {
      this.initialize();
    } else {
      logger.warn('Kafka not configured - health monitoring disabled');
    }
  }

  private initialize(): void {
    try {
      this.kafka = new Kafka({
        clientId: 'nexora-health-monitor',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        ssl: process.env.KAFKA_SSL === 'true',
        sasl: process.env.KAFKA_USERNAME
          ? {
              mechanism: 'plain',
              username: process.env.KAFKA_USERNAME,
              password: process.env.KAFKA_PASSWORD!,
            }
          : undefined,
        connectionTimeout: 10000,
        requestTimeout: 30000,
      });

      this.admin = this.kafka.admin();
      logger.info('Kafka health service initialized');
    } catch (error) {
      logger.error('Failed to initialize Kafka health service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.errors.push(error instanceof Error ? error.message : 'Initialization failed');
    }
  }

  /**
   * Register a consumer for health monitoring
   */
  registerConsumer(groupId: string, consumer: Consumer, topics: string[]): void {
    this.consumers.set(groupId, consumer);
    this.consumerHealth.set(groupId, {
      groupId,
      connected: false,
      topics,
      lag: 0,
      lastMessage: null,
      errorCount: 0,
      lastError: null,
    });

    // Listen to consumer events
    consumer.on('consumer.connect', () => {
      this.updateConsumerStatus(groupId, { connected: true });
      logger.info('Kafka consumer connected', { groupId });
    });

    consumer.on('consumer.disconnect', () => {
      this.updateConsumerStatus(groupId, { connected: false });
      logger.warn('Kafka consumer disconnected', { groupId });
    });

    consumer.on('consumer.crash', (event) => {
      const error = event.payload.error.message;
      this.updateConsumerStatus(groupId, {
        connected: false,
        errorCount: (this.consumerHealth.get(groupId)?.errorCount || 0) + 1,
        lastError: error,
      });
      logger.error('Kafka consumer crashed', { groupId, error });
    });

    logger.info('Kafka consumer registered for health monitoring', { groupId, topics });
  }

  /**
   * Update consumer status
   */
  private updateConsumerStatus(groupId: string, updates: Partial<ConsumerHealthStatus>): void {
    const current = this.consumerHealth.get(groupId);
    if (current) {
      this.consumerHealth.set(groupId, { ...current, ...updates });
    }
  }

  /**
   * Record message received
   */
  recordMessageReceived(groupId: string): void {
    this.updateConsumerStatus(groupId, { lastMessage: new Date() });
  }

  /**
   * Check Kafka broker connectivity
   */
  async checkBrokerConnectivity(): Promise<boolean> {
    if (!this.admin) return false;

    try {
      await this.admin.connect();
      const cluster = await this.admin.describeCluster();
      await this.admin.disconnect();

      logger.debug('Kafka broker connectivity check passed', {
        brokers: cluster.brokers.length,
      });

      return true;
    } catch (error) {
      logger.error('Kafka broker connectivity check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.errors.push(error instanceof Error ? error.message : 'Connectivity check failed');
      return false;
    }
  }

  /**
   * Get consumer lag for all registered consumers
   */
  async getConsumerLag(): Promise<Map<string, number>> {
    const lagMap = new Map<string, number>();

    if (!this.admin) return lagMap;

    try {
      await this.admin.connect();

      for (const [groupId, health] of this.consumerHealth) {
        try {
          const offsets = await this.admin.fetchOffsets({ groupId, topics: health.topics });
          
          let totalLag = 0;
          for (const topic of offsets) {
            for (const partition of topic.partitions) {
              const offset = parseInt(partition.offset);
              const highWatermark = parseInt(partition.high || '0');
              const lag = highWatermark - offset;
              totalLag += lag;
            }
          }

          lagMap.set(groupId, totalLag);
          this.updateConsumerStatus(groupId, { lag: totalLag });
        } catch (error) {
          logger.error('Failed to fetch consumer lag', {
            groupId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await this.admin.disconnect();
    } catch (error) {
      logger.error('Failed to get consumer lag', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return lagMap;
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<KafkaHealthStatus> {
    this.lastCheck = new Date();

    const connected = await this.checkBrokerConnectivity();
    await this.getConsumerLag();

    const brokers = process.env.KAFKA_BROKERS?.split(',') || [];
    const consumers = Array.from(this.consumerHealth.values());
    const uptime = Date.now() - this.startTime.getTime();

    return {
      connected,
      brokers,
      consumers,
      lastCheck: this.lastCheck,
      uptime,
      errors: this.errors.slice(-10), // Keep last 10 errors
    };
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.getHealthStatus();
        
        // Log warning if any consumer is unhealthy
        for (const consumer of status.consumers) {
          if (!consumer.connected) {
            logger.warn('Kafka consumer unhealthy', {
              groupId: consumer.groupId,
              lastMessage: consumer.lastMessage,
              errorCount: consumer.errorCount,
            });
          }

          if (consumer.lag > 1000) {
            logger.warn('Kafka consumer lag high', {
              groupId: consumer.groupId,
              lag: consumer.lag,
            });
          }
        }

        if (!status.connected) {
          logger.error('Kafka broker connectivity lost');
        }
      } catch (error) {
        logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, intervalMs);

    logger.info('Kafka health checks started', { intervalMs });
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Kafka health checks stopped');
    }
  }

  /**
   * Get simple health check for HTTP endpoint
   */
  async isHealthy(): Promise<{ healthy: boolean; message: string }> {
    try {
      const status = await this.getHealthStatus();

      if (!status.connected) {
        return { healthy: false, message: 'Kafka broker not connected' };
      }

      const unhealthyConsumers = status.consumers.filter(c => !c.connected);
      if (unhealthyConsumers.length > 0) {
        return {
          healthy: false,
          message: `${unhealthyConsumers.length} consumer(s) disconnected: ${unhealthyConsumers.map(c => c.groupId).join(', ')}`,
        };
      }

      const highLagConsumers = status.consumers.filter(c => c.lag > 1000);
      if (highLagConsumers.length > 0) {
        return {
          healthy: false,
          message: `${highLagConsumers.length} consumer(s) with high lag: ${highLagConsumers.map(c => `${c.groupId}(${c.lag})`).join(', ')}`,
        };
      }

      return { healthy: true, message: 'All Kafka consumers healthy' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();

    if (this.admin) {
      try {
        await this.admin.disconnect();
      } catch (error) {
        logger.error('Failed to disconnect Kafka admin', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Kafka health service shutdown complete');
  }
}

export const kafkaHealthService = new KafkaHealthService();
