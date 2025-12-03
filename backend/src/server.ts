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

// Import routes
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

// Create Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Apply security middleware
app.use(applySecurity);

// CORS configuration
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(globalRateLimit);

// Metrics middleware
app.use(metricsMiddleware);

// Audit logging middleware (logs all API calls)
app.use(auditMiddleware);

// SPRINT 2: Row-Level Security enforcement
app.use(enforceRowLevelSecurity);

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
  });
});

// API routes
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

// Customer-facing routes
app.use(`/api/${env.API_VERSION}/customer/threats`, customerThreatsRoutes);
app.use(`/api/${env.API_VERSION}/customer/identities`, customerIdentitiesRoutes);
app.use(`/api/${env.API_VERSION}/customer/analytics`, customerAnalyticsRoutes);

// Admin routes (CRITICAL - REQUIRED FOR ADMIN PANEL)
app.use(`/api/${env.API_VERSION}/admin`, adminRoutes);

// OSINT Threat Intelligence routes
app.use(`/api/${env.API_VERSION}/osint`, osintRoutes);

// MalGenX Malware Analysis & Threat Intelligence routes
app.use(`/api/${env.API_VERSION}/malgenx`, malgenxRoutes);

// Real-Time Threat Feed routes
app.use(`/api/${env.API_VERSION}/threat-feed`, threatFeedRoutes);

// NHITI Threat Intelligence Sharing routes
app.use(`/api/${env.API_VERSION}/nhiti`, nhitiRoutes);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Nexora AED Platform API',
    version: env.API_VERSION,
    documentation: 'https://docs.nexora.com/api',
    endpoints: {
      auth: `/api/${env.API_VERSION}/auth`,
      identities: `/api/${env.API_VERSION}/identities`,
      threats: `/api/${env.API_VERSION}/threats`,
      remediation: `/api/${env.API_VERSION}/remediation`,
      compliance: `/api/${env.API_VERSION}/compliance`,
      evidence: `/api/${env.API_VERSION}/evidence`,
      gdpr: `/api/${env.API_VERSION}/gdpr`,
      intel: `/api/${env.API_VERSION}/intel`,
      customer: {
        threats: `/api/${env.API_VERSION}/customer/threats`,
        identities: `/api/${env.API_VERSION}/customer/identities`,
        analytics: `/api/${env.API_VERSION}/customer/analytics`,
      },
      metrics: '/metrics',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Setup WebSocket if enabled
let io: SocketIOServer | undefined;
if (env.ENABLE_WEBSOCKETS) {
  io = setupWebSocket(httpServer);
  logger.info('WebSocket server initialized');
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close WebSocket server
  if (io) {
    io.close(() => {
      logger.info('WebSocket server closed');
    });
  }
  
  // Close database connections
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  
  // Close Redis connections
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
  
  // Stop OSINT Orchestrator
  if (osintOrchestrator) {
    osintOrchestrator.stop();
    logger.info('OSINT Orchestrator stopped');
  }
  
  // Stop Threat Intel Scheduler
  if (threatIntelScheduler) {
    threatIntelScheduler.stop();
    logger.info('Threat Intelligence Scheduler stopped');
  }
  
  // Disconnect Kafka consumer
  if (kafkaConsumer) {
    try {
      await kafkaConsumer.disconnect();
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka consumer:', error);
    }
  }
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start metrics collection
startMetricsCollection();

// Initialize OSINT Orchestrator
let osintOrchestrator: ReturnType<typeof createOrchestratorFromEnv> | null = null;
if (process.env.ENABLE_OSINT_INGESTION === 'true') {
  try {
    osintOrchestrator = createOrchestratorFromEnv();
    osintOrchestrator.start();
    logger.info('✅ OSINT Orchestrator started');
  } catch (error) {
    logger.error('Failed to start OSINT Orchestrator', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Initialize Threat Intelligence Scheduler
let threatIntelScheduler: ThreatIntelScheduler | null = null;
if (process.env.THREAT_INTEL_ENABLED === 'true') {
  try {
    threatIntelScheduler = new ThreatIntelScheduler();
    threatIntelScheduler.start();
    logger.info('✅ Threat Intelligence Scheduler started');
  } catch (error) {
    logger.error('Failed to start Threat Intelligence Scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Initialize Kafka Threat Feed for WebSocket
let kafkaConsumer: Awaited<ReturnType<typeof initializeThreatFeed>> | null = null;
if (env.ENABLE_WEBSOCKETS && process.env.KAFKA_BROKERS) {
  initializeThreatFeed(io).then(consumer => {
    kafkaConsumer = consumer;
    if (consumer) {
      logger.info('✅ Kafka threat feed initialized');
    }
  }).catch(error => {
    logger.error('Failed to initialize Kafka threat feed', { error });
  });
}

// Start server
const PORT = env.PORT || 8080;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 Nexora AED Platform API Server started`, {
    port: PORT,
    environment: env.NODE_ENV,
    version: env.API_VERSION,
    websockets: env.ENABLE_WEBSOCKETS,
    osintIngestion: process.env.ENABLE_OSINT_INGESTION === 'true',
  });
  
  // SPRINT 2: Verify Row-Level Security is enabled
  try {
    const rlsStatus = await verifyRLSEnabled();
    if (rlsStatus.enabled) {
      logger.info('✅ Row-Level Security verified', {
        tablesProtected: rlsStatus.tables.length,
      });
    } else {
      logger.error('⚠️ Row-Level Security verification failed', {
        errors: rlsStatus.errors,
      });
    }
  } catch (error) {
    logger.error('Failed to verify RLS', { error });
  }
  
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`❤️ Health Check: http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
});

export { app, httpServer, io };
