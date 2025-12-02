import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

/**
 * Compliance Repository
 * 
 * Database access layer for compliance reports
 * - All queries scoped to organizationId
 */

export class ComplianceRepository {
  /**
   * Find all reports for an organization
   */
  async findAll(organizationId: string, options: {
    skip?: number;
    take?: number;
    where?: Prisma.ComplianceReportWhereInput;
    orderBy?: Prisma.ComplianceReportOrderByWithRelationInput;
  }) {
    const query: any = {
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...options.where,
      },
    };

    if (options.skip !== undefined) query.skip = options.skip;
    if (options.take !== undefined) query.take = options.take;
    if (options.orderBy !== undefined) query.orderBy = options.orderBy;

    return prisma.complianceReport.findMany(query);
  }

  /**
   * Count reports
   */
  async count(organizationId: string, where?: Prisma.ComplianceReportWhereInput) {
    return prisma.complianceReport.count({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        ...where,
      },
    });
  }

  /**
   * Find report by ID
   */
  async findById(id: string, organizationId: string) {
    return prisma.complianceReport.findFirst({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
    });
  }

  /**
   * Create report
   */
  async create(data: Prisma.ComplianceReportCreateInput) {
    return prisma.complianceReport.create({ data });
  }

  /**
   * Update report
   */
  async update(id: string, organizationId: string, data: Prisma.ComplianceReportUpdateInput) {
    return prisma.complianceReport.updateMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
      data,
    });
  }

  /**
   * Delete report
   */
  async delete(id: string, organizationId: string) {
    return prisma.complianceReport.deleteMany({
      where: {
        id,
        organizationId,  // CRITICAL: Always filter by org
      },
    });
  }

  /**
   * Find reports by framework
   */
  async findByFramework(organizationId: string, framework: string) {
    return prisma.complianceReport.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
        framework,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find recent reports
   */
  async findRecent(organizationId: string, limit: number = 10) {
    return prisma.complianceReport.findMany({
      where: {
        organizationId,  // CRITICAL: Always filter by org
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const complianceRepository = new ComplianceRepository();
