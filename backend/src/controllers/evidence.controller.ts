/**
 * Evidence Controller
 * API endpoints for immutable audit trail and chain verification
 */

import { Request, Response } from 'express';
import { evidenceService } from '@/services/evidence.service';
import { logger } from '@/utils/logger';

export class EvidenceController {
  /**
   * POST /api/v1/evidence/verify
   * Verify hash-chain integrity for organization
   */
  async verifyChain(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const result = await evidenceService.verifyChain(organizationId);

      if (result.isValid) {
        res.status(200).json({
          status: 'valid',
          message: 'Hash-chain integrity verified',
          totalRecords: result.totalRecords,
          verifiedRecords: result.verifiedRecords,
        });
      } else {
        res.status(200).json({
          status: 'compromised',
          message: 'Hash-chain integrity violation detected',
          totalRecords: result.totalRecords,
          verifiedRecords: result.verifiedRecords,
          firstBreakAt: result.firstBreakAt,
          breakDetails: result.breakDetails,
        });
      }
    } catch (error) {
      logger.error('Chain verification endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Chain verification failed' });
    }
  }

  /**
   * GET /api/v1/evidence
   * Query evidence log with filters
   */
  async queryEvidence(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const filters: {
        action?: string;
        resourceType?: string;
        resourceId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
      } = {};

      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.resourceType) filters.resourceType = req.query.resourceType as string;
      if (req.query.resourceId) filters.resourceId = req.query.resourceId as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);

      const evidence = await evidenceService.queryEvidence(organizationId, filters);

      res.status(200).json({
        data: evidence,
        count: evidence.length,
        filters,
      });
    } catch (error) {
      logger.error('Evidence query endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Evidence query failed' });
    }
  }

  /**
   * GET /api/v1/evidence/stats
   * Get chain statistics for organization
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const stats = await evidenceService.getChainStats(organizationId);

      res.status(200).json({
        organizationId,
        ...stats,
      });
    } catch (error) {
      logger.error('Evidence stats endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }
}

export const evidenceController = new EvidenceController();
