/**
 * NHITI (Non-Human Identity Threat Intelligence) API Routes
 * PRODUCTION - Real threat intelligence sharing network
 * Standards: STIX 2.1, TAXII 2.1, GDPR Article 25
 */

import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { nhitiController } from '@/controllers/nhiti.controller';

const router = Router();

/**
 * @route POST /api/v1/nhiti/share
 * @desc Share anonymized threat intelligence with NHITI network
 * @access Private
 */
router.post('/share', requireAuth, nhitiController.shareThreat.bind(nhitiController));

/**
 * @route GET /api/v1/nhiti/feed
 * @desc Get aggregated threat intelligence from NHITI network
 * @access Private
 */
router.get('/feed', requireAuth, nhitiController.getThreatFeed.bind(nhitiController));

/**
 * @route GET /api/v1/nhiti/stats
 * @desc Get NHITI network statistics
 * @access Private
 */
router.get('/stats', requireAuth, nhitiController.getNetworkStats.bind(nhitiController));

/**
 * @route POST /api/v1/nhiti/query
 * @desc Query NHITI network for specific IOC
 * @access Private
 */
router.post('/query', requireAuth, nhitiController.queryIOC.bind(nhitiController));

export default router;
