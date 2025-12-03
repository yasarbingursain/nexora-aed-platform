import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateParams, validateQuery } from '@/middleware/validation.middleware';
import { logger } from '@/utils/logger';
import { malgenxProxyService } from '@/services/malgenx-proxy.service';
import {
  submitSampleSchema,
  sampleIdParamsSchema,
  iocSearchSchema,
  threatsFeedQuerySchema,
} from '@/validators/malgenx.validator';

/**
 * MalGenX Malware Analysis & Threat Intel API Routes
 *
 * This module exposes the enterprise MalGenX API surface without
 * implementing the analysis engine here. All handlers are authenticated,
 * tenant-scoped and strictly validated, and currently return 501 to
 * avoid any fake or insecure behavior. The actual sandbox, ML models and
 * ETL pipelines will live in a separate hardened service.
 */

const router = Router();

// Public route for threats feed (demo purposes) - Proxies to MalGenX service
router.get(
  '/threats/feed/public',
  validateQuery(threatsFeedQuerySchema),
  async (req, res) => {
    try {
      const feedParams: any = { organizationId: 'public' };
      if (req.query.sinceMinutes) feedParams.sinceMinutes = Number(req.query.sinceMinutes);
      if (req.query.severity) feedParams.severity = req.query.severity;
      if (req.query.limit) feedParams.limit = Number(req.query.limit);

      const result = await malgenxProxyService.getThreatsFeed(feedParams);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('MalGenX public threats feed failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve threats feed',
      });
    }
  }
);

router.use(requireAuth);
router.use(tenantMiddleware);

router.post(
  '/samples/submit',
  validate(submitSampleSchema),
  async (req, res) => {
    try {
      const organizationId = (req as any).tenantId || 'default';
      const userId = (req as any).user?.id || 'anonymous';

      logger.info('MalGenX sample submission received', {
        organizationId,
        userId,
        type: req.body.type,
      });

      const result = await malgenxProxyService.submitSample({
        ...req.body,
        organizationId,
        userId,
      });

      return res.status(202).json(result);
    } catch (error) {
      logger.error('MalGenX sample submission failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to submit sample for analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

router.get(
  '/samples/:id/status',
  validateParams(sampleIdParamsSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const organizationId = (req as any).tenantId || 'default';

      logger.info('MalGenX status check requested', {
        organizationId,
        sampleId: id,
      });

      const result = await malgenxProxyService.getSampleStatus(id, organizationId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('MalGenX status check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sampleId: req.params.id,
      });

      if ((error as any).response?.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Sample not found',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve sample status',
      });
    }
  }
);

router.get(
  '/samples/:id/report',
  validateParams(sampleIdParamsSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const organizationId = (req as any).tenantId || 'default';

      logger.info('MalGenX report requested', {
        organizationId,
        sampleId: id,
      });

      const result = await malgenxProxyService.getSampleReport(id, organizationId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('MalGenX report retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sampleId: req.params.id,
      });

      if ((error as any).response?.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Sample not found',
        });
      }

      if ((error as any).response?.status === 501) {
        return res.status(501).json({
          success: false,
          error: 'Analysis report not yet available',
          message: 'Sample is still being analyzed or analysis has not started',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis report',
      });
    }
  }
);

router.post(
  '/iocs/search',
  validate(iocSearchSchema),
  async (req, res) => {
    try {
      const organizationId = (req as any).tenantId || 'default';

      logger.info('MalGenX IOC search requested', {
        organizationId,
        query: req.body.query,
      });

      const result = await malgenxProxyService.searchIOCs({
        ...req.body,
        organizationId,
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('MalGenX IOC search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to search IOCs',
      });
    }
  }
);

router.get(
  '/threats/feed',
  validateQuery(threatsFeedQuerySchema),
  async (req, res) => {
    try {
      const organizationId = (req as any).tenantId || 'default';

      logger.info('MalGenX threats feed requested', {
        organizationId,
      });

      const feedParams: any = { organizationId };
      if (req.query.sinceMinutes) feedParams.sinceMinutes = Number(req.query.sinceMinutes);
      if (req.query.severity) feedParams.severity = req.query.severity;
      if (req.query.limit) feedParams.limit = Number(req.query.limit);

      const result = await malgenxProxyService.getThreatsFeed(feedParams);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('MalGenX threats feed failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve threats feed',
      });
    }
  }
);

export default router;
