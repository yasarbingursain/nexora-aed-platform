import { Router } from 'express';
import { intelController } from '@/controllers/intel.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import {
  contributeIocSchema,
  searchIntelQuerySchema,
} from '@/validators/intel.validator';

/**
 * Threat Intel Routes
 */

const router = Router();

router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/feed', intelController.getFeed.bind(intelController));
router.post('/contribute', validate(contributeIocSchema), intelController.contribute.bind(intelController));
router.get('/search', validateQuery(searchIntelQuerySchema), intelController.search.bind(intelController));
router.get('/check/:type/:value', intelController.check.bind(intelController));
router.get('/stats', intelController.getStatistics.bind(intelController));

export default router;
