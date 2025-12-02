import { Router } from 'express';
import { complianceController } from '@/controllers/compliance.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import {
  generateReportSchema,
  listReportsQuerySchema,
} from '@/validators/compliance.validator';

const router = Router();

router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/reports', validateQuery(listReportsQuerySchema), complianceController.listReports.bind(complianceController));
router.post('/reports', validate(generateReportSchema), complianceController.generateReport.bind(complianceController));
router.get('/reports/:id', complianceController.getReportById.bind(complianceController));
router.delete('/reports/:id', complianceController.deleteReport.bind(complianceController));
router.get('/frameworks/:framework', complianceController.getFrameworkSummary.bind(complianceController));

export default router;
