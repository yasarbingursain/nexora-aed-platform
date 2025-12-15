import { Router } from 'express';
import { customerAnalyticsController } from '@/controllers/customer.analytics.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validateQuery } from '@/middleware/validation.middleware';

/**
 * Customer Analytics Routes
 * Frontend-facing analytics and reporting endpoints
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
 * GET /api/v1/customer/analytics
 * Get analytics dashboard data
 * Query params: range (7d, 30d, 90d)
 */
router.get(
  '/',
  customerAnalyticsController.getDashboard.bind(customerAnalyticsController)
);

/**
 * GET /api/v1/customer/analytics/export
 * Export analytics report
 * Query params: format (pdf, csv, json)
 */
router.get(
  '/export',
  customerAnalyticsController.exportReport.bind(customerAnalyticsController)
);

/**
 * GET /api/v1/customer/analytics/roi
 * Get ROI calculator data
 */
router.get(
  '/roi',
  customerAnalyticsController.getROI.bind(customerAnalyticsController)
);

/**
 * GET /api/v1/customer/analytics/trends
 * Get threat trends over time
 */
router.get(
  '/trends',
  customerAnalyticsController.getTrends.bind(customerAnalyticsController)
);

/**
 * GET /api/v1/customer/analytics/ml-anomalies
 * Get recent ML anomalies derived from observations
 */
router.get(
  '/ml-anomalies',
  customerAnalyticsController.getMLAnomalies.bind(customerAnalyticsController)
);

export default router;
