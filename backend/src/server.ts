import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { globalRateLimit } from '@/middleware/rateLimiter.middleware';
import { applySecurity } from '@/middleware/security.middleware';
import { auditMiddleware } from '@/middleware/audit.middleware';
import { enforceRowLevelSecurity, verifyRLSEnabled } from '@/middleware/rls.middleware';
import { setupWebSocket, initializeThreatFeed } from '@/services/websocket.service';
import { logger } from '@/utils/logger';
import { metricsHandler, metricsMiddleware, startMetricsCollection } from '@/utils/metrics';
import { createOrchestratorFromEnv } from '@/services/osint/orchestrator.service';
import { ThreatIntelScheduler } from '@/jobs/threat-intel-scheduler';

// SPRINT 3 Middleware
import { performanceMiddleware, healthCheckHandler } from '@/middleware/performance.middleware';
import { compressionMiddleware } from '@/middleware/compression.middleware';

// Routes
import authRoutes from '@/routes/auth.routes';
import identitiesRoutes from '@/routes/identities.routes';
import threatsRoutes from '@/routes/threats.routes';
import remediationRoutes from '@/routes/remediation.routes';
import complianceRoutes from '@/routes/compliance.routes';
import complianceDashboardRoutes from '@/routes/compliance.dashboard.routes';
import evidenceRoutes from '@/routes/evidence.routes';
import gdprRoutes from '@/routes/gdpr.routes';
import intelRoutes from '@/routes/intel.routes';
import demoRoutes from '@/routes/demo.routes';
import customerThreatsRoutes from '@/routes/customer.threats.routes';
import customerIdentitiesRoutes from '@/routes/customer.identities.routes';
import customerAnalyticsRoutes from '@/routes/customer.analytics.routes';
import adminRoutes from '@/routes/admin.routes';
import osintRoutes from '@/routes/osint.routes';
import malgenxRoutes from '@/routes/malgenx.routes';
import threatFeedRoutes from '@/routes/threat-feed.routes';
import nhitiRoutes from '@/routes/nhiti.routes';
import pqcRoutes from '@/routes/pqc.routes';

// Sprint 3 routes
import exportRoutes from '@/routes/v1/export.routes';
import cacheRoutes from '@/routes/v1/cache.routes';

// ----------------------------------------------------
// FIX 1: DECLARE SHARED VARS BEFORE THEY ARE USED
// ----------------------------------------------------

let io: SocketIOServer | undefined = undefined;
let osintOrchestrator: ReturnType<typeof createOrchestratorFromEnv> | null = null;
let threatIntelScheduler: ThreatIntelScheduler | null = null;
let kafkaConsumer: Awaited<ReturnType<typeof initializeThreatFeed>> | null = null;

// ----------------------------------------------------
// EXPRESS APP
// ----------------------------------------------------

const app = express();
const httpServer = createServer(app);

// Apply security middleware
app.use(applySecurity);

// CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Compression
app.use(compressionMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
app.use(globalRateLimit);

// Performance
app.use(performanceMiddleware);

// Metrics
app.use(metricsMiddleware);

// Audit Logging
app.use(auditMiddleware);

// RLS Enforcement
app.use(enforceRowLevelSecurity);

// ----------------------------------------------------
// FIX 2: TYPE THE LOGGING MIDDLEWARE PARAMS
// ----------------------------------------------------

app.use((
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health
app.get('/health', healthCheckHandler);

// API Routes
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/identities`, identitiesRoutes);
app.use(`/api/${env.API_VERSION}/threats`, threatsRoutes);
app.use(`/api/${env.API_VERSION}/remediation`, remediationRoutes);
app.use(`/api/${env.API_VERSION}/compliance`, complianceRoutes);
app.use(`/api/${env.API_VERSION}/compliance`, complianceDashboardRoutes);
app.use(`/api/${env.API_VERSION}/evidence`, evidenceRoutes);
app.use(`/api/${env.API_VERSION}/gdpr`, gdprRoutes);
app.use(`/api/${env.API_VERSION}/intel`, intelRoutes);
app.use(`/api/${env.API_VERSION}/demo`, demoRoutes);

// Customer Routes
app.use(`/api/${env.API_VERSION}/customer/threats`, customerThreatsRoutes);
app.use(`/api/${env.API_VERSION}/customer/identities`, customerIdentitiesRoutes);
app.use(`/api/${env.API_VERSION}/customer/analytics`, customerAnalyticsRoutes);

// Admin
app.use(`/api/${env.API_VERSION}/admin`, adminRoutes);

// OSINT + MalGenX
app.use(`/api/${env.API_VERSION}/osint`, osintRoutes);
app.use(`/api/${env.API_VERSION}/malgenx`, malgenxRoutes);

// Threat Feed
app.use(`/api/${env.API_VERSION}/threat-feed`, threatFeedRoutes);

// NHITI
app.use(`/api/${env.API_VERSION}/nhiti`, nhitiRoutes);

// Post-Quantum Cryptography (PQC)
app.use(`/api/${env.API_VERSION}/pqc`, pqcRoutes);

// Export / Cache
app.use(`/api/${env.API_VERSION}/export`, exportRoutes);
app.use(`/api/${env.API_VERSION}/admin/cache`, cacheRoutes);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// API docs
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Nexora AED Platform API',
    version: env.API_VERSION,
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// GLOBAL ERROR HANDLER
// ----------------------------------------------------

app.use((
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
});

// ----------------------------------------------------
// WEBSOCKETS
// ----------------------------------------------------

if (env.ENABLE_WEBSOCKETS) {
  io = setupWebSocket(httpServer);
  logger.info('WebSocket server initialized');
}

// ----------------------------------------------------
// GRACEFUL SHUTDOWN FIXED + TYPE SAFE
// ----------------------------------------------------

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  httpServer.close(() => logger.info('HTTP server closed'));

  if (io) io.close(() => logger.info('WebSocket server closed'));

  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing DB:', error);
  }

  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis:', error);
  }

  if (osintOrchestrator) {
    osintOrchestrator.stop();
    logger.info('OSINT Orchestrator stopped');
  }

  if (threatIntelScheduler) {
    threatIntelScheduler.stop();
    logger.info('Threat Intelligence Scheduler stopped');
  }

  if (kafkaConsumer) {
    try {
      await kafkaConsumer.disconnect();
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Kafka disconnect error:', error);
    }
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on(
  'unhandledRejection',
  (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  }
);

// ----------------------------------------------------
// START METRICS
// ----------------------------------------------------
startMetricsCollection();

// ----------------------------------------------------
// OSINT ORCHESTRATOR
// ----------------------------------------------------

if (process.env.ENABLE_OSINT_INGESTION === 'true') {
  try {
    osintOrchestrator = createOrchestratorFromEnv();
    osintOrchestrator.start();
    logger.info('✅ OSINT Orchestrator started');
  } catch (error) {
    logger.error('Failed to start OSINT Orchestrator:', error);
  }
}

// ----------------------------------------------------
// THREAT INTEL SCHEDULER
// ----------------------------------------------------

if (process.env.THREAT_INTEL_ENABLED === 'true') {
  try {
    threatIntelScheduler = new ThreatIntelScheduler();
    threatIntelScheduler.start();
    logger.info('✅ Threat Intelligence Scheduler started');
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
  }
}

// ----------------------------------------------------
// KAFKA THREAT FEED
// ----------------------------------------------------

if (env.ENABLE_WEBSOCKETS && process.env.KAFKA_BROKERS && io) {
  initializeThreatFeed(io)
    .then(consumer => {
      kafkaConsumer = consumer;
      if (consumer) logger.info('✅ Kafka threat feed initialized');
    })
    .catch(error => logger.error('Kafka init error:', error));
}

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------

const PORT = env.PORT || 8080;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 Nexora AED Platform API Server started`, {
    port: PORT,
    environment: env.NODE_ENV,
    version: env.API_VERSION,
  });

  try {
    const rlsStatus = await verifyRLSEnabled();
    if (rlsStatus.enabled) {
      logger.info('✅ Row-Level Security verified', {
        tables: rlsStatus.tables.length,
      });
    } else {
      logger.error('⚠️ RLS verification failed', { errors: rlsStatus.errors });
    }
  } catch (error) {
    logger.error('Failed to verify RLS', { error });
  }

  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  logger.info(`❤️ Health Check: http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
});

export { app, httpServer, io };
