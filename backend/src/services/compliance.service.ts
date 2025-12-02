import { complianceRepository } from '@/repositories/compliance.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import type {
  GenerateReportInput,
  ListReportsQuery,
} from '@/validators/compliance.validator';

/**
 * Compliance Service
 * 
 * Business logic for compliance reporting
 */

export class ComplianceService {
  async listReports(organizationId: string, query: ListReportsQuery) {
    const { page = 1, limit = 20, framework, reportType, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplianceReportWhereInput = { organizationId };
    if (framework) where.framework = framework;
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orderBy: Prisma.ComplianceReportOrderByWithRelationInput = { createdAt: 'desc' };

    const [reports, total] = await Promise.all([
      complianceRepository.findAll(organizationId, { skip, take: limit, where, orderBy }),
      complianceRepository.count(organizationId, where),
    ]);

    return {
      data: reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReportById(id: string, organizationId: string) {
    const report = await complianceRepository.findById(id, organizationId);
    if (!report) throw new Error('Report not found');
    return report;
  }

  async generateReport(organizationId: string, data: GenerateReportInput) {
    const reportData: Prisma.ComplianceReportCreateInput = {
      framework: data.framework,
      reportType: data.reportType,
      status: 'generating',
      organization: { connect: { id: organizationId } },
    };

    const report = await complianceRepository.create(reportData);

    logger.info('Compliance report generation started', {
      id: report.id,
      organizationId,
      framework: data.framework,
      reportType: data.reportType,
    });

    // TODO: Trigger background job to generate report
    // This would collect evidence, audit logs, and generate the actual report

    return report;
  }

  async deleteReport(id: string, organizationId: string) {
    await this.getReportById(id, organizationId);
    await complianceRepository.delete(id, organizationId);
    logger.info('Compliance report deleted', { id, organizationId });
    return { success: true, message: 'Report deleted successfully' };
  }

  async getFrameworkSummary(organizationId: string, framework: string) {
    const reports = await complianceRepository.findByFramework(organizationId, framework);
    
    return {
      framework,
      totalReports: reports.length,
      completed: reports.filter(r => r.status === 'completed').length,
      generating: reports.filter(r => r.status === 'generating').length,
      failed: reports.filter(r => r.status === 'failed').length,
      recent: reports.slice(0, 5),
    };
  }
}

export const complianceService = new ComplianceService();
