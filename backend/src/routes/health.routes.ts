/**
 * Health Check Routes
 * System health monitoring endpoints
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { kafkaHealthService } from '@/services/kafka-health.service';
import { emailService } from '@/services/email.service';
import { siemService } from '@/services/integrations/siem.service';
import { ticketingService } from '@/services/integrations/ticketing.service';
import { prisma } from '@/config/database';
import { redisRateLimit } from '@/config/redis';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Overall system health check
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkKafka(),
      checkEmail(),
      checkSIEM(),
      checkTicketing(),
    ]);

    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: checks[0].status === 'fulfilled' ? checks[0].value : { healthy: false, error: (checks[0] as PromiseRejectedResult).reason },
        redis: checks[1].status === 'fulfilled' ? checks[1].value : { healthy: false, error: (checks[1] as PromiseRejectedResult).reason },
        kafka: checks[2].status === 'fulfilled' ? checks[2].value : { healthy: false, error: (checks[2] as PromiseRejectedResult).reason },
        email: checks[3].status === 'fulfilled' ? checks[3].value : { healthy: false, error: (checks[3] as PromiseRejectedResult).reason },
        siem: checks[4].status === 'fulfilled' ? checks[4].value : { healthy: false, error: (checks[4] as PromiseRejectedResult).reason },
        ticketing: checks[5].status === 'fulfilled' ? checks[5].value : { healthy: false, error: (checks[5] as PromiseRejectedResult).reason },
      },
    };

    // Determine overall status
    const unhealthyChecks = Object.values(results.checks).filter((check: any) => !check.healthy);
    if (unhealthyChecks.length > 0) {
      results.status = 'degraded';
    }

    const statusCode = results.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(results);
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Database health check
 * GET /health/database
 */
router.get('/database', async (req, res) => {
  try {
    const result = await checkDatabase();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'Database check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Redis health check
 * GET /health/redis
 */
router.get('/redis', async (req, res) => {
  try {
    const result = await checkRedis();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'Redis check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Kafka health check
 * GET /health/kafka
 */
router.get('/kafka', async (req, res) => {
  try {
    const result = await checkKafka();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'Kafka check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Email service health check
 * GET /health/email
 */
router.get('/email', async (req, res) => {
  try {
    const result = await checkEmail();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'Email check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * SIEM integration health check
 * GET /health/siem
 */
router.get('/siem', async (req, res) => {
  try {
    const result = await checkSIEM();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'SIEM check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Ticketing integration health check
 * GET /health/ticketing
 */
router.get('/ticketing', async (req, res) => {
  try {
    const result = await checkTicketing();
    const statusCode = result.healthy ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      message: 'Ticketing check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detailed Kafka consumer health
 * GET /health/kafka/detailed
 */
router.get('/kafka/detailed', async (req, res) => {
  try {
    const status = await kafkaHealthService.getHealthStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get Kafka health status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkDatabase(): Promise<{ healthy: boolean; message: string; latency?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { healthy: true, message: 'Database connected', latency };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkRedis(): Promise<{ healthy: boolean; message: string; latency?: number }> {
  const start = Date.now();
  try {
    await redisRateLimit.ping();
    const latency = Date.now() - start;
    return { healthy: true, message: 'Redis connected', latency };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

async function checkKafka(): Promise<{ healthy: boolean; message: string; details?: any }> {
  try {
    const result = await kafkaHealthService.isHealthy();
    return {
      healthy: result.healthy,
      message: result.message,
      details: result.healthy ? undefined : { configured: !!process.env.KAFKA_BROKERS },
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Kafka check failed',
    };
  }
}

async function checkEmail(): Promise<{ healthy: boolean; message: string; provider?: string }> {
  try {
    const configured = emailService.isConfigured();
    return {
      healthy: configured,
      message: configured ? 'Email service configured' : 'Email service not configured',
      provider: configured ? process.env.EMAIL_PROVIDER : undefined,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Email check failed',
    };
  }
}

async function checkSIEM(): Promise<{ healthy: boolean; message: string; configured?: string[] }> {
  try {
    const configured = siemService.getConfiguredSiems();
    const isConfigured = configured.length > 0;
    return {
      healthy: isConfigured,
      message: isConfigured ? `SIEM configured: ${configured.join(', ')}` : 'No SIEM configured',
      configured: isConfigured ? configured : undefined,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'SIEM check failed',
    };
  }
}

async function checkTicketing(): Promise<{ healthy: boolean; message: string; configured?: string[] }> {
  try {
    const configured: string[] = [];
    
    if (ticketingService.getServiceNow().isConfigured()) {
      configured.push('ServiceNow');
    }
    if (ticketingService.getJira().isConfigured()) {
      configured.push('Jira');
    }
    if (ticketingService.getSlack().isConfigured()) {
      configured.push('Slack');
    }

    const isConfigured = configured.length > 0;
    return {
      healthy: isConfigured,
      message: isConfigured ? `Ticketing configured: ${configured.join(', ')}` : 'No ticketing configured',
      configured: isConfigured ? configured : undefined,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Ticketing check failed',
    };
  }
}

export default router;
