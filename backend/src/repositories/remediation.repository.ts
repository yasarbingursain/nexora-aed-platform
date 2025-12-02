import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

/**
 * Remediation Repository
 * 
 * Database access layer for playbooks and actions
 * - All queries scoped to organizationId
 */

export class RemediationRepository {
  // ============ PLAYBOOKS ============

  /**
   * Find all playbooks for an organization
   */
  async findAllPlaybooks(organizationId: string, options: {
    skip?: number;
    take?: number;
    where?: Prisma.PlaybookWhereInput;
  }) {
    const query: any = {
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...options.where,
      },
    };

    if (options.skip !== undefined) query.skip = options.skip;
    if (options.take !== undefined) query.take = options.take;

    return prisma.playbook.findMany(query);
  }

  /**
   * Count playbooks
   */
  async countPlaybooks(organizationId: string, where?: Prisma.PlaybookWhereInput) {
    return prisma.playbook.count({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...where,
      },
    });
  }

  /**
   * Find playbook by ID
   */
  async findPlaybookById(id: string, organizationId: string) {
    return prisma.playbook.findFirst({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Create playbook
   */
  async createPlaybook(data: Prisma.PlaybookCreateInput) {
    return prisma.playbook.create({ data });
  }

  /**
   * Update playbook
   */
  async updatePlaybook(id: string, organizationId: string, data: Prisma.PlaybookUpdateInput) {
    return prisma.playbook.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data,
    });
  }

  /**
   * Delete playbook
   */
  async deletePlaybook(id: string, organizationId: string) {
    return prisma.playbook.deleteMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
    });
  }

  // ============ ACTIONS ============

  /**
   * Find all actions for an organization
   */
  async findAllActions(organizationId: string, options: {
    skip?: number;
    take?: number;
    where?: Prisma.ActionWhereInput;
    orderBy?: Prisma.ActionOrderByWithRelationInput;
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
          },
        },
        threat: {
          select: {
            id: true,
            title: true,
            severity: true,
          },
        },
        playbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    };

    if (options.skip !== undefined) query.skip = options.skip;
    if (options.take !== undefined) query.take = options.take;
    if (options.orderBy !== undefined) query.orderBy = options.orderBy;

    return prisma.action.findMany(query);
  }

  /**
   * Count actions
   */
  async countActions(organizationId: string, where?: Prisma.ActionWhereInput) {
    return prisma.action.count({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...where,
      },
    });
  }

  /**
   * Find action by ID
   */
  async findActionById(id: string, organizationId: string) {
    return prisma.action.findFirst({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      include: {
        identity: true,
        threat: true,
        playbook: true,
      },
    });
  }

  /**
   * Create action
   */
  async createAction(data: Prisma.ActionCreateInput) {
    return prisma.action.create({
      data,
      include: {
        identity: true,
        threat: true,
        playbook: true,
      },
    });
  }

  /**
   * Update action
   */
  async updateAction(id: string, organizationId: string, data: Prisma.ActionUpdateInput) {
    return prisma.action.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data,
    });
  }

  /**
   * Get recent actions
   */
  async findRecentActions(organizationId: string, limit: number = 10) {
    return prisma.action.findMany({
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
        threat: {
          select: {
            id: true,
            title: true,
            severity: true,
          },
        },
      },
    });
  }

  /**
   * Get actions by status
   */
  async findActionsByStatus(organizationId: string, status: string) {
    return prisma.action.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        status,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        identity: true,
        threat: true,
        playbook: true,
      },
    });
  }
}

export const remediationRepository = new RemediationRepository();
