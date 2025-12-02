import { Request, Response } from 'express';
import { threatService } from '@/services/threats.service';
import { logger } from '@/utils/logger';

/**
 * Threat Controller
 * 
 * Handles HTTP requests for threat management
 */

export class ThreatController {
  /**
   * Helper: Get organization ID from request
   */
  private getOrganizationId(req: Request): string {
    const organizationId = req.tenant?.organizationId;
    if (!organizationId) {
      throw new Error('No organization context');
    }
    return organizationId as string;
  }

  /**
   * List threats
   * GET /api/v1/threats
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const query = req.query as any;

      const result = await threatService.list(organizationId, query);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to list threats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list threats',
      });
    }
  }

  /**
   * Get threat by ID
   * GET /api/v1/threats/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);

      const threat = await threatService.getById(id, organizationId);

      res.status(200).json(threat);
    } catch (error) {
      if (error instanceof Error && error.message === 'No organization context') {
        res.status(401).json({ error: 'No organization context' });
        return;
      }

      if (error instanceof Error && error.message === 'Threat not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Threat not found',
        });
        return;
      }

      logger.error('Failed to get threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve threat',
      });
    }
  }

  /**
   * Create threat
   * POST /api/v1/threats
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const threat = await threatService.create(organizationId, data);

      res.status(201).json(threat);
    } catch (error) {
      logger.error('Failed to create threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create threat',
      });
    }
  }

  /**
   * Update threat
   * PATCH /api/v1/threats/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const threat = await threatService.update(id, organizationId, data);

      res.status(200).json(threat);
    } catch (error) {
      if (error instanceof Error && error.message === 'Threat not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Threat not found',
        });
        return;
      }

      logger.error('Failed to update threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update threat',
      });
    }
  }

  /**
   * Delete threat
   * DELETE /api/v1/threats/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);

      const result = await threatService.delete(id, organizationId);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Threat not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Threat not found',
        });
        return;
      }

      logger.error('Failed to delete threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete threat',
      });
    }
  }

  /**
   * Investigate threat
   * POST /api/v1/threats/:id/investigate
   */
  async investigate(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const result = await threatService.investigate(id, organizationId, data);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Threat not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Threat not found',
        });
        return;
      }

      logger.error('Failed to investigate threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to start investigation',
      });
    }
  }

  /**
   * Remediate threat
   * POST /api/v1/threats/:id/remediate
   */
  async remediate(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const result = await threatService.remediate(id, organizationId, data);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Threat not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Threat not found',
        });
        return;
      }

      logger.error('Failed to remediate threat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to initiate remediation',
      });
    }
  }

  /**
   * Search threats
   * GET /api/v1/threats/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const searchTerm = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!searchTerm) {
        res.status(400).json({
          error: 'Bad request',
          message: 'Search term is required',
        });
        return;
      }

      const threats = await threatService.search(organizationId, searchTerm, limit);

      res.status(200).json(threats);
    } catch (error) {
      logger.error('Failed to search threats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search threats',
      });
    }
  }

  /**
   * Get threat statistics
   * GET /api/v1/threats/stats
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);

      const stats = await threatService.getStatistics(organizationId);

      res.status(200).json(stats);
    } catch (error) {
      logger.error('Failed to get threat statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve statistics',
      });
    }
  }
}

export const threatController = new ThreatController();
