/**
 * GDPR Controller
 * API endpoints for GDPR compliance operations
 * 
 * Implements:
 * - Article 15: Right to Access
 * - Article 17: Right to Erasure
 * - Article 20: Right to Data Portability
 */

import { Request, Response } from 'express';
import { gdprService } from '@/services/gdpr.service';
import { logger } from '@/utils/logger';

export class GDPRController {
  /**
   * POST /api/v1/gdpr/dsar
   * Create Data Subject Access Request
   */
  async createDSAR(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { userId, requestType, lawfulBasis } = req.body;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      if (!userId || !requestType) {
        res.status(400).json({ error: 'userId and requestType are required' });
        return;
      }

      if (!['access', 'erasure', 'portability'].includes(requestType)) {
        res.status(400).json({ 
          error: 'Invalid requestType. Must be: access, erasure, or portability' 
        });
        return;
      }

      const dsarRequest: any = {
        organizationId,
        userId,
        requestType,
      };
      
      if (lawfulBasis) dsarRequest.lawfulBasis = lawfulBasis;
      if (req.user?.userId) dsarRequest.createdBy = req.user.userId;
      
      const dsarId = await gdprService.createDSARJob(dsarRequest);

      res.status(201).json({
        dsarId,
        status: 'pending',
        message: 'DSAR request created successfully',
      });
    } catch (error) {
      logger.error('DSAR creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to create DSAR request' });
    }
  }

  /**
   * GET /api/v1/gdpr/dsar/:id
   * Get DSAR status
   */
  async getDSARStatus(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { id } = req.params;

      if (!organizationId || !id) {
        res.status(400).json({ error: 'Organization ID and DSAR ID required' });
        return;
      }

      const status = await gdprService.getDSARStatus(id, organizationId);

      res.status(200).json(status);
    } catch (error) {
      logger.error('Failed to get DSAR status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Failed to get DSAR status' });
    }
  }

  /**
   * GET /api/v1/gdpr/access/:userId
   * Article 15: Right to Access
   * Export all personal data for a user
   */
  async handleAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { userId } = req.params;

      if (!organizationId || !userId) {
        res.status(400).json({ error: 'Organization ID and User ID required' });
        return;
      }

      const data = await gdprService.handleAccessRequest(organizationId, userId);

      res.status(200).json({
        message: 'Personal data export completed',
        data,
      });
    } catch (error) {
      logger.error('Access request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Access request failed' });
    }
  }

  /**
   * POST /api/v1/gdpr/erasure
   * Article 17: Right to Erasure
   * Pseudonymize user data while maintaining audit trail
   */
  async handleErasureRequest(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { userId } = req.body;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const result = await gdprService.handleErasureRequest(organizationId, userId);

      res.status(200).json({
        message: 'Erasure request completed successfully',
        success: result.success,
        pseudonymizedRecords: result.pseudonymizedRecords,
      });
    } catch (error) {
      logger.error('Erasure request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Erasure request failed' });
    }
  }

  /**
   * GET /api/v1/gdpr/portability/:userId
   * Article 20: Right to Data Portability
   * Export data in machine-readable format
   */
  async handlePortabilityRequest(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.tenant?.organizationId;
      const { userId } = req.params;
      const format = (req.query.format as 'json' | 'csv') || 'json';

      if (!organizationId || !userId) {
        res.status(400).json({ error: 'Organization ID and User ID required' });
        return;
      }

      if (!['json', 'csv'].includes(format)) {
        res.status(400).json({ error: 'Invalid format. Must be: json or csv' });
        return;
      }

      const data = await gdprService.handlePortabilityRequest(
        organizationId,
        userId,
        format
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="data-export-${userId}.csv"`);
        res.status(200).send(data);
      } else {
        res.status(200).json({
          message: 'Data portability export completed',
          data,
        });
      }
    } catch (error) {
      logger.error('Portability request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Portability request failed' });
    }
  }
}

export const gdprController = new GDPRController();
