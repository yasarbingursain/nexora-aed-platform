import { Request, Response } from 'express';
import { exportService } from '@/services/export.service';
import { auditLoggingService } from '@/services/audit-logging.service';
import { logger } from '@/utils/logger';
import { AuthenticatedUser } from '@/middleware/auth.middleware';

/**
 * Export Controller
 * Handles data export requests
 */
export class ExportController {
  /**
   * Export threats
   * GET /api/v1/export/threats?format=json&severity=high
   */
  static async exportThreats(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;
      const { format = 'json', ...filters } = req.query;

      const result = await exportService.export({
        format: format as 'json' | 'csv',
        entityType: 'threats',
        organizationId: user.organizationId,
        filters,
      });

      // Log export
      await auditLoggingService.logDataExport(
        'threats',
        user.userId,
        user.organizationId,
        req,
        Array.isArray(result.data) ? result.data.length : 1
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      logger.error('Export threats failed', { error });
      res.status(500).json({ error: 'Export failed' });
    }
  }

  /**
   * Export identities
   * GET /api/v1/export/identities?format=csv
   */
  static async exportIdentities(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;
      const { format = 'json', ...filters } = req.query;

      const result = await exportService.export({
        format: format as 'json' | 'csv',
        entityType: 'identities',
        organizationId: user.organizationId,
        filters,
      });

      await auditLoggingService.logDataExport(
        'identities',
        user.userId,
        user.organizationId,
        req,
        Array.isArray(result.data) ? result.data.length : 1
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      logger.error('Export identities failed', { error });
      res.status(500).json({ error: 'Export failed' });
    }
  }

  /**
   * Export audit logs
   * GET /api/v1/export/audit?format=csv&dateFrom=2024-01-01
   */
  static async exportAuditLogs(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;
      const { format = 'json', ...filters } = req.query;

      const result = await exportService.export({
        format: format as 'json' | 'csv',
        entityType: 'audit',
        organizationId: user.organizationId,
        filters,
      });

      await auditLoggingService.logDataExport(
        'audit_logs',
        user.userId,
        user.organizationId,
        req,
        Array.isArray(result.data) ? result.data.length : 1
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      logger.error('Export audit logs failed', { error });
      res.status(500).json({ error: 'Export failed' });
    }
  }

  /**
   * Generate compliance report
   * GET /api/v1/export/compliance-report
   */
  static async complianceReport(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;

      const report = await exportService.generateComplianceReport(user.organizationId);

      await auditLoggingService.logComplianceEvent(
        'report_generated',
        'compliance',
        user.organizationId,
        user.userId,
        user.organizationId,
        req
      );

      res.json(report);
    } catch (error) {
      logger.error('Compliance report generation failed', { error });
      res.status(500).json({ error: 'Report generation failed' });
    }
  }
}
