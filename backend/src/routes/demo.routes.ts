/**
 * Enterprise Demo V2 - Routes
 * API routes for demo scenario management
 * 
 * @module routes/demo
 * @version 2.1.0
 */

import { Router } from 'express';
import {
  getScenarios,
  loadScenario,
  getPlaybackState,
  controlPlayback,
  getEvidenceChain,
  verifyEvidence,
  exportReport,
} from '../controllers/demo.controller';

const router = Router();

/**
 * @route   GET /api/demo/scenarios
 * @desc    Get list of available scenarios
 * @access  Public (demo mode)
 */
router.get('/scenarios', getScenarios);

/**
 * @route   POST /api/demo/scenario
 * @desc    Load a scenario
 * @access  Public (demo mode)
 */
router.post('/scenario', loadScenario);

/**
 * @route   GET /api/demo/playback
 * @desc    Get current playback state
 * @access  Public (demo mode)
 */
router.get('/playback', getPlaybackState);

/**
 * @route   POST /api/demo/control
 * @desc    Control playback (play, pause, stop, etc.)
 * @access  Public (demo mode)
 */
router.post('/control', controlPlayback);

/**
 * @route   GET /api/demo/evidence
 * @desc    Get evidence chain
 * @access  Public (demo mode)
 */
router.get('/evidence', getEvidenceChain);

/**
 * @route   GET /api/demo/evidence/verify
 * @desc    Verify evidence by hash
 * @access  Public (demo mode)
 */
router.get('/evidence/verify', verifyEvidence);

/**
 * @route   GET /api/demo/report
 * @desc    Export demo report
 * @access  Public (demo mode)
 */
router.get('/report', exportReport);

export default router;
