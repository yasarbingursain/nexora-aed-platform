import { Request, Response } from 'express';
import { complianceService } from '@/services/compliance.service';
import { logger } from '@/utils/logger';

export class ComplianceController {
  private getOrganizationId(req: Request): string {
    const organizationId = req.tenant?.organizationId;
    if (!organizationId) throw new Error('No organization context');
    return organizationId as string;
  }

  async listReports(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const result = await complianceService.listReports(organizationId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to list reports', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getReportById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const report = await complianceService.getReportById(id, organizationId);
      res.status(200).json(report);
    } catch (error) {
      if (error instanceof Error && error.message === 'Report not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      logger.error('Failed to get report', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const report = await complianceService.generateReport(organizationId, req.body);
      res.status(201).json(report);
    } catch (error) {
      logger.error('Failed to generate report', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const result = await complianceService.deleteReport(id, organizationId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Report not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      logger.error('Failed to delete report', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFrameworkSummary(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const framework = req.params.framework as string;
      const summary = await complianceService.getFrameworkSummary(organizationId, framework);
      res.status(200).json(summary);
    } catch (error) {
      logger.error('Failed to get framework summary', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const complianceController = new ComplianceController();
