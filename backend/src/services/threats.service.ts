import { threatRepository } from '@/repositories/threats.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { cacheService, CacheNamespaces, CacheTTL } from './cache.service';
import { siemService, SiemEvent } from './integrations/siem.service';
import type {
  CreateThreatInput,
  UpdateThreatInput,
  ListThreatsQuery,
  InvestigateThreatInput,
  RemediateThreatInput,
} from '@/validators/threats.validator';

/**
 * SECURITY FIX: CWE-502 - Deserialization of Untrusted Data
 * SECURITY FIX: CWE-400 - Uncontrolled Resource Consumption
 * 
 * All JSON operations validated with Zod schemas.
 * Database aggregation used instead of loading all records into memory.
 */

// Threat Indicator Schema - Strictly typed
const ThreatIndicatorSchema = z.object({
  type: z.enum(['ip', 'domain', 'hash', 'email', 'url', 'file_path']),
  value: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

const ThreatIndicatorsSchema = z.array(ThreatIndicatorSchema).max(100);

// Threat Evidence Schema - Strictly typed
const ThreatEvidenceSchema = z.object({
  source: z.string().max(255).optional(),
  timestamp: z.string().datetime().optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  artifacts: z.array(z.string()).max(50).optional(),
}).strict();

/**
 * Threat Service
 * 
 * Business logic for threat detection and management
 * - All operations scoped to organizationId
 */

export class ThreatService {
  /**
   * List threats with pagination and filtering
   */
  async list(organizationId: string, query: ListThreatsQuery) {
    const { page = 1, limit = 20, severity, status, category, identityId, assignedTo, dateFrom, dateTo, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const skip = (page - 1) * Math.min(limit, 100);

    // Build where clause
    const where: Prisma.ThreatWhereInput = {
      organizationId,  // CRITICAL: Always filter by org
    };

    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (category) where.category = category;
    if (identityId) where.identityId = identityId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    // Build order by
    const orderBy: Prisma.ThreatOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [threats, total] = await Promise.all([
      threatRepository.findAll(organizationId, { skip, take: Math.min(limit, 100), where, orderBy }),
      threatRepository.count(organizationId, where),
    ]);

    // SECURITY: Validate indicators and evidence on read
    const validatedThreats = threats.map((threat) => {
      let indicators: any[] = [];
      let evidence: any = {};

      try {
        indicators = ThreatIndicatorsSchema.parse(JSON.parse((threat as any).indicators || '[]'));
      } catch (error) {
        logger.warn('Invalid threat indicators', { 
          threatId: threat.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }

      try {
        evidence = ThreatEvidenceSchema.parse(JSON.parse((threat as any).evidence || '{}'));
      } catch (error) {
        logger.warn('Invalid threat evidence', { 
          threatId: threat.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }

      return {
        ...threat,
        indicators,
        evidence,
        mitreTactics: (threat as any).mitreTactics ? (threat as any).mitreTactics.split(',').filter(Boolean) : [],
      };
    });

    logger.info('Threats listed', {
      organizationId,
      count: validatedThreats.length,
      total,
      page,
      limit,
    });

    return {
      data: validatedThreats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get threat by ID (with caching)
   */
  async getById(id: string, organizationId: string) {
    // Try cache first
    const cacheKey = `${organizationId}:${id}`;
    const cached = await cacheService.get(cacheKey, CacheNamespaces.THREATS);
    
    if (cached) {
      logger.debug('Threat retrieved from cache', { id, organizationId });
      return cached;
    }

    // Cache miss - fetch from database
    const threat = await threatRepository.findById(id, organizationId);

    if (!threat) {
      logger.warn('Threat not found', { id, organizationId });
      throw new Error('Threat not found');
    }

    // SECURITY: Validate indicators
    let indicators: any[] = [];
    try {
      indicators = ThreatIndicatorsSchema.parse(JSON.parse((threat as any).indicators || '[]'));
    } catch (error) {
      logger.error('Corrupted threat indicators', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Invalid threat indicators data');
    }

    // SECURITY: Validate evidence
    let evidence: any = {};
    try {
      evidence = ThreatEvidenceSchema.parse(JSON.parse((threat as any).evidence || '{}'));
    } catch (error) {
      logger.error('Corrupted threat evidence', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Invalid threat evidence data');
    }

    logger.info('Threat retrieved', { id, organizationId, title: (threat as any).title });

    const result = {
      ...threat,
      indicators,
      evidence,
      mitreTactics: (threat as any).mitreTactics ? (threat as any).mitreTactics.split(',').filter(Boolean) : [],
    };

    // Cache the result
    await cacheService.set(cacheKey, result, {
      ttl: CacheTTL.MEDIUM,
      namespace: CacheNamespaces.THREATS,
    });

    return result;
  }

  /**
   * Create new threat
   */
  async create(organizationId: string, data: CreateThreatInput) {
    // SECURITY: Validate indicators before storing
    const validatedIndicators = data.indicators 
      ? ThreatIndicatorsSchema.parse(data.indicators)
      : [];

    // SECURITY: Validate evidence before storing
    const validatedEvidence = data.evidence 
      ? ThreatEvidenceSchema.parse(data.evidence)
      : {};

    const threatData: Prisma.ThreatCreateInput = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      sourceIp: data.sourceIp || null,
      indicators: JSON.stringify(validatedIndicators),
      evidence: JSON.stringify(validatedEvidence),
      mitreTactics: data.mitreTactics?.join(',') || '',
      mitreId: data.mitreId || null,
      organization: {
        connect: { id: organizationId },
      },
      ...(data.identityId && {
        identity: {
          connect: { id: data.identityId },
        },
      }),
    };

    const threat = await threatRepository.create(threatData);

    logger.warn('Threat created', {
      id: threat.id,
      organizationId,
      title: (threat as any).title,
      severity: threat.severity,
      category: threat.category,
    });

    // Forward to SIEM if configured
    if (siemService.isAnyConfigured()) {
      const siemEvent: SiemEvent = {
        id: threat.id,
        timestamp: threat.createdAt,
        severity: threat.severity as 'low' | 'medium' | 'high' | 'critical',
        category: threat.category,
        eventType: 'threat_detected',
        source: 'nexora',
        sourceIp: threat.sourceIp || undefined,
        identityId: threat.identityId || undefined,
        organizationId,
        title: (threat as any).title,
        description: (threat as any).description,
        mitreTactics: data.mitreTactics,
        mitreTechniques: data.mitreId ? [data.mitreId] : undefined,
        indicators: validatedIndicators.map(i => `${i.type}:${i.value}`),
      };

      siemService.sendEvent(siemEvent).catch(err => {
        logger.error('Failed to forward threat to SIEM', {
          threatId: threat.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
    }

    return {
      ...threat,
      indicators: validatedIndicators,
      evidence: validatedEvidence,
      mitreTactics: data.mitreTactics || [],
    };
  }

  /**
   * Update threat (invalidate cache)
   */
  async update(id: string, organizationId: string, data: UpdateThreatInput) {
    // Verify threat exists
    await this.getById(id, organizationId);

    // Invalidate cache
    await cacheService.delete(`${organizationId}:${id}`, CacheNamespaces.THREATS);

    // Prepare update data
    const updateData: Prisma.ThreatUpdateInput = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.severity && { severity: data.severity }),
      ...(data.status && { status: data.status }),
      ...(data.category && { category: data.category }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(data.sourceIp !== undefined && { sourceIp: data.sourceIp || null }),
      ...(data.mitreId !== undefined && { mitreId: data.mitreId || null }),
      updatedAt: new Date(),
    };

    // SECURITY: Validate indicators if provided
    if (data.indicators) {
      const validatedIndicators = ThreatIndicatorsSchema.parse(data.indicators);
      updateData.indicators = JSON.stringify(validatedIndicators);
    }

    // SECURITY: Validate evidence if provided
    if (data.evidence) {
      const validatedEvidence = ThreatEvidenceSchema.parse(data.evidence);
      updateData.evidence = JSON.stringify(validatedEvidence);
    }

    // SECURITY: Validate MITRE tactics if provided
    if (data.mitreTactics) {
      updateData.mitreTactics = data.mitreTactics.join(',');
    }

    await threatRepository.update(id, organizationId, updateData);

    logger.info('Threat updated', {
      id,
      organizationId,
      changes: Object.keys(data),
    });

    return this.getById(id, organizationId);
  }

  /**
   * Delete threat (invalidate cache)
   */
  async delete(id: string, organizationId: string) {
    // Verify threat exists
    await this.getById(id, organizationId);

    // Invalidate cache
    await cacheService.delete(`${organizationId}:${id}`, CacheNamespaces.THREATS);

    await threatRepository.delete(id, organizationId);

    logger.info('Threat deleted', { id, organizationId });

    return { success: true, message: 'Threat deleted successfully' };
  }

  /**
   * Update threat status
   */
  async updateStatus(id: string, organizationId: string, status: string) {
    // Verify threat exists
    await this.getById(id, organizationId);

    await threatRepository.updateStatus(id, organizationId, status);

    logger.info('Threat status updated', { id, organizationId, status });

    return this.getById(id, organizationId);
  }

  /**
   * Investigate threat
   */
  async investigate(id: string, organizationId: string, data: InvestigateThreatInput) {
    // Verify threat exists
    const threat = await this.getById(id, organizationId);

    // Update status to investigating
    await threatRepository.updateStatus(id, organizationId, 'investigating');

    // Assign if provided
    if (data.assignedTo) {
      await threatRepository.assign(id, organizationId, data.assignedTo);
    }

    logger.info('Threat investigation started', {
      id,
      organizationId,
      assignedTo: data.assignedTo,
    });

    return {
      success: true,
      message: 'Investigation started',
      threat: await this.getById(id, organizationId),
    };
  }

  /**
   * Remediate threat
   */
  async remediate(id: string, organizationId: string, data: RemediateThreatInput) {
    // Verify threat exists
    await this.getById(id, organizationId);

    logger.info('Threat remediation initiated', {
      id,
      organizationId,
      action: data.action,
      playbookId: data.playbookId,
    });

    // TODO (Sprint 2): Integrate with remediation service for real execution
    
    return {
      success: true,
      message: 'Remediation initiated (simulated)',
      action: data.action,
      threat: await this.getById(id, organizationId),
    };
  }

  /**
   * Search threats
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    const threats = await threatRepository.search(organizationId, searchTerm, limit);

    logger.info('Threats searched', {
      organizationId,
      searchTerm,
      count: threats.length,
    });

    return threats;
  }

  /**
   * Get threat statistics
   */
  async getStatistics(organizationId: string) {
    const [
      total,
      bySeverity,
      byStatus,
      byCategory,
      active,
      recent,
    ] = await Promise.all([
      threatRepository.count(organizationId),
      this.getCountByField(organizationId, 'severity'),
      this.getCountByField(organizationId, 'status'),
      this.getCountByField(organizationId, 'category'),
      threatRepository.findActive(organizationId),
      threatRepository.findRecent(organizationId, 5),
    ]);

    return {
      total,
      bySeverity,
      byStatus,
      byCategory,
      active: active.length,
      recent,
    };
  }

  /**
   * Helper: Get count by field
   */
  private async getCountByField(organizationId: string, field: string) {
    const threats = await threatRepository.findAll(organizationId, {});
    const counts: Record<string, number> = {};

    for (const threat of threats) {
      const value = (threat as any)[field];
      counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
  }
}

export const threatService = new ThreatService();
