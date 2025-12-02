import { identityRepository } from '@/repositories/identities.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import type {
  CreateIdentityInput,
  UpdateIdentityInput,
  ListIdentitiesQuery,
  RotateCredentialsInput,
  QuarantineIdentityInput,
} from '@/validators/identities.validator';

/**
 * Identity Service
 * 
 * Business logic for identity management
 * - All operations scoped to organizationId
 * - Handles business rules and validation
 * - Calls repository for database operations
 */

export class IdentityService {
  /**
   * List identities with pagination and filtering
   */
  async list(organizationId: string, query: ListIdentitiesQuery) {
    const { page = 1, limit = 20, type, provider, status, riskLevel, owner, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.IdentityWhereInput = {
      organizationId,  // CRITICAL: Always filter by org
    };

    if (type) where.type = type;
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    if (owner) where.owner = owner;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { owner: { contains: search } },
      ];
    }

    // Build order by
    const orderBy: Prisma.IdentityOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [identities, total] = await Promise.all([
      identityRepository.findAll(organizationId, { skip, take: limit, where, orderBy }),
      identityRepository.count(organizationId, where),
    ]);

    logger.info('Identities listed', {
      organizationId,
      count: identities.length,
      total,
      page,
      limit,
    });

    return {
      data: identities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get identity by ID
   */
  async getById(id: string, organizationId: string) {
    const identity = await identityRepository.findById(id, organizationId);

    if (!identity) {
      logger.warn('Identity not found', { id, organizationId });
      throw new Error('Identity not found');
    }

    logger.info('Identity retrieved', { id, organizationId, name: identity.name });

    return identity;
  }

  /**
   * Create new identity
   */
  async create(organizationId: string, data: CreateIdentityInput) {
    // Prepare identity data
    const identityData: Prisma.IdentityCreateInput = {
      name: data.name,
      type: data.type,
      provider: data.provider,
      externalId: data.externalId || null,
      owner: data.owner || null,
      description: data.description || null,
      tags: data.tags?.join(',') || '',
      credentials: JSON.stringify(data.credentials || {}),
      metadata: JSON.stringify(data.metadata || {}),
      rotationInterval: data.rotationInterval || null,
      organization: {
        connect: { id: organizationId },
      },
    };

    const identity = await identityRepository.create(identityData);

    logger.info('Identity created', {
      id: identity.id,
      organizationId,
      name: identity.name,
      type: identity.type,
      provider: identity.provider,
    });

    // Record creation activity
    await identityRepository.recordActivity(
      identity.id,
      'identity_created',
      'system',
      { name: identity.name, type: identity.type }
    );

    return identity;
  }

  /**
   * Update identity
   */
  async update(id: string, organizationId: string, data: UpdateIdentityInput) {
    // Verify identity exists
    const existing = await this.getById(id, organizationId);

    // Prepare update data
    const updateData: Prisma.IdentityUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.status && { status: data.status }),
      ...(data.riskLevel && { riskLevel: data.riskLevel }),
      ...(data.owner && { owner: data.owner }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.tags && { tags: data.tags.join(',') }),
      ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
      ...(data.rotationInterval && { rotationInterval: data.rotationInterval }),
      updatedAt: new Date(),
    };

    await identityRepository.update(id, organizationId, updateData);

    logger.info('Identity updated', {
      id,
      organizationId,
      changes: Object.keys(data),
    });

    // Record update activity
    await identityRepository.recordActivity(
      id,
      'identity_updated',
      'system',
      { changes: Object.keys(data) }
    );

    return this.getById(id, organizationId);
  }

  /**
   * Delete identity
   */
  async delete(id: string, organizationId: string) {
    // Verify identity exists
    await this.getById(id, organizationId);

    await identityRepository.delete(id, organizationId);

    logger.info('Identity deleted', { id, organizationId });

    return { success: true, message: 'Identity deleted successfully' };
  }

  /**
   * Rotate credentials
   */
  async rotateCredentials(id: string, organizationId: string, data: RotateCredentialsInput) {
    // Verify identity exists
    const identity = await this.getById(id, organizationId);

    logger.info('Rotating credentials', {
      id,
      organizationId,
      strategy: data.rotationStrategy,
    });

    // Update last rotated timestamp
    await identityRepository.update(id, organizationId, {
      lastRotatedAt: new Date(),
      updatedAt: new Date(),
    });

    // Record rotation activity
    await identityRepository.recordActivity(
      id,
      'credentials_rotated',
      'system',
      {
        strategy: data.rotationStrategy,
        notifyOwner: data.notifyOwner,
        scheduledDate: data.scheduledDate,
      }
    );

    // TODO: Integrate with cloud providers to actually rotate credentials
    // This would call AWS/Azure/GCP APIs to rotate the actual credentials

    logger.info('Credentials rotated', { id, organizationId });

    return {
      success: true,
      message: 'Credentials rotation initiated',
      identity: await this.getById(id, organizationId),
    };
  }

  /**
   * Quarantine identity
   */
  async quarantine(id: string, organizationId: string, data: QuarantineIdentityInput) {
    // Verify identity exists
    const identity = await this.getById(id, organizationId);

    // Update status to quarantined
    await identityRepository.updateStatus(id, organizationId, 'quarantined');

    // Update risk level to critical
    await identityRepository.updateRiskLevel(id, organizationId, 'critical');

    logger.warn('Identity quarantined', {
      id,
      organizationId,
      reason: data.reason,
    });

    // Record quarantine activity
    await identityRepository.recordActivity(
      id,
      'identity_quarantined',
      'system',
      {
        reason: data.reason,
        notifyOwner: data.notifyOwner,
      }
    );

    // TODO: Notify owner if requested
    // TODO: Trigger automated remediation actions

    return {
      success: true,
      message: 'Identity quarantined successfully',
      identity: await this.getById(id, organizationId),
    };
  }

  /**
   * Get identity activities
   */
  async getActivities(id: string, organizationId: string, limit: number = 50) {
    // Verify identity exists
    await this.getById(id, organizationId);

    const activities = await identityRepository.getActivities(id, organizationId, limit);

    logger.info('Identity activities retrieved', {
      id,
      organizationId,
      count: activities.length,
    });

    return activities;
  }

  /**
   * Search identities
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    const identities = await identityRepository.search(organizationId, searchTerm, limit);

    logger.info('Identities searched', {
      organizationId,
      searchTerm,
      count: identities.length,
    });

    return identities;
  }

  /**
   * Get identity statistics
   */
  async getStatistics(organizationId: string) {
    const [
      total,
      byType,
      byStatus,
      byRiskLevel,
      byProvider,
    ] = await Promise.all([
      identityRepository.count(organizationId),
      this.getCountByField(organizationId, 'type'),
      this.getCountByField(organizationId, 'status'),
      this.getCountByField(organizationId, 'riskLevel'),
      this.getCountByField(organizationId, 'provider'),
    ]);

    return {
      total,
      byType,
      byStatus,
      byRiskLevel,
      byProvider,
    };
  }

  /**
   * Helper: Get count by field
   */
  private async getCountByField(organizationId: string, field: string) {
    // This is a simplified version - in production, use Prisma groupBy
    const identities = await identityRepository.findAll(organizationId, {});
    const counts: Record<string, number> = {};

    for (const identity of identities) {
      const value = (identity as any)[field];
      counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
  }
}

export const identityService = new IdentityService();
