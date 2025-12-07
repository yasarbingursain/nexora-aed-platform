import { Router } from 'express';
import { ExportController } from '@/controllers/export.controller';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';

const router = Router();

// All export routes require authentication
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * @route   GET /api/v1/export/threats
 * @desc    Export threats data
 * @access  Private
 * @query   format: json|csv, severity, status, category, dateFrom, dateTo
 */
router.get('/threats', ExportController.exportThreats);

/**
 * @route   GET /api/v1/export/identities
 * @desc    Export identities data
 * @access  Private
 * @query   format: json|csv, type, status, riskScoreMin, riskScoreMax
 */
router.get('/identities', ExportController.exportIdentities);

/**
 * @route   GET /api/v1/export/audit
 * @desc    Export audit logs
 * @access  Private (Admin only)
 * @query   format: json|csv, event, entityType, severity, dateFrom, dateTo
 */
router.get('/audit', requireRole(['admin', 'security_analyst']), ExportController.exportAuditLogs);

/**
 * @route   GET /api/v1/export/compliance-report
 * @desc    Generate compliance report
 * @access  Private (Admin only)
 */
router.get('/compliance-report', requireRole(['admin']), ExportController.complianceReport);

export default router;
