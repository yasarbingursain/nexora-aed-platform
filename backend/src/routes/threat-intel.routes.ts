/**
 * Threat Intelligence API Routes
 * Real-time threat data from authenticated sources
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getAggregatedThreats,
  getNISTCVEs,
  getMITRETechniques,
  refreshThreats,
  searchThreats,
} from '../controllers/threat-intel.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/threat-intel
 * @desc    Get aggregated threat intelligence from all sources
 * @access  Private
 */
router.get('/', getAggregatedThreats);

/**
 * @route   GET /api/threat-intel/nist
 * @desc    Get CVEs from NIST National Vulnerability Database
 * @access  Private
 */
router.get('/nist', getNISTCVEs);

/**
 * @route   GET /api/threat-intel/mitre
 * @desc    Get techniques from MITRE ATT&CK Framework
 * @access  Private
 */
router.get('/mitre', getMITRETechniques);

/**
 * @route   POST /api/threat-intel/refresh
 * @desc    Trigger manual refresh of threat intelligence
 * @access  Private
 */
router.post('/refresh', refreshThreats);

/**
 * @route   GET /api/threat-intel/search
 * @desc    Search threats across all sources
 * @access  Private
 */
router.get('/search', searchThreats);

export default router;
