/**
 * EventBus Interface
 * Abstraction for message passing - can be local or Kafka
 */

import { ThreatIntelEvent } from './threat-intel.types';

export interface EventBus {
  publishThreatIntel(event: ThreatIntelEvent): Promise<void>;
  subscribeThreatIntel(handler: (event: ThreatIntelEvent) => void): void;
}
