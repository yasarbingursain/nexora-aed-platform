/**
 * Kafka Producer for Real-Time Threat Intelligence Streaming
 * Standards: Apache Kafka Best Practices, NIST SP 800-61 (Incident Handling)
 */

import { Kafka, Producer, ProducerRecord, CompressionTypes } from 'kafkajs';
import { logger } from '@/utils/logger';

export interface ThreatIntelEvent {
  source: string;
  ioc_type: string;
  count: number;
  timestamp: string;
  organization_id?: string;
}

export class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  private connected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'nexora-threat-intel',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_USERNAME
        ? {
            mechanism: 'plain',
            username: process.env.KAFKA_USERNAME,
            password: process.env.KAFKA_PASSWORD!,
          }
        : undefined,
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
        multiplier: 2,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionalId: 'threat-intel-producer',
      maxInFlightRequests: 5,
      idempotent: true,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.error('Kafka connection failed', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      await this.producer.disconnect();
      this.connected = false;
      logger.info('Kafka producer disconnected');
    } catch (error) {
      logger.error('Kafka disconnect failed', { error });
    }
  }

  async publishThreatIntel(event: ThreatIntelEvent): Promise<void> {
    if (!this.connected) await this.connect();

    const message: ProducerRecord = {
      topic: 'threat-intel.ingested',
      messages: [
        {
          key: event.source,
          value: JSON.stringify(event),
          timestamp: Date.now().toString(),
          headers: {
            'content-type': 'application/json',
            'source': event.source,
          },
        },
      ],
    };

    try {
      await this.producer.send(message);
      logger.debug('Threat intel event published', { source: event.source });
    } catch (error) {
      logger.error('Failed to publish to Kafka', { error, event });
      throw error;
    }
  }
}
