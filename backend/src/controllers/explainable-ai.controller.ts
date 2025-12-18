/**
 * Explainable AI Controller
 * GDPR Article 22 & EU AI Act Compliant API Endpoints
 */

import { Request, Response } from 'express';
import { explainableAIService } from '@/services/explainable-ai.service';
import { logger } from '@/utils/logger';

export class ExplainableAIController {
  /**
   * Generate explanation for a prediction
   * POST /api/v1/explain
   */
  async explainPrediction(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { identity_id, prediction_id, methods, include_human_readable } = req.body;

      if (!identity_id) {
        res.status(400).json({ error: 'identity_id is required' });
        return;
      }

      const explanation = await explainableAIService.explainPrediction({
        identity_id,
        organization_id: organizationId,
        prediction_id,
        methods,
        include_human_readable,
      });

      res.json({
        success: true,
        data: explanation,
      });
    } catch (error) {
      logger.error('Failed to generate explanation', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate explanation',
      });
    }
  }

  /**
   * Get explanation history for an identity
   * GET /api/v1/explain/history/:identityId
   */
  async getExplanationHistory(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { identityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await explainableAIService.getExplanationHistory(
        identityId,
        organizationId,
        limit
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get explanation history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get explanation history',
      });
    }
  }

  /**
   * Request human review (GDPR Article 22)
   * POST /api/v1/explain/review
   */
  async requestHumanReview(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.userId;
      
      if (!organizationId || !userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { prediction_id, reason } = req.body;

      if (!prediction_id || !reason) {
        res.status(400).json({ error: 'prediction_id and reason are required' });
        return;
      }

      const result = await explainableAIService.requestHumanReview(
        prediction_id,
        organizationId,
        userId,
        reason
      );

      res.json({
        success: true,
        data: result,
        message: 'Human review request submitted. You will be contacted within 72 hours per GDPR Article 22.',
      });
    } catch (error) {
      logger.error('Failed to request human review', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to submit human review request',
      });
    }
  }

  /**
   * Health check
   * GET /api/v1/explain/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await explainableAIService.healthCheck();
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }
}

export const explainableAIController = new ExplainableAIController();
