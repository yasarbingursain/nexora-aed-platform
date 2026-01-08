/**
 * Compliance Dashboard Routes
 * API routes for compliance status monitoring
 */

import { Router } from 'express';
import { complianceDashboardController } from '@/controllers/compliance.dashboard.controller';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

// Require authentication for compliance dashboard
router.use(requireAuth);

/**
 * GET /api/v1/compliance/status
 * Get comprehensive compliance dashboard
 * 
 * @security JWT
 * @returns {200} Compliance dashboard with all frameworks
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/status', complianceDashboardController.getStatus.bind(complianceDashboardController));

/**
 * GET /api/v1/compliance/frameworks/:framework
 * Get status for specific framework
 * 
 * @param {string} framework - Framework name (soc2, iso27001, pci_dss, gdpr, hipaa, dora)
 * 
 * @security JWT
 * @returns {200} Framework-specific compliance status
 * @returns {400} Bad request
 * @returns {404} Framework not found
 * @returns {500} Server error
 */
router.get('/frameworks/:framework', complianceDashboardController.getFrameworkStatus.bind(complianceDashboardController));

/**
 * GET /api/v1/compliance/health
 * Get compliance health check
 * 
 * @security JWT
 * @returns {200} Overall compliance health summary
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/health', complianceDashboardController.getHealthCheck.bind(complianceDashboardController));

export default router;
