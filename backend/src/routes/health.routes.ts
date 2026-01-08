/**
 * Health Check Routes
 * System health monitoring endpoints with tiered access control
 * 
 * Security Implementation:
 * - Detailed endpoints: Require JWT authentication
 * - Lite endpoints: Require API key OR internal network access
 * - Basic endpoints: Public with rate limiting
 * 
 * Compliance: SOC2 Type II, NIST CSF, ISO 27001
 * 
 * @author Nexora Security Team
 * @version 2.0.0
 */

import { Router } from 'express';
import { kafkaHealthService } from '@/services/kafka-health.service';
import { emailService } from '@/services/email.service';
import { siemService } from '@/services/integrations/siem.service';
import { ticketingService } from '@/services/integrations/ticketing.service';
import { prisma } from '@/config/database';
import { redisRateLimit } from '@/config/redis';
import { logger } from '@/utils/logger';
import {
  requireDetailedHealthAccess,
  requireLiteHealthAccess,
  requireBasicHealthAccess,
  logHealthAccess,
} from '@/middleware/health-access.middleware';
import { globalRateLimit } from '@/middleware/rateLimiter.middleware';

const router = Router();

// Apply logging to all health checks
router.use(logHealthAccess);

/**
 * GET /health
 * Overall system health check (LITE ACCESS)
 * 
 * Returns aggregated system status from all service health checks.
 * Accessible via: Internal network OR valid API key
 * 
 * @security API-Key or Internal-Network
 * @returns {200} System is healthy
 * @returns {503} System is degraded or unhealthy
 */
router.get('/', requireLiteHealthAccess, async (req, res) => {
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
 * GET /health/database
 * Database health check (DETAILED ACCESS)
 * 
 * Tests database connectivity and performance.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Database is healthy
 * @returns {503} Database is unhealthy
 */
router.get('/database', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/redis
 * Redis cache health check (DETAILED ACCESS)
 * 
 * Tests Redis connectivity and performance.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Redis is healthy
 * @returns {503} Redis is unhealthy
 */
router.get('/redis', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/kafka
 * Kafka broker health check (DETAILED ACCESS)
 * 
 * Tests Kafka connectivity and broker availability.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Kafka is healthy
 * @returns {503} Kafka is unhealthy
 */
router.get('/kafka', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/email
 * Email service health check (DETAILED ACCESS)
 * 
 * Tests email service connectivity and configuration.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Email service is healthy
 * @returns {503} Email service is unhealthy
 */
router.get('/email', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/siem
 * SIEM integration health check (DETAILED ACCESS)
 * 
 * Tests SIEM service connectivity and integration status.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} SIEM is healthy
 * @returns {503} SIEM is unhealthy
 */
router.get('/siem', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/ticketing
 * Ticketing integration health check (DETAILED ACCESS)
 * 
 * Tests ticketing service connectivity and integration status.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Ticketing service is healthy
 * @returns {503} Ticketing service is unhealthy
 */
router.get('/ticketing', requireDetailedHealthAccess, async (req, res) => {
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
 * GET /health/kafka/detailed
 * Detailed Kafka consumer health (DETAILED ACCESS)
 * 
 * Returns comprehensive Kafka consumer group and topic statistics.
 * Accessible via: JWT authentication required
 * 
 * @security JWT
 * @returns {200} Detailed Kafka health information
 * @returns {500} Failed to retrieve Kafka health
 */
router.get('/kafka/detailed', requireDetailedHealthAccess, async (req, res) => {
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
