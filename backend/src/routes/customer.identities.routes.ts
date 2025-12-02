import { Router } from 'express';
import { customerIdentityController } from '@/controllers/customer.identities.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validateQuery } from '@/middleware/validation.middleware';

/**
 * Customer Identity Routes
 * Frontend-facing identity management endpoints
 * 
 * All routes require:
 * 1. Authentication (requireAuth)
 * 2. Tenant context (tenantMiddleware)
 */

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * GET /api/v1/customer/identities
 * List identities for customer dashboard
 * Query params: page, limit, type, search, riskLevel
 */
router.get(
  '/',
  customerIdentityController.list.bind(customerIdentityController)
);

/**
 * GET /api/v1/customer/identities/:id
 * Get identity details with baseline behavior and anomalies
 */
router.get(
  '/:id',
  customerIdentityController.getById.bind(customerIdentityController)
);

/**
 * POST /api/v1/customer/identities/:id/rotate
 * Rotate identity credentials
 */
router.post(
  '/:id/rotate',
  customerIdentityController.rotate.bind(customerIdentityController)
);

/**
 * POST /api/v1/customer/identities/:id/suspend
 * Suspend identity
 */
router.post(
  '/:id/suspend',
  customerIdentityController.suspend.bind(customerIdentityController)
);

/**
 * POST /api/v1/customer/identities/:id/reactivate
 * Reactivate suspended identity
 */
router.post(
  '/:id/reactivate',
  customerIdentityController.reactivate.bind(customerIdentityController)
);

export default router;
