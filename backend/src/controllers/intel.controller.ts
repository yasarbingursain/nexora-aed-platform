import { Request, Response } from 'express';
import { intelService } from '@/services/intel.service';
import { logger } from '@/utils/logger';

/**
 * Threat Intel Controller
 * 
 * Handles HTTP requests for threat intelligence
 */

export class IntelController {
  private getOrganizationId(req: Request): string {
    const organizationId = req.tenant?.organizationId;
    if (!organizationId) throw new Error('No organization context');
    return organizationId as string;
  }

  /**
   * Get threat intelligence feed
   * GET /api/v1/intel/feed
   */
  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const feed = await intelService.getFeed(organizationId, limit);

      res.status(200).json(feed);
    } catch (error) {
      logger.error('Failed to get intel feed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Contribute IOC
   * POST /api/v1/intel/contribute
   */
  async contribute(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const intel = await intelService.contribute(organizationId, req.body);

      res.status(201).json(intel);
    } catch (error) {
      logger.error('Failed to contribute IOC', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Search threat intelligence
   * GET /api/v1/intel/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const results = await intelService.search(organizationId, req.query as any);

      res.status(200).json(results);
    } catch (error) {
      logger.error('Failed to search intel', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Check IOC
   * GET /api/v1/intel/check/:type/:value
   */
  async check(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const type = req.params.type as string;
      const value = req.params.value as string;

      const result = await intelService.check(organizationId, type, value);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to check IOC', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get statistics
   * GET /api/v1/intel/stats
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const stats = await intelService.getStatistics(organizationId);

      res.status(200).json(stats);
    } catch (error) {
      logger.error('Failed to get intel statistics', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const intelController = new IntelController();
