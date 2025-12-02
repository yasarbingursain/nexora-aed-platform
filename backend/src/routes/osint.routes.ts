/**
 * OSINT Threat Intelligence API Routes
 * Nexora AED Platform - Enterprise Grade
 */

import { Router } from 'express';
import { logger } from '@/utils/logger';
import { getLatestThreatEvents, getThreatEventsForMap, getThreatStatistics } from '@/repositories/threat-events.repository';
import { buildBlocklist, getBlocklistStats } from '@/services/osint/soar.service';

const router = Router();

/**
 * GET /api/v1/osint/threats/latest
 * Get latest threat events
 */
router.get('/threats/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const organizationId = req.query.organizationId as string | undefined;

    const threats = await getLatestThreatEvents(limit, organizationId);

    res.json({
      success: true,
      data: threats,
      count: threats.length,
    });
  } catch (error) {
    logger.error('Failed to fetch latest threats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat events',
    });
  }
});

/**
 * GET /api/v1/osint/threats/map
 * Get threat events with geolocation for map visualization
 */
router.get('/threats/map', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
    const organizationId = req.query.organizationId as string | undefined;

    const threats = await getThreatEventsForMap(limit, organizationId);

    res.json({
      success: true,
      data: threats,
      count: threats.length,
    });
  } catch (error) {
    logger.error('Failed to fetch map threats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat events for map',
    });
  }
});

/**
 * GET /api/v1/osint/threats/stats
 * Get threat statistics
 */
router.get('/threats/stats', async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;

    const stats = await getThreatStatistics(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch threat stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat statistics',
    });
  }
});

/**
 * GET /api/v1/osint/soar/blocklist
 * Generate SOAR blocklist for WAF/Gateway integration
 */
router.get('/soar/blocklist', async (req, res) => {
  try {
    const minRiskScore = parseInt(req.query.minRisk as string) || 60;
    const maxItems = Math.min(parseInt(req.query.maxItems as string) || 500, 5000);
    const organizationId = req.query.organizationId as string | undefined;

    const blocklist = await buildBlocklist(minRiskScore, maxItems, organizationId);

    res.json(blocklist);
  } catch (error) {
    logger.error('Failed to generate blocklist', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate blocklist',
    });
  }
});

/**
 * GET /api/v1/osint/soar/stats
 * Get blocklist statistics
 */
router.get('/soar/stats', async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;

    const stats = await getBlocklistStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch blocklist stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blocklist statistics',
    });
  }
});

/**
 * POST /osint/ingest/trigger
 * Manually trigger OSINT ingestion (for testing)
 */
router.post('/ingest/trigger', async (req, res) => {
  try {
    const { createOrchestratorFromEnv } = await import('@/services/osint/orchestrator.service');
    const orchestrator = createOrchestratorFromEnv();
    
    logger.info('Manual OSINT ingestion triggered');
    await orchestrator.runOnce();
    
    res.json({
      success: true,
      message: 'OSINT ingestion completed successfully',
    });
  } catch (error) {
    logger.error('Manual ingestion failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
