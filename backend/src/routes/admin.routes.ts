import { Router } from 'express';
import { adminController } from '@/controllers/admin.controller';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

// Organization Management
router.get('/organizations', adminController.getAllOrganizations.bind(adminController));
router.get('/organizations/:id', adminController.getOrganization.bind(adminController));
router.post('/organizations', adminController.createOrganization.bind(adminController));
router.patch('/organizations/:id', adminController.updateOrganization.bind(adminController));
router.delete('/organizations/:id', adminController.deleteOrganization.bind(adminController));
router.post('/organizations/:id/suspend', adminController.suspendOrganization.bind(adminController));
router.post('/organizations/:id/reactivate', adminController.reactivateOrganization.bind(adminController));

// System Metrics
router.get('/metrics', adminController.getSystemMetrics.bind(adminController));
router.get('/system-health', adminController.getSystemHealth.bind(adminController));

// Billing Management
router.get('/billing', adminController.getBillingOverview.bind(adminController));
router.get('/billing/organizations/:id', adminController.getOrganizationBilling.bind(adminController));

// User Management
router.get('/users', adminController.getAllUsers.bind(adminController));
router.post('/users/:id/suspend', adminController.suspendUser.bind(adminController));
router.post('/users/:id/reactivate', adminController.reactivateUser.bind(adminController));

// Security Events
router.get('/security-events', adminController.getSecurityEvents.bind(adminController));
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

export default router;
