import { Router } from 'express';
import { identityController } from '@/controllers/identities.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import {
  createIdentitySchema,
  updateIdentitySchema,
  listIdentitiesQuerySchema,
  rotateCredentialsSchema,
  quarantineIdentitySchema,
} from '@/validators/identities.validator';

/**
 * Identity Routes
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
 * GET /api/v1/identities/stats
 * Get identity statistics
 */
router.get(
  '/stats',
  identityController.getStatistics.bind(identityController)
);

/**
 * GET /api/v1/identities/search
 * Search identities
 */
router.get(
  '/search',
  identityController.search.bind(identityController)
);

/**
 * GET /api/v1/identities
 * List identities (paginated, filterable)
 */
router.get(
  '/',
  validateQuery(listIdentitiesQuerySchema),
  identityController.list.bind(identityController)
);

/**
 * POST /api/v1/identities
 * Create new identity
 */
router.post(
  '/',
  validate(createIdentitySchema),
  identityController.create.bind(identityController)
);

/**
 * GET /api/v1/identities/:id
 * Get identity by ID
 */
router.get(
  '/:id',
  identityController.getById.bind(identityController)
);

/**
 * PUT /api/v1/identities/:id
 * Update identity
 */
router.put(
  '/:id',
  validate(updateIdentitySchema),
  identityController.update.bind(identityController)
);

/**
 * DELETE /api/v1/identities/:id
 * Delete identity
 */
router.delete(
  '/:id',
  identityController.delete.bind(identityController)
);

/**
 * POST /api/v1/identities/:id/rotate
 * Rotate credentials
 */
router.post(
  '/:id/rotate',
  validate(rotateCredentialsSchema),
  identityController.rotateCredentials.bind(identityController)
);

/**
 * POST /api/v1/identities/:id/quarantine
 * Quarantine identity
 */
router.post(
  '/:id/quarantine',
  validate(quarantineIdentitySchema),
  identityController.quarantine.bind(identityController)
);

/**
 * GET /api/v1/identities/:id/activities
 * Get identity activities
 */
router.get(
  '/:id/activities',
  identityController.getActivities.bind(identityController)
);

export default router;
