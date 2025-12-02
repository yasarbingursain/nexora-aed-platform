/**
 * Compliance Dashboard Controller
 * API endpoints for compliance status across all frameworks
 */

import { Request, Response } from 'express';
import { complianceDashboardService } from '@/services/compliance.dashboard.service';
import { logger } from '@/utils/logger';

export class ComplianceDashboardController {
  /**
   * GET /api/v1/compliance/status
   * Get comprehensive compliance dashboard
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const dashboard = await complianceDashboardService.getDashboard(organizationId);

      res.status(200).json(dashboard);
    } catch (error) {
      logger.error('Compliance dashboard endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to get compliance status' });
    }
  }

  /**
   * GET /api/v1/compliance/frameworks/:framework
   * Get status for specific framework
   */
  async getFrameworkStatus(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { framework } = req.params;

      if (!organizationId || !framework) {
        res.status(400).json({ error: 'Organization ID and framework required' });
        return;
      }

      const validFrameworks = ['soc2', 'iso27001', 'pci_dss', 'gdpr', 'hipaa', 'dora'];
      if (!validFrameworks.includes(framework)) {
        res.status(400).json({ 
          error: 'Invalid framework',
          valid_frameworks: validFrameworks 
        });
        return;
      }

      const dashboard = await complianceDashboardService.getDashboard(organizationId);
      const frameworkStatus = dashboard.frameworks[framework as keyof typeof dashboard.frameworks];

      if (!frameworkStatus) {
        res.status(404).json({ error: 'Framework status not found' });
        return;
      }

      res.status(200).json({
        framework,
        organization_id: organizationId,
        ...frameworkStatus,
      });
    } catch (error) {
      logger.error('Framework status endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to get framework status' });
    }
  }

  /**
   * GET /api/v1/compliance/health
   * Get compliance health check
   */
  async getHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const dashboard = await complianceDashboardService.getDashboard(organizationId);

      // Calculate overall health
      const frameworks = Object.values(dashboard.frameworks);
      const totalScore = frameworks.reduce((sum, f) => sum + (f?.score || 0), 0);
      const avgScore = frameworks.length > 0 ? totalScore / frameworks.length : 0;

      const compliantCount = frameworks.filter(f => f?.status === 'compliant').length;
      const partialCount = frameworks.filter(f => f?.status === 'partial').length;
      const nonCompliantCount = frameworks.filter(f => f?.status === 'non_compliant').length;

      res.status(200).json({
        organization_id: organizationId,
        overall_health: avgScore >= 95 ? 'healthy' : avgScore >= 80 ? 'warning' : 'critical',
        average_score: Math.round(avgScore),
        frameworks_compliant: compliantCount,
        frameworks_partial: partialCount,
        frameworks_non_compliant: nonCompliantCount,
        risk_areas_count: dashboard.risk_areas.length,
        last_updated: dashboard.last_updated,
      });
    } catch (error) {
      logger.error('Compliance health check endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to get compliance health' });
    }
  }
}

export const complianceDashboardController = new ComplianceDashboardController();
