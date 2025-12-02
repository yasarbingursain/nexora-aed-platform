import { Request, Response } from 'express';
import { identityService } from '@/services/identities.service';
import { logger } from '@/utils/logger';

/**
 * Identity Controller
 * 
 * Handles HTTP requests for identity management
 * - Validates tenant context
 * - Calls service layer
 * - Returns proper HTTP responses
 */

export class IdentityController {
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
   * List identities
   * GET /api/v1/identities
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const query = req.query as any;

      const result = await identityService.list(organizationId, query);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to list identities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list identities',
      });
    }
  }

  /**
   * Get identity by ID
   * GET /api/v1/identities/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);

      const identity = await identityService.getById(id, organizationId);

      res.status(200).json(identity);
    } catch (error) {
      if (error instanceof Error && error.message === 'No organization context') {
        res.status(401).json({ error: 'No organization context' });
        return;
      }

      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to get identity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve identity',
      });
    }
  }

  /**
   * Create identity
   * POST /api/v1/identities
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const identity = await identityService.create(organizationId, data);

      res.status(201).json(identity);
    } catch (error) {
      logger.error('Failed to create identity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create identity',
      });
    }
  }

  /**
   * Update identity
   * PUT /api/v1/identities/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const identity = await identityService.update(id, organizationId, data);

      res.status(200).json(identity);
    } catch (error) {
      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to update identity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update identity',
      });
    }
  }

  /**
   * Delete identity
   * DELETE /api/v1/identities/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);

      const result = await identityService.delete(id, organizationId);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to delete identity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete identity',
      });
    }
  }

  /**
   * Rotate credentials
   * POST /api/v1/identities/:id/rotate
   */
  async rotateCredentials(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const result = await identityService.rotateCredentials(id, organizationId, data);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to rotate credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to rotate credentials',
      });
    }
  }

  /**
   * Quarantine identity
   * POST /api/v1/identities/:id/quarantine
   */
  async quarantine(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const data = req.body;

      const result = await identityService.quarantine(id, organizationId, data);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to quarantine identity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to quarantine identity',
      });
    }
  }

  /**
   * Get identity activities
   * GET /api/v1/identities/:id/activities
   */
  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const activities = await identityService.getActivities(id, organizationId, limit);

      res.status(200).json(activities);
    } catch (error) {
      if (error instanceof Error && error.message === 'Identity not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'Identity not found',
        });
        return;
      }

      logger.error('Failed to get identity activities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve activities',
      });
    }
  }

  /**
   * Search identities
   * GET /api/v1/identities/search
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

      const identities = await identityService.search(organizationId, searchTerm, limit);

      res.status(200).json(identities);
    } catch (error) {
      logger.error('Failed to search identities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.tenant?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search identities',
      });
    }
  }

  /**
   * Get identity statistics
   * GET /api/v1/identities/stats
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);

      const stats = await identityService.getStatistics(organizationId);

      res.status(200).json(stats);
    } catch (error) {
      logger.error('Failed to get identity statistics', {
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

export const identityController = new IdentityController();
