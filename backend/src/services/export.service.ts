import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { Parser } from '@json2csv/plainjs';

/**
 * FEATURE: Data Export Service
 * 
 * Supports multiple export formats:
 * - JSON (structured data)
 * - CSV (tabular data)
 * - Excel (coming soon)
 * - PDF reports (coming soon)
 * 
 * Export types:
 * - Threats
 * - Identities
 * - Audit logs
 * - Compliance reports
 * - Custom queries
 */

interface ExportOptions {
  format: 'json' | 'csv';
  entityType: 'threats' | 'identities' | 'audit' | 'users';
  organizationId: string;
  filters?: Record<string, any>;
  limit?: number;
  fields?: string[];
}

export class ExportService {
  /**
   * Export data in specified format
   */
  async export(options: ExportOptions): Promise<{ data: string; filename: string; mimeType: string }> {
    logger.info('Export initiated', {
      format: options.format,
      entityType: options.entityType,
      organizationId: options.organizationId,
    });

    // Fetch data
    const data = await this.fetchData(options);

    // Convert to requested format
    let exportData: string;
    let mimeType: string;
    let extension: string;

    switch (options.format) {
      case 'csv':
        exportData = this.toCSV(data, options.fields);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
      default:
        exportData = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    const filename = `${options.entityType}-export-${Date.now()}.${extension}`;

    logger.info('Export completed', {
      format: options.format,
      entityType: options.entityType,
      recordCount: Array.isArray(data) ? data.length : 1,
      size: exportData.length,
    });

    return {
      data: exportData,
      filename,
      mimeType,
    };
  }

  /**
   * Fetch data based on entity type
   */
  private async fetchData(options: ExportOptions): Promise<any[]> {
    const { entityType, organizationId, filters = {}, limit = 10000 } = options;

    switch (entityType) {
      case 'threats':
        return this.fetchThreats(organizationId, filters, limit);
      case 'identities':
        return this.fetchIdentities(organizationId, filters, limit);
      case 'audit':
        return this.fetchAuditLogs(organizationId, filters, limit);
      case 'users':
        return this.fetchUsers(organizationId, filters, limit);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Fetch threats for export
   */
  private async fetchThreats(organizationId: string, filters: any, limit: number) {
    const where: any = { organizationId };

    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const threats = await prisma.threat.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        category: true,
        sourceIp: true,
        indicators: true,
        evidence: true,
        mitreTactics: true,
        mitreId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return threats.map(threat => ({
      ...threat,
      indicators: threat.indicators ? JSON.parse(threat.indicators) : [],
      evidence: threat.evidence ? JSON.parse(threat.evidence) : {},
      mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',') : [],
    }));
  }

  /**
   * Fetch identities for export
   */
  private async fetchIdentities(organizationId: string, filters: any, limit: number) {
    const where: any = { organizationId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.riskScoreMin || filters.riskScoreMax) {
      where.riskScore = {};
      if (filters.riskScoreMin) where.riskScore.gte = parseFloat(filters.riskScoreMin);
      if (filters.riskScoreMax) where.riskScore.lte = parseFloat(filters.riskScoreMax);
    }

    return prisma.identity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        riskScore: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Fetch audit logs for export
   */
  private async fetchAuditLogs(organizationId: string, filters: any, limit: number) {
    const where: any = { organizationId };

    if (filters.event) where.event = filters.event;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
    }));
  }

  /**
   * Fetch users for export
   */
  private async fetchUsers(organizationId: string, filters: any, limit: number) {
    const where: any = { organizationId };

    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';

    return prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        // Exclude sensitive fields
        passwordHash: false,
        mfaSecret: false,
      },
    });
  }

  /**
   * Convert data to CSV format
   */
  private toCSV(data: any[], fields?: string[]): string {
    if (data.length === 0) {
      return '';
    }

    try {
      // Auto-detect fields if not provided
      const csvFields = fields || Object.keys(data[0]);

      const parser = new Parser({ fields: csvFields });
      return parser.parse(data);
    } catch (error) {
      logger.error('CSV conversion failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Failed to convert data to CSV');
    }
  }

  /**
   * Stream large exports (for very large datasets)
   */
  async *streamExport(options: ExportOptions): AsyncGenerator<string> {
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batchOptions = {
        ...options,
        limit: batchSize,
        filters: {
          ...options.filters,
          offset,
        },
      };

      const batch = await this.fetchData(batchOptions);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Yield batch as CSV or JSON
      if (options.format === 'csv') {
        yield this.toCSV(batch, options.fields);
      } else {
        yield JSON.stringify(batch);
      }

      offset += batchSize;
      hasMore = batch.length === batchSize;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(organizationId: string): Promise<any> {
    const [
      threatStats,
      identityStats,
      auditStats,
      userStats,
    ] = await Promise.all([
      // Threat statistics
      prisma.threat.groupBy({
        by: ['severity', 'status'],
        where: { organizationId },
        _count: true,
      }),

      // Identity statistics
      prisma.identity.groupBy({
        by: ['type', 'status'],
        where: { organizationId },
        _count: true,
      }),

      // Audit log statistics
      prisma.auditLog.groupBy({
        by: ['event', 'severity'],
        where: {
          organizationId,
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: true,
      }),

      // User statistics
      prisma.user.groupBy({
        by: ['role', 'isActive'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      organizationId,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      threats: {
        bySeverity: this.groupByField(threatStats, 'severity'),
        byStatus: this.groupByField(threatStats, 'status'),
      },
      identities: {
        byType: this.groupByField(identityStats, 'type'),
        byStatus: this.groupByField(identityStats, 'status'),
      },
      auditLogs: {
        byEvent: this.groupByField(auditStats, 'event'),
        bySeverity: this.groupByField(auditStats, 'severity'),
      },
      users: {
        byRole: this.groupByField(userStats, 'role'),
        byStatus: this.groupByField(userStats, 'isActive'),
      },
    };
  }

  /**
   * Helper to group statistics by field
   */
  private groupByField(stats: any[], field: string): Record<string, number> {
    return stats.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + item._count;
      return acc;
    }, {});
  }
}

export const exportService = new ExportService();
