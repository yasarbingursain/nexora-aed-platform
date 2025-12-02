import { Router } from 'express';
import { threatController } from '@/controllers/threats.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import {
  createThreatSchema,
  updateThreatSchema,
  listThreatsQuerySchema,
  investigateThreatSchema,
  remediateThreatSchema,
} from '@/validators/threats.validator';

/**
 * Threat Routes
 * 
 * All routes require:
 * 1. Authentication (requireAuth)
 * 2. Tenant context (tenantMiddleware)
 * 3. Input validation (validate/validateQuery)
 */

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * GET /api/v1/threats/stats
 * Get threat statistics
 */
router.get(
  '/stats',
  threatController.getStatistics.bind(threatController)
);

/**
 * GET /api/v1/threats/search
 * Search threats
 */
router.get(
  '/search',
  threatController.search.bind(threatController)
);

/**
 * GET /api/v1/threats
 * List threats (paginated, filterable)
 */
router.get(
  '/',
  validateQuery(listThreatsQuerySchema),
  threatController.list.bind(threatController)
);

/**
 * POST /api/v1/threats
 * Create new threat
 */
router.post(
  '/',
  validate(createThreatSchema),
  threatController.create.bind(threatController)
);

/**
 * GET /api/v1/threats/:id
 * Get threat by ID
 */
router.get(
  '/:id',
  threatController.getById.bind(threatController)
);

/**
 * PATCH /api/v1/threats/:id
 * Update threat
 */
router.patch(
  '/:id',
  validate(updateThreatSchema),
  threatController.update.bind(threatController)
);

/**
 * DELETE /api/v1/threats/:id
 * Delete threat
 */
router.delete(
  '/:id',
  threatController.delete.bind(threatController)
);

/**
 * POST /api/v1/threats/:id/investigate
 * Start threat investigation
 */
router.post(
  '/:id/investigate',
  validate(investigateThreatSchema),
  threatController.investigate.bind(threatController)
);

/**
 * POST /api/v1/threats/:id/remediate
 * Remediate threat
 */
router.post(
  '/:id/remediate',
  validate(remediateThreatSchema),
  threatController.remediate.bind(threatController)
);

export default router;
