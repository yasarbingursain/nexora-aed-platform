/**
 * Forensic Timeline Service
 * Enterprise-grade forensic timeline generation and visualization
 * 
 * Standards Compliance:
 * - NIST SP 800-86 (Guide to Integrating Forensic Techniques)
 * - ISO/IEC 27037 (Digital Evidence Collection)
 * - MITRE ATT&CK (Attack Timeline Mapping)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

// ============================================================================
// INTERFACES
// ============================================================================

interface TimelineEvent {
  id: string;
  timestamp: Date;
  eventType: TimelineEventType;
  category: TimelineCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actor: TimelineActor;
  target: TimelineTarget;
  evidence: TimelineEvidence;
  mitreMapping?: MitreMapping;
  metadata: Record<string, unknown>;
}

type TimelineEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration_change'
  | 'threat_detected'
  | 'remediation_action'
  | 'credential_operation'
  | 'network_activity'
  | 'system_event'
  | 'user_action';

type TimelineCategory =
  | 'identity'
  | 'threat'
  | 'compliance'
  | 'remediation'
  | 'system'
  | 'network';

interface TimelineActor {
  id: string;
  type: 'user' | 'identity' | 'system' | 'external';
  name: string;
  ip?: string;
  userAgent?: string;
  location?: string;
}

interface TimelineTarget {
  id: string;
  type: string;
  name: string;
  resourcePath?: string;
}

interface TimelineEvidence {
  hash?: string;
  rawData?: string;
  sourceSystem: string;
  verified: boolean;
  chainOfCustody: ChainOfCustodyEntry[];
}

interface ChainOfCustodyEntry {
  timestamp: Date;
  action: string;
  actor: string;
  hash: string;
}

interface MitreMapping {
  tactics: string[];
  techniques: string[];
  subtechniques?: string[];
}

interface TimelineQuery {
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: TimelineEventType[];
  categories?: TimelineCategory[];
  severities?: ('low' | 'medium' | 'high' | 'critical')[];
  actorId?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}

interface TimelineVisualization {
  events: TimelineEvent[];
  summary: TimelineSummary;
  clusters: TimelineCluster[];
  attackPath?: AttackPath;
}

interface TimelineSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  timeRange: { start: Date; end: Date };
  peakActivity: { timestamp: Date; count: number };
}

interface TimelineCluster {
  id: string;
  startTime: Date;
  endTime: Date;
  eventCount: number;
  primaryCategory: TimelineCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AttackPath {
  stages: AttackStage[];
  confidence: number;
  mitreChain: string[];
}

interface AttackStage {
  order: number;
  tactic: string;
  technique: string;
  events: string[];
  timestamp: Date;
}

// ============================================================================
// FORENSIC TIMELINE SERVICE
// ============================================================================

export class ForensicTimelineService {
  /**
   * Build forensic timeline from multiple data sources
   */
  async buildTimeline(query: TimelineQuery): Promise<TimelineVisualization> {
    try {
      const events: TimelineEvent[] = [];

      // Gather events from different sources
      const [
        auditEvents,
        threatEvents,
        securityEvents,
        actionEvents,
        evidenceEvents,
      ] = await Promise.all([
        this.getAuditLogEvents(query),
        this.getThreatEvents(query),
        this.getSecurityEvents(query),
        this.getRemediationEvents(query),
        this.getEvidenceLogEvents(query),
      ]);

      events.push(...auditEvents, ...threatEvents, ...securityEvents, ...actionEvents, ...evidenceEvents);

      // Sort by timestamp
      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Apply filters
      const filteredEvents = this.filterEvents(events, query);

      // Generate summary
      const summary = this.generateSummary(filteredEvents);

      // Identify clusters
      const clusters = this.identifyClusters(filteredEvents);

      // Detect attack path if threats present
      const attackPath = this.detectAttackPath(filteredEvents);

      logger.info('Forensic timeline built', {
        organizationId: query.organizationId,
        eventCount: filteredEvents.length,
        clusterCount: clusters.length,
      });

      return {
        events: filteredEvents.slice(query.offset || 0, (query.offset || 0) + (query.limit || 100)),
        summary,
        clusters,
        attackPath,
      };
    } catch (error) {
      logger.error('Failed to build forensic timeline', { query, error });
      throw error;
    }
  }

  /**
   * Get audit log events
   */
  private async getAuditLogEvents(query: TimelineQuery): Promise<TimelineEvent[]> {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) (where.timestamp as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.timestamp as Record<string, Date>).lte = query.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return logs.map(log => ({
      id: `audit-${log.id}`,
      timestamp: log.timestamp,
      eventType: this.mapAuditEventType(log.action),
      category: 'system' as TimelineCategory,
      severity: (log.severity as 'low' | 'medium' | 'high' | 'critical') || 'low',
      title: log.event,
      description: `${log.action} on ${log.entityType}`,
      actor: {
        id: log.userId || 'system',
        type: log.userId ? 'user' : 'system',
        name: log.userId || 'System',
        ip: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
      },
      target: {
        id: log.entityId,
        type: log.entityType,
        name: log.entityType,
      },
      evidence: {
        sourceSystem: 'audit_log',
        verified: true,
        chainOfCustody: [],
      },
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
    }));
  }

  /**
   * Get threat events
   */
  private async getThreatEvents(query: TimelineQuery): Promise<TimelineEvent[]> {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.createdAt as Record<string, Date>).lte = query.endDate;
    }

    const threats = await prisma.threat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return threats.map(threat => ({
      id: `threat-${threat.id}`,
      timestamp: threat.createdAt,
      eventType: 'threat_detected' as TimelineEventType,
      category: 'threat' as TimelineCategory,
      severity: threat.severity as 'low' | 'medium' | 'high' | 'critical',
      title: threat.title,
      description: threat.description,
      actor: {
        id: threat.sourceIp || 'unknown',
        type: 'external' as const,
        name: threat.sourceIp || 'Unknown Actor',
        ip: threat.sourceIp || undefined,
      },
      target: {
        id: threat.identityId || 'system',
        type: 'identity',
        name: threat.identityId || 'System',
      },
      evidence: {
        sourceSystem: 'threat_detection',
        verified: true,
        chainOfCustody: [],
        rawData: threat.indicators,
      },
      mitreMapping: threat.mitreTactics ? {
        tactics: threat.mitreTactics.split(','),
        techniques: threat.mitreId ? [threat.mitreId] : [],
      } : undefined,
      metadata: threat.evidence ? JSON.parse(threat.evidence) : {},
    }));
  }

  /**
   * Get security events
   */
  private async getSecurityEvents(query: TimelineQuery): Promise<TimelineEvent[]> {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.createdAt as Record<string, Date>).lte = query.endDate;
    }

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return events.map(event => ({
      id: `security-${event.id}`,
      timestamp: event.createdAt,
      eventType: this.mapSecurityEventType(event.type),
      category: 'identity' as TimelineCategory,
      severity: event.severity as 'low' | 'medium' | 'high' | 'critical',
      title: event.type,
      description: event.description,
      actor: {
        id: event.userId || 'unknown',
        type: event.userId ? 'user' : 'external',
        name: event.userId || 'Unknown',
        ip: event.sourceIp || undefined,
      },
      target: {
        id: event.userId || 'system',
        type: 'user',
        name: event.userId || 'System',
      },
      evidence: {
        sourceSystem: 'security_monitoring',
        verified: true,
        chainOfCustody: [],
      },
      metadata: event.details ? JSON.parse(event.details) : {},
    }));
  }

  /**
   * Get remediation action events
   */
  private async getRemediationEvents(query: TimelineQuery): Promise<TimelineEvent[]> {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.createdAt as Record<string, Date>).lte = query.endDate;
    }

    const actions = await prisma.action.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return actions.map(action => ({
      id: `action-${action.id}`,
      timestamp: action.executedAt || action.createdAt,
      eventType: 'remediation_action' as TimelineEventType,
      category: 'remediation' as TimelineCategory,
      severity: 'medium' as const,
      title: `Remediation: ${action.type}`,
      description: `${action.type} action ${action.status}`,
      actor: {
        id: 'system',
        type: 'system' as const,
        name: 'Nexora Remediation Engine',
      },
      target: {
        id: action.identityId || action.threatId || 'unknown',
        type: action.identityId ? 'identity' : 'threat',
        name: action.identityId || action.threatId || 'Unknown',
      },
      evidence: {
        sourceSystem: 'remediation_engine',
        verified: true,
        chainOfCustody: [],
      },
      metadata: action.parameters ? JSON.parse(action.parameters) : {},
    }));
  }

  /**
   * Get evidence log events
   */
  private async getEvidenceLogEvents(query: TimelineQuery): Promise<TimelineEvent[]> {
    const where: Record<string, unknown> = {
      organizationId: query.organizationId,
    };

    if (query.startDate || query.endDate) {
      where.ts = {};
      if (query.startDate) (where.ts as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.ts as Record<string, Date>).lte = query.endDate;
    }

    const logs = await prisma.evidenceLog.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: 300,
    });

    return logs.map(log => ({
      id: `evidence-${log.id}`,
      timestamp: log.ts,
      eventType: this.mapEvidenceEventType(log.action),
      category: 'compliance' as TimelineCategory,
      severity: 'low' as const,
      title: log.action,
      description: `${log.action} on ${log.resourceType}`,
      actor: {
        id: log.actor,
        type: 'user' as const,
        name: log.actor,
      },
      target: {
        id: log.resourceId,
        type: log.resourceType,
        name: log.resourceType,
      },
      evidence: {
        hash: log.rowHash,
        sourceSystem: 'evidence_log',
        verified: true,
        chainOfCustody: log.prevHash ? [{
          timestamp: log.ts,
          action: 'created',
          actor: log.actor,
          hash: log.rowHash,
        }] : [],
      },
      metadata: log.payload as Record<string, unknown>,
    }));
  }

  /**
   * Filter events based on query
   */
  private filterEvents(events: TimelineEvent[], query: TimelineQuery): TimelineEvent[] {
    return events.filter(event => {
      if (query.eventTypes && !query.eventTypes.includes(event.eventType)) return false;
      if (query.categories && !query.categories.includes(event.category)) return false;
      if (query.severities && !query.severities.includes(event.severity)) return false;
      if (query.actorId && event.actor.id !== query.actorId) return false;
      if (query.targetId && event.target.id !== query.targetId) return false;
      return true;
    });
  }

  /**
   * Generate timeline summary
   */
  private generateSummary(events: TimelineEvent[]): TimelineSummary {
    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsByHour: Record<number, number> = {};

    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      const hour = event.timestamp.getTime();
      const hourBucket = Math.floor(hour / 3600000);
      eventsByHour[hourBucket] = (eventsByHour[hourBucket] || 0) + 1;
    }

    const peakHour = Object.entries(eventsByHour).sort((a, b) => b[1] - a[1])[0];

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByCategory,
      eventsBySeverity,
      timeRange: {
        start: events[0]?.timestamp || new Date(),
        end: events[events.length - 1]?.timestamp || new Date(),
      },
      peakActivity: peakHour ? {
        timestamp: new Date(parseInt(peakHour[0]) * 3600000),
        count: peakHour[1],
      } : { timestamp: new Date(), count: 0 },
    };
  }

  /**
   * Identify event clusters
   */
  private identifyClusters(events: TimelineEvent[]): TimelineCluster[] {
    const clusters: TimelineCluster[] = [];
    const CLUSTER_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    let currentCluster: TimelineEvent[] = [];
    let clusterStart: Date | null = null;

    for (const event of events) {
      if (!clusterStart) {
        clusterStart = event.timestamp;
        currentCluster = [event];
        continue;
      }

      const timeDiff = event.timestamp.getTime() - clusterStart.getTime();

      if (timeDiff <= CLUSTER_WINDOW_MS) {
        currentCluster.push(event);
      } else {
        if (currentCluster.length >= 3) {
          clusters.push(this.createCluster(currentCluster));
        }
        clusterStart = event.timestamp;
        currentCluster = [event];
      }
    }

    if (currentCluster.length >= 3) {
      clusters.push(this.createCluster(currentCluster));
    }

    return clusters;
  }

  /**
   * Create cluster from events
   */
  private createCluster(events: TimelineEvent[]): TimelineCluster {
    const categories = events.map(e => e.category);
    const primaryCategory = this.getMostFrequent(categories) as TimelineCategory;
    const severities = events.map(e => e.severity);
    const maxSeverity = this.getMaxSeverity(severities);

    return {
      id: `cluster-${events[0].id}`,
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      eventCount: events.length,
      primaryCategory,
      severity: maxSeverity,
      description: `${events.length} ${primaryCategory} events in ${Math.round((events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()) / 1000)}s`,
    };
  }

  /**
   * Detect attack path from events
   */
  private detectAttackPath(events: TimelineEvent[]): AttackPath | undefined {
    const threatEvents = events.filter(e => e.mitreMapping);
    if (threatEvents.length < 2) return undefined;

    const stages: AttackStage[] = [];
    const mitreChain: string[] = [];

    for (let i = 0; i < threatEvents.length; i++) {
      const event = threatEvents[i];
      if (event.mitreMapping) {
        const tactic = event.mitreMapping.tactics[0] || 'unknown';
        const technique = event.mitreMapping.techniques[0] || 'unknown';

        stages.push({
          order: i + 1,
          tactic,
          technique,
          events: [event.id],
          timestamp: event.timestamp,
        });

        mitreChain.push(`${tactic}:${technique}`);
      }
    }

    return {
      stages,
      confidence: Math.min(0.9, 0.5 + stages.length * 0.1),
      mitreChain,
    };
  }

  /**
   * Map audit action to event type
   */
  private mapAuditEventType(action: string): TimelineEventType {
    const mapping: Record<string, TimelineEventType> = {
      'create': 'configuration_change',
      'update': 'configuration_change',
      'delete': 'configuration_change',
      'login': 'authentication',
      'logout': 'authentication',
      'access': 'data_access',
      'export': 'data_access',
    };
    return mapping[action.toLowerCase()] || 'system_event';
  }

  /**
   * Map security event type
   */
  private mapSecurityEventType(type: string): TimelineEventType {
    if (type.includes('login') || type.includes('auth')) return 'authentication';
    if (type.includes('access')) return 'authorization';
    if (type.includes('threat')) return 'threat_detected';
    return 'system_event';
  }

  /**
   * Map evidence event type
   */
  private mapEvidenceEventType(action: string): TimelineEventType {
    if (action.includes('threat')) return 'threat_detected';
    if (action.includes('remediation')) return 'remediation_action';
    if (action.includes('credential')) return 'credential_operation';
    return 'system_event';
  }

  /**
   * Get most frequent item
   */
  private getMostFrequent<T>(items: T[]): T {
    const counts = new Map<T, number>();
    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Get maximum severity
   */
  private getMaxSeverity(severities: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const order = ['low', 'medium', 'high', 'critical'];
    let maxIndex = 0;
    for (const sev of severities) {
      const index = order.indexOf(sev);
      if (index > maxIndex) maxIndex = index;
    }
    return order[maxIndex] as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Export timeline to various formats
   */
  async exportTimeline(
    query: TimelineQuery,
    format: 'json' | 'csv' | 'stix'
  ): Promise<string> {
    const timeline = await this.buildTimeline(query);

    switch (format) {
      case 'json':
        return JSON.stringify(timeline, null, 2);

      case 'csv':
        const headers = ['timestamp', 'event_type', 'category', 'severity', 'title', 'actor_id', 'target_id'];
        const rows = timeline.events.map(e => [
          e.timestamp.toISOString(),
          e.eventType,
          e.category,
          e.severity,
          `"${e.title.replace(/"/g, '""')}"`,
          e.actor.id,
          e.target.id,
        ].join(','));
        return [headers.join(','), ...rows].join('\n');

      case 'stix':
        return JSON.stringify(this.convertToStix(timeline), null, 2);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert timeline to STIX 2.1 format
   */
  private convertToStix(timeline: TimelineVisualization): Record<string, unknown> {
    return {
      type: 'bundle',
      id: `bundle--${Date.now()}`,
      spec_version: '2.1',
      objects: timeline.events.map(event => ({
        type: 'observed-data',
        id: `observed-data--${event.id}`,
        created: event.timestamp.toISOString(),
        modified: event.timestamp.toISOString(),
        first_observed: event.timestamp.toISOString(),
        last_observed: event.timestamp.toISOString(),
        number_observed: 1,
        object_refs: [],
        extensions: {
          'extension-definition--nexora': {
            event_type: event.eventType,
            category: event.category,
            severity: event.severity,
            title: event.title,
            description: event.description,
          },
        },
      })),
    };
  }
}

export const forensicTimelineService = new ForensicTimelineService();
