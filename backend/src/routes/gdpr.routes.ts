/**
 * GDPR Routes
 * API routes for GDPR compliance operations
 * 
 * Implements:
 * - Article 15: Right to Access
 * - Article 17: Right to Erasure
 * - Article 20: Right to Data Portability
 */

import { Router } from 'express';
import { gdprController } from '@/controllers/gdpr.controller';
import { requireAuth } from '@/middleware/auth.middleware';

const router = Router();

// Protect GDPR endpoints - authentication required
router.use(requireAuth);

/**
 * POST /api/v1/gdpr/dsar
 * Create Data Subject Access Request
 * 
 * @body {string} userId - User ID for DSAR
 * @body {string} requestType - Type: access, erasure, or portability
 * @body {string} lawfulBasis - Optional lawful basis
 * 
 * @security JWT
 * @returns {201} DSAR created
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.post('/dsar', gdprController.createDSAR.bind(gdprController));

/**
 * GET /api/v1/gdpr/dsar/:id
 * Get DSAR status
 * 
 * @param {string} id - DSAR ID
 * 
 * @security JWT
 * @returns {200} DSAR status
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/dsar/:id', gdprController.getDSARStatus.bind(gdprController));

/**
 * GET /api/v1/gdpr/access/:userId
 * Article 15: Right to Access
 * Export all personal data for a user
 * 
 * @param {string} userId - User ID
 * 
 * @security JWT
 * @returns {200} Personal data export
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/access/:userId', gdprController.handleAccessRequest.bind(gdprController));

/**
 * POST /api/v1/gdpr/erasure
 * Article 17: Right to Erasure
 * Pseudonymize user data while maintaining audit trail
 * 
 * @body {string} userId - User ID to erase
 * 
 * @security JWT
 * @returns {200} Erasure completed
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.post('/erasure', gdprController.handleErasureRequest.bind(gdprController));

/**
 * GET /api/v1/gdpr/portability/:userId
 * Article 20: Right to Data Portability
 * Export data in machine-readable format
 * 
 * @param {string} userId - User ID
 * @query {string} format - Export format: json or csv (default: json)
 * 
 * @security JWT
 * @returns {200} Data export
 * @returns {400} Bad request
 * @returns {500} Server error
 */
router.get('/portability/:userId', gdprController.handlePortabilityRequest.bind(gdprController));

export default router;
