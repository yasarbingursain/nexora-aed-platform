import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/threat-feed/statistics
 * Real-time threat intelligence statistics
 */
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    // Last 24 hours statistics
    const stats = await prisma.$queryRaw`
      SELECT 
        source,
        ioc_type,
        SUM(count) as total_count,
        AVG(ingestion_duration_ms) as avg_duration_ms,
        MAX(created_at) as last_ingestion
      FROM threat_intel_stats
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY source, ioc_type
      ORDER BY total_count DESC
    `;

    // Total threats today
    const totalToday = await prisma.malwareIoc.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    res.json({
      success: true,
      data: {
        sources: stats,
        total_today: totalToday,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch statistics', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/threat-feed/recent
 * Recent threat intelligence (last 100 threats)
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const recentThreats = await prisma.malwareIoc.findMany({
      where: {
        organizationId: 'global',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        iocType: true,
        iocValue: true,
        threatScore: true,
        isKnownMalicious: true,
        threatIntelSources: true,
        tags: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: recentThreats,
      count: recentThreats.length,
    });
  } catch (error) {
    logger.error('Failed to fetch recent threats', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/threat-feed/health
 * Ingestion health status
 */
router.get('/health', requireAuth, async (req, res) => {
  try {
    const failures = await prisma.$queryRaw`
      SELECT source, COUNT(*) as failure_count
      FROM ingestion_failures
      WHERE resolved_at IS NULL
      GROUP BY source
    `;

    const lastIngestion = await prisma.$queryRaw`
      SELECT source, MAX(created_at) as last_run
      FROM threat_intel_stats
      GROUP BY source
    `;

    res.json({
      success: true,
      data: {
        failures,
        last_ingestion: lastIngestion,
        status: (failures as any[]).length === 0 ? 'healthy' : 'degraded',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch health', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
