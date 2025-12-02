import { Router } from 'express';
import { customerThreatController } from '@/controllers/customer.threats.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validateQuery } from '@/middleware/validation.middleware';
import { listThreatsQuerySchema } from '@/validators/threats.validator';

/**
 * Customer Threat Routes
 * Frontend-facing threat management endpoints
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
 * GET /api/v1/customer/threats
 * List threats for customer dashboard
 * Query params: page, limit, severity, status, search
 */
router.get(
  '/',
  validateQuery(listThreatsQuerySchema),
  customerThreatController.list.bind(customerThreatController)
);

/**
 * GET /api/v1/customer/threats/:id
 * Get threat details
 */
router.get(
  '/:id',
  customerThreatController.getById.bind(customerThreatController)
);

/**
 * POST /api/v1/customer/threats/:id/quarantine
 * Quarantine a threat entity
 */
router.post(
  '/:id/quarantine',
  customerThreatController.quarantine.bind(customerThreatController)
);

/**
 * POST /api/v1/customer/threats/:id/rotate
 * Rotate credentials for threat entity
 */
router.post(
  '/:id/rotate',
  customerThreatController.rotateCredentials.bind(customerThreatController)
);

/**
 * POST /api/v1/customer/threats/:id/dismiss
 * Dismiss/mark as false positive
 */
router.post(
  '/:id/dismiss',
  customerThreatController.dismiss.bind(customerThreatController)
);

export default router;
