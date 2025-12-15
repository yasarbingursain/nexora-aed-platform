/**
 * Identity Lineage Service
 * Enterprise-grade identity lineage tracking and morphing detection
 * 
 * Standards Compliance:
 * - NIST SP 800-63 (Digital Identity Guidelines)
 * - ISO/IEC 24760 (Identity Management Framework)
 * - MITRE ATT&CK (Identity-based Techniques)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

// ============================================================================
// INTERFACES
// ============================================================================

interface LineageNode {
  id: string;
  identityId: string;
  identityName: string;
  identityType: string;
  parentId: string | null;
  relationship: LineageRelationship;
  createdAt: Date;
  createdBy: string;
  purpose: string;
  metadata: Record<string, unknown>;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  rootId: string | null;
  depth: number;
}

interface LineageEdge {
  from: string;
  to: string;
  relationship: LineageRelationship;
  createdAt: Date;
}

type LineageRelationship = 
  | 'created_from'
  | 'cloned_from'
  | 'rotated_from'
  | 'delegated_from'
  | 'inherited_from'
  | 'split_from'
  | 'merged_from';

interface MorphingEvent {
  id: string;
  identityId: string;
  eventType: MorphingEventType;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changedFields: string[];
  riskScore: number;
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

type MorphingEventType =
  | 'scope_expansion'
  | 'permission_escalation'
  | 'geographic_shift'
  | 'behavioral_drift'
  | 'credential_change'
  | 'owner_change'
  | 'type_change';

interface DriftAnalysis {
  identityId: string;
  driftScore: number;
  driftFactors: DriftFactor[];
  baselineDeviation: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  analyzedAt: Date;
}

interface DriftFactor {
  factor: string;
  weight: number;
  currentValue: unknown;
  baselineValue: unknown;
  deviation: number;
}

// In-memory stores (use database in production)
const lineageStore = new Map<string, LineageNode>();
const morphingStore = new Map<string, MorphingEvent[]>();

// ============================================================================
// IDENTITY LINEAGE SERVICE
// ============================================================================

export class IdentityLineageService {
  /**
   * Create a lineage record for a new identity
   */
  async createLineageNode(
    identityId: string,
    parentId: string | null,
    relationship: LineageRelationship,
    createdBy: string,
    purpose: string,
    metadata: Record<string, unknown> = {}
  ): Promise<LineageNode> {
    try {
      const identity = await prisma.identity.findUnique({
        where: { id: identityId },
      });

      if (!identity) {
        throw new Error(`Identity ${identityId} not found`);
      }

      const node: LineageNode = {
        id: `ln-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        identityId,
        identityName: identity.name,
        identityType: identity.type,
        parentId,
        relationship,
        createdAt: new Date(),
        createdBy,
        purpose,
        metadata,
      };

      lineageStore.set(node.id, node);

      // Store in database for persistence
      await prisma.identityActivity.create({
        data: {
          identityId,
          activity: 'lineage_created',
          source: createdBy,
          metadata: JSON.stringify({
            lineageNodeId: node.id,
            parentId,
            relationship,
            createdBy,
            purpose,
            description: `Lineage node created: ${relationship} from ${parentId || 'root'}`,
          }),
        },
      });

      logger.info('Lineage node created', {
        nodeId: node.id,
        identityId,
        parentId,
        relationship,
      });

      return node;
    } catch (error) {
      logger.error('Failed to create lineage node', { identityId, error });
      throw error;
    }
  }

  /**
   * Get full lineage graph for an identity
   */
  async getLineageGraph(identityId: string): Promise<LineageGraph> {
    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];
    const visited = new Set<string>();

    // Find all nodes related to this identity
    const allNodes = Array.from(lineageStore.values());
    
    // Find the root by traversing up
    let currentId: string | null = identityId;
    let rootId: string | null = null;

    while (currentId) {
      const node = allNodes.find(n => n.identityId === currentId);
      if (node) {
        rootId = node.identityId;
        currentId = node.parentId;
      } else {
        break;
      }
    }

    // Build graph from root down
    const buildGraph = (nodeIdentityId: string, depth: number = 0) => {
      if (visited.has(nodeIdentityId) || depth > 10) return;
      visited.add(nodeIdentityId);

      const node = allNodes.find(n => n.identityId === nodeIdentityId);
      if (node) {
        nodes.push(node);

        // Find children
        const children = allNodes.filter(n => n.parentId === nodeIdentityId);
        for (const child of children) {
          edges.push({
            from: nodeIdentityId,
            to: child.identityId,
            relationship: child.relationship,
            createdAt: child.createdAt,
          });
          buildGraph(child.identityId, depth + 1);
        }
      }
    };

    if (rootId) {
      buildGraph(rootId);
    }

    return {
      nodes,
      edges,
      rootId,
      depth: Math.max(...nodes.map((_, i) => i), 0),
    };
  }

  /**
   * Get ancestors of an identity
   */
  async getAncestors(identityId: string): Promise<LineageNode[]> {
    const ancestors: LineageNode[] = [];
    const allNodes = Array.from(lineageStore.values());
    
    let currentId: string | null = identityId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = allNodes.find(n => n.identityId === currentId);
      if (node && node.parentId) {
        const parent = allNodes.find(n => n.identityId === node.parentId);
        if (parent) {
          ancestors.push(parent);
          currentId = parent.parentId;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get descendants of an identity
   */
  async getDescendants(identityId: string): Promise<LineageNode[]> {
    const descendants: LineageNode[] = [];
    const allNodes = Array.from(lineageStore.values());
    const visited = new Set<string>();

    const findDescendants = (parentId: string) => {
      if (visited.has(parentId)) return;
      visited.add(parentId);

      const children = allNodes.filter(n => n.parentId === parentId);
      for (const child of children) {
        descendants.push(child);
        findDescendants(child.identityId);
      }
    };

    findDescendants(identityId);
    return descendants;
  }
}

// ============================================================================
// MORPHING DETECTION SERVICE
// ============================================================================

export class MorphingDetectionService {
  private readonly SCOPE_EXPANSION_THRESHOLD = 0.3;
  private readonly GEO_SHIFT_THRESHOLD = 0.5;
  private readonly BEHAVIORAL_DRIFT_THRESHOLD = 0.4;

  /**
   * Detect morphing events for an identity
   */
  async detectMorphing(
    identityId: string,
    previousState: Record<string, unknown>,
    newState: Record<string, unknown>
  ): Promise<MorphingEvent[]> {
    const events: MorphingEvent[] = [];
    const changedFields: string[] = [];

    // Compare states
    for (const key of Object.keys(newState)) {
      if (JSON.stringify(previousState[key]) !== JSON.stringify(newState[key])) {
        changedFields.push(key);
      }
    }

    if (changedFields.length === 0) {
      return events;
    }

    // Check for scope expansion
    if (changedFields.includes('scopes') || changedFields.includes('permissions')) {
      const prevScopes = (previousState.scopes as string[]) || [];
      const newScopes = (newState.scopes as string[]) || [];
      
      if (newScopes.length > prevScopes.length) {
        const addedScopes = newScopes.filter(s => !prevScopes.includes(s));
        events.push(this.createMorphingEvent(
          identityId,
          'scope_expansion',
          previousState,
          newState,
          ['scopes'],
          this.calculateScopeRisk(addedScopes),
          { addedScopes }
        ));
      }
    }

    // Check for geographic shift
    if (changedFields.includes('location') || changedFields.includes('region')) {
      events.push(this.createMorphingEvent(
        identityId,
        'geographic_shift',
        previousState,
        newState,
        ['location', 'region'].filter(f => changedFields.includes(f)),
        0.6,
        { previousLocation: previousState.location, newLocation: newState.location }
      ));
    }

    // Check for owner change
    if (changedFields.includes('owner')) {
      events.push(this.createMorphingEvent(
        identityId,
        'owner_change',
        previousState,
        newState,
        ['owner'],
        0.7,
        { previousOwner: previousState.owner, newOwner: newState.owner }
      ));
    }

    // Check for type change
    if (changedFields.includes('type')) {
      events.push(this.createMorphingEvent(
        identityId,
        'type_change',
        previousState,
        newState,
        ['type'],
        0.8,
        { previousType: previousState.type, newType: newState.type }
      ));
    }

    // Store events
    const existingEvents = morphingStore.get(identityId) || [];
    morphingStore.set(identityId, [...existingEvents, ...events]);

    // Log to database
    for (const event of events) {
      await prisma.identityActivity.create({
        data: {
          identityId,
          activity: 'morphing_detected',
          source: 'morphing_detection_service',
          metadata: JSON.stringify({
            ...event,
            description: `Morphing event: ${event.eventType}`,
          }),
        },
      });
    }

    logger.info('Morphing events detected', {
      identityId,
      eventCount: events.length,
      eventTypes: events.map(e => e.eventType),
    });

    return events;
  }

  /**
   * Analyze behavioral drift for an identity
   */
  async analyzeDrift(identityId: string, organizationId: string): Promise<DriftAnalysis> {
    try {
      // Get baseline
      const baseline = await prisma.baseline.findFirst({
        where: { identityId },
        orderBy: { lastUpdated: 'desc' },
      });

      // Get recent activities
      const activities = await prisma.identityActivity.findMany({
        where: { identityId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const driftFactors: DriftFactor[] = [];
      let totalDrift = 0;

      if (baseline) {
        const baselineData = JSON.parse(baseline.baselineData || '{}');

        // Analyze API usage patterns
        const apiUsageDrift = this.calculateApiUsageDrift(activities, baselineData);
        driftFactors.push(apiUsageDrift);
        totalDrift += apiUsageDrift.deviation * apiUsageDrift.weight;

        // Analyze time patterns
        const timeDrift = this.calculateTimeDrift(activities, baselineData);
        driftFactors.push(timeDrift);
        totalDrift += timeDrift.deviation * timeDrift.weight;

        // Analyze geographic patterns
        const geoDrift = this.calculateGeoDrift(activities, baselineData);
        driftFactors.push(geoDrift);
        totalDrift += geoDrift.deviation * geoDrift.weight;
      }

      const driftScore = Math.min(totalDrift, 1);
      const riskLevel = this.calculateRiskLevel(driftScore);

      const analysis: DriftAnalysis = {
        identityId,
        driftScore,
        driftFactors,
        baselineDeviation: driftScore,
        riskLevel,
        recommendations: this.generateRecommendations(driftFactors, riskLevel),
        analyzedAt: new Date(),
      };

      logger.info('Drift analysis completed', {
        identityId,
        driftScore,
        riskLevel,
      });

      return analysis;
    } catch (error) {
      logger.error('Drift analysis failed', { identityId, error });
      throw error;
    }
  }

  private createMorphingEvent(
    identityId: string,
    eventType: MorphingEventType,
    previousState: Record<string, unknown>,
    newState: Record<string, unknown>,
    changedFields: string[],
    riskScore: number,
    metadata: Record<string, unknown>
  ): MorphingEvent {
    return {
      id: `me-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      identityId,
      eventType,
      previousState,
      newState,
      changedFields,
      riskScore,
      detectedAt: new Date(),
      metadata,
    };
  }

  private calculateScopeRisk(addedScopes: string[]): number {
    const highRiskScopes = ['admin', 'write', 'delete', 'execute', 'root', 'sudo'];
    const hasHighRisk = addedScopes.some(s => 
      highRiskScopes.some(hr => s.toLowerCase().includes(hr))
    );
    return hasHighRisk ? 0.9 : 0.5;
  }

  private calculateApiUsageDrift(activities: unknown[], baselineData: Record<string, unknown>): DriftFactor {
    const currentApis = new Set(activities.map((a: any) => a.metadata?.resource).filter(Boolean));
    const baselineApis = new Set((baselineData.apis as string[]) || []);
    
    const newApis = [...currentApis].filter(api => !baselineApis.has(api));
    const deviation = baselineApis.size > 0 ? newApis.length / baselineApis.size : 0;

    return {
      factor: 'api_usage',
      weight: 0.3,
      currentValue: [...currentApis],
      baselineValue: [...baselineApis],
      deviation: Math.min(deviation, 1),
    };
  }

  private calculateTimeDrift(activities: unknown[], baselineData: Record<string, unknown>): DriftFactor {
    const currentHours = activities.map((a: any) => new Date(a.timestamp).getHours());
    const baselineHours = (baselineData.activeHours as number[]) || [9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    const outsideHours = currentHours.filter(h => !baselineHours.includes(h));
    const deviation = currentHours.length > 0 ? outsideHours.length / currentHours.length : 0;

    return {
      factor: 'time_pattern',
      weight: 0.25,
      currentValue: [...new Set(currentHours)],
      baselineValue: baselineHours,
      deviation,
    };
  }

  private calculateGeoDrift(activities: unknown[], baselineData: Record<string, unknown>): DriftFactor {
    const currentRegions = new Set(activities.map((a: any) => a.metadata?.region).filter(Boolean));
    const baselineRegions = new Set((baselineData.regions as string[]) || []);
    
    const newRegions = [...currentRegions].filter(r => !baselineRegions.has(r));
    const deviation = newRegions.length > 0 ? 1 : 0;

    return {
      factor: 'geographic',
      weight: 0.45,
      currentValue: [...currentRegions],
      baselineValue: [...baselineRegions],
      deviation,
    };
  }

  private calculateRiskLevel(driftScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (driftScore >= 0.8) return 'critical';
    if (driftScore >= 0.6) return 'high';
    if (driftScore >= 0.3) return 'medium';
    return 'low';
  }

  private generateRecommendations(factors: DriftFactor[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.deviation > 0.5) {
        switch (factor.factor) {
          case 'api_usage':
            recommendations.push('Review new API access patterns and validate business need');
            break;
          case 'time_pattern':
            recommendations.push('Investigate activity outside normal business hours');
            break;
          case 'geographic':
            recommendations.push('Verify geographic access from new regions');
            break;
        }
      }
    }

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Consider temporary credential rotation');
      recommendations.push('Enable enhanced monitoring for this identity');
    }

    return recommendations;
  }

  /**
   * Get morphing history for an identity
   */
  getMorphingHistory(identityId: string): MorphingEvent[] {
    return morphingStore.get(identityId) || [];
  }
}

export const identityLineageService = new IdentityLineageService();
export const morphingDetectionService = new MorphingDetectionService();
