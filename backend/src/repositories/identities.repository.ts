import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

/**
 * Identity Repository
 * 
 * Database access layer for identities
 * - All queries scoped to organizationId
 * - Type-safe with Prisma
 * - Reusable query logic
 */

export class IdentityRepository {
  /**
   * Find all identities for an organization
   */
  async findAll(organizationId: string, options: {
    skip?: number;
    take?: number;
    where?: Prisma.IdentityWhereInput;
    orderBy?: Prisma.IdentityOrderByWithRelationInput;
  }) {
    const query: any = {
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...options.where,
      },
      include: {
        activities: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
      },
    };

    if (options.skip !== undefined) query.skip = options.skip;
    if (options.take !== undefined) query.take = options.take;
    if (options.orderBy !== undefined) query.orderBy = options.orderBy;

    return prisma.identity.findMany(query);
  }

  /**
   * Count identities for an organization
   */
  async count(organizationId: string, where?: Prisma.IdentityWhereInput) {
    return prisma.identity.count({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...where,
      },
    });
  }

  /**
   * Find identity by ID
   */
  async findById(id: string, organizationId: string) {
    return prisma.identity.findFirst({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      include: {
        activities: {
          take: 20,
          orderBy: { timestamp: 'desc' },
        },
        threats: {
          where: { status: { not: 'resolved' } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        baselines: true,
        observations: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  /**
   * Create new identity
   */
  async create(data: Prisma.IdentityCreateInput) {
    return prisma.identity.create({
      data,
      include: {
        activities: true,
      },
    });
  }

  /**
   * Update identity
   */
  async update(id: string, organizationId: string, data: Prisma.IdentityUpdateInput) {
    return prisma.identity.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data,
    });
  }

  /**
   * Delete identity
   */
  async delete(id: string, organizationId: string) {
    return prisma.identity.deleteMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
    });
  }

  /**
   * Update identity status
   */
  async updateStatus(id: string, organizationId: string, status: string) {
    return prisma.identity.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update identity risk level
   */
  async updateRiskLevel(id: string, organizationId: string, riskLevel: string) {
    return prisma.identity.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data: {
        riskLevel,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Record identity activity
   */
  async recordActivity(identityId: string, activity: string, source: string, metadata: any) {
    return prisma.identityActivity.create({
      data: {
        identityId,
        activity,
        source,
        metadata: JSON.stringify(metadata),
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get identity activities
   */
  async getActivities(identityId: string, organizationId: string, limit: number = 50) {
    // First verify identity belongs to organization
    const identity = await prisma.identity.findFirst({
      where: {
        id: identityId,
        organizationId,  // CRITICAL: Always filter by org
      },
    });

    if (!identity) {
      return [];
    }

    return prisma.identityActivity.findMany({
      where: {
        identityId,
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Search identities
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    return prisma.identity.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { owner: { contains: searchTerm } },
          { externalId: { contains: searchTerm } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get identities by type
   */
  async findByType(organizationId: string, type: string) {
    return prisma.identity.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        type,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get identities by provider
   */
  async findByProvider(organizationId: string, provider: string) {
    return prisma.identity.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        provider,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get identities by risk level
   */
  async findByRiskLevel(organizationId: string, riskLevel: string) {
    return prisma.identity.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        riskLevel,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Get identities requiring rotation
   */
  async findRequiringRotation(organizationId: string) {
    const now = new Date();
    
    return prisma.identity.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        status: 'active',
        rotationInterval: { not: null },
        OR: [
          { lastRotatedAt: null },
          // Add rotation logic based on interval
        ],
      },
      orderBy: { lastRotatedAt: 'asc' },
    });
  }
}

export const identityRepository = new IdentityRepository();
