/**
 * Local EventBus Implementation
 * In-process event emitter for development
 * No external dependencies required
 */

import { EventEmitter } from 'events';
import { EventBus } from './event-bus';
import { ThreatIntelEvent } from './threat-intel.types';

const emitter = new EventEmitter();

class LocalEventBus implements EventBus {
  async publishThreatIntel(event: ThreatIntelEvent): Promise<void> {
    emitter.emit('threat:intel', event);
  }

  subscribeThreatIntel(handler: (event: ThreatIntelEvent) => void): void {
    emitter.on('threat:intel', handler);
  }
}

export const localEventBus = new LocalEventBus();
