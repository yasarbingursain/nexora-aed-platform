import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

/**
 * Threat Repository
 * 
 * Database access layer for threats
 * - All queries scoped to organizationId
 * - Type-safe with Prisma
 */

export class ThreatRepository {
  /**
   * Find all threats for an organization
   */
  async findAll(organizationId: string, options: {
    skip?: number;
    take?: number;
    where?: Prisma.ThreatWhereInput;
    orderBy?: Prisma.ThreatOrderByWithRelationInput;
  }) {
    const query: any = {
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...options.where,
      },
      include: {
        identity: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    };

    if (options.skip !== undefined) query.skip = options.skip;
    if (options.take !== undefined) query.take = options.take;
    if (options.orderBy !== undefined) query.orderBy = options.orderBy;

    return prisma.threat.findMany(query);
  }

  /**
   * Count threats for an organization
   */
  async count(organizationId: string, where?: Prisma.ThreatWhereInput) {
    return prisma.threat.count({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...where,
      },
    });
  }

  /**
   * Find threat by ID
   */
  async findById(id: string, organizationId: string) {
    return prisma.threat.findFirst({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      include: {
        identity: true,
        actions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        incidents: true,
      },
    });
  }

  /**
   * Create new threat
   */
  async create(data: Prisma.ThreatCreateInput) {
    return prisma.threat.create({
      data,
      include: {
        identity: true,
      },
    });
  }

  /**
   * Update threat
   */
  async update(id: string, organizationId: string, data: Prisma.ThreatUpdateInput) {
    return prisma.threat.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data,
    });
  }

  /**
   * Delete threat
   */
  async delete(id: string, organizationId: string) {
    return prisma.threat.deleteMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
    });
  }

  /**
   * Update threat status
   */
  async updateStatus(id: string, organizationId: string, status: string) {
    return prisma.threat.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data: {
        status,
        ...(status === 'resolved' && { resolvedAt: new Date() }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Assign threat to user
   */
  async assign(id: string, organizationId: string, assignedTo: string) {
    return prisma.threat.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data: {
        assignedTo,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Search threats
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { category: { contains: searchTerm } },
          { mitreId: { contains: searchTerm } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        identity: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Get threats by severity
   */
  async findBySeverity(organizationId: string, severity: string) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        severity,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        identity: true,
      },
    });
  }

  /**
   * Get threats by status
   */
  async findByStatus(organizationId: string, status: string) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        status,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        identity: true,
      },
    });
  }

  /**
   * Get threats by identity
   */
  async findByIdentity(organizationId: string, identityId: string) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        identityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get recent threats
   */
  async findRecent(organizationId: string, limit: number = 10) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        identity: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Get active threats
   */
  async findActive(organizationId: string) {
    return prisma.threat.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        status: {
          in: ['open', 'investigating'],
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        identity: true,
      },
    });
  }
}

export const threatRepository = new ThreatRepository();
