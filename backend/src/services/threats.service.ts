import { threatRepository } from '@/repositories/threats.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import type {
  CreateThreatInput,
  UpdateThreatInput,
  ListThreatsQuery,
  InvestigateThreatInput,
  RemediateThreatInput,
} from '@/validators/threats.validator';

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

    const skip = (page - 1) * limit;

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
      threatRepository.findAll(organizationId, { skip, take: limit, where, orderBy }),
      threatRepository.count(organizationId, where),
    ]);

    logger.info('Threats listed', {
      organizationId,
      count: threats.length,
      total,
      page,
      limit,
    });

    return {
      data: threats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get threat by ID
   */
  async getById(id: string, organizationId: string) {
    const threat = await threatRepository.findById(id, organizationId);

    if (!threat) {
      logger.warn('Threat not found', { id, organizationId });
      throw new Error('Threat not found');
    }

    logger.info('Threat retrieved', { id, organizationId, title: threat.title });

    return threat;
  }

  /**
   * Create new threat
   */
  async create(organizationId: string, data: CreateThreatInput) {
    // Prepare threat data
    const threatData: Prisma.ThreatCreateInput = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      sourceIp: data.sourceIp || null,
      indicators: JSON.stringify(data.indicators || []),
      evidence: JSON.stringify(data.evidence || {}),
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
      title: threat.title,
      severity: threat.severity,
      category: threat.category,
    });

    return threat;
  }

  /**
   * Update threat
   */
  async update(id: string, organizationId: string, data: UpdateThreatInput) {
    // Verify threat exists
    await this.getById(id, organizationId);

    // Prepare update data
    const updateData: Prisma.ThreatUpdateInput = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.severity && { severity: data.severity }),
      ...(data.status && { status: data.status }),
      ...(data.category && { category: data.category }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(data.sourceIp !== undefined && { sourceIp: data.sourceIp || null }),
      ...(data.indicators && { indicators: JSON.stringify(data.indicators) }),
      ...(data.evidence && { evidence: JSON.stringify(data.evidence) }),
      ...(data.mitreTactics && { mitreTactics: data.mitreTactics.join(',') }),
      ...(data.mitreId !== undefined && { mitreId: data.mitreId || null }),
      updatedAt: new Date(),
    };

    await threatRepository.update(id, organizationId, updateData);

    logger.info('Threat updated', {
      id,
      organizationId,
      changes: Object.keys(data),
    });

    return this.getById(id, organizationId);
  }

  /**
   * Delete threat
   */
  async delete(id: string, organizationId: string) {
    // Verify threat exists
    await this.getById(id, organizationId);

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
    const threat = await this.getById(id, organizationId);

    logger.info('Threat remediation initiated', {
      id,
      organizationId,
      action: data.action,
      playbookId: data.playbookId,
    });

    // TODO: Integrate with remediation service to execute actions
    // This would trigger actual remediation playbooks

    return {
      success: true,
      message: 'Remediation initiated',
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
