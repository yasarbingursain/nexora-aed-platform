/**
 * Evidence Routes
 * API routes for immutable audit trail and chain verification
 */

import { Router } from 'express';
import { evidenceController } from '@/controllers/evidence.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';

const router = Router();

/**
 * POST /api/v1/evidence/verify
 * Verify hash-chain integrity
 * 
 * @security JWT
 * @returns {200} Chain verification result
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.use(authenticate);
router.use(tenantMiddleware);

router.post('/verify', evidenceController.verifyChain.bind(evidenceController));

/**
 * GET /api/v1/evidence
 * Query evidence log
 * 
 * @query {string} action - Filter by action
 * @query {string} resourceType - Filter by resource type
 * @query {string} resourceId - Filter by resource ID
 * @query {string} dateFrom - Filter by start date (ISO 8601)
 * @query {string} dateTo - Filter by end date (ISO 8601)
 * @query {number} limit - Maximum records to return (default: 100)
 * 
 * @security JWT
 * @returns {200} Evidence records
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/', evidenceController.queryEvidence.bind(evidenceController));

/**
 * GET /api/v1/evidence/stats
 * Get chain statistics
 * 
 * @security JWT
 * @returns {200} Chain statistics
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/stats', evidenceController.getStats.bind(evidenceController));

export default router;
