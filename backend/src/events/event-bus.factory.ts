/**
 * EventBus Factory
 * Returns appropriate EventBus implementation based on environment
 */

import { EventBus } from './event-bus';
import { localEventBus } from './local-event-bus';

export function getEventBus(): EventBus {
  const mode = process.env.THREAT_INTEL_EVENT_MODE || 'local';

  switch (mode) {
    case 'local':
    default:
      return localEventBus;
    // Future: case 'kafka': return kafkaEventBus;
  }
}
