import promClient from 'prom-client';
import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'nexora-api',
  version: process.env.npm_package_version || '1.0.0',
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'nexora_',
});

// Custom HTTP request metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'nexora_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'organization_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

export const httpRequestsTotal = new promClient.Counter({
  name: 'nexora_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'organization_id'],
  registers: [register],
});

// Security metrics
export const authenticationAttempts = new promClient.Counter({
  name: 'nexora_authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status', 'organization_id'],
  registers: [register],
});

export const rateLimitHits = new promClient.Counter({
  name: 'nexora_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'organization_id'],
  registers: [register],
});

// Business metrics
export const activeThreats = new promClient.Gauge({
  name: 'nexora_active_threats_total',
  help: 'Number of active threats',
  labelNames: ['severity', 'organization_id'],
  registers: [register],
});

export const identitiesManaged = new promClient.Gauge({
  name: 'nexora_identities_managed_total',
  help: 'Number of identities under management',
  labelNames: ['type', 'status', 'organization_id'],
  registers: [register],
});

export const remediationActions = new promClient.Counter({
  name: 'nexora_remediation_actions_total',
  help: 'Total number of remediation actions executed',
  labelNames: ['action_type', 'status', 'organization_id'],
  registers: [register],
});

// Database metrics
export const databaseConnections = new promClient.Gauge({
  name: 'nexora_database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const databaseQueryDuration = new promClient.Histogram({
  name: 'nexora_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// WebSocket metrics
export const websocketConnections = new promClient.Gauge({
  name: 'nexora_websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['organization_id'],
  registers: [register],
});

export const websocketMessages = new promClient.Counter({
  name: 'nexora_websocket_messages_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['event_type', 'organization_id'],
  registers: [register],
});

// Redis metrics
export const redisOperations = new promClient.Counter({
  name: 'nexora_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Expose metrics endpoint
export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

// Middleware to track HTTP requests
export const metricsMiddleware = (req: Request, res: Response, next: Function) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const organizationId = (req as any).user?.organizationId || 'anonymous';
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString(), organizationId)
      .observe(duration);
      
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString(), organizationId)
      .inc();
  });
  
  next();
};

// Function to update business metrics periodically
export const updateBusinessMetrics = async () => {
  try {
    // Update threat metrics
    const threatCounts = await prisma.threat.groupBy({
      by: ['severity', 'organizationId'],
      where: { 
        status: { in: ['open', 'investigating'] }
      },
      _count: true,
    });
    
    // Reset gauges before updating
    activeThreats.reset();
    
    threatCounts.forEach(({ severity, organizationId, _count }) => {
      activeThreats.set({ severity, organization_id: organizationId }, _count);
    });

    // Update identity metrics
    const identityCounts = await prisma.identity.groupBy({
      by: ['type', 'status', 'organizationId'],
      _count: true,
    });
    
    // Reset gauges before updating
    identitiesManaged.reset();
    
    identityCounts.forEach(({ type, status, organizationId, _count }) => {
      identitiesManaged.set({ 
        type, 
        status, 
        organization_id: organizationId 
      }, _count);
    });

    logger.debug('Business metrics updated successfully');
  } catch (error) {
    logger.error('Failed to update business metrics', { error });
  }
};

// Start metrics collection interval
const METRICS_UPDATE_INTERVAL = 30000; // 30 seconds

export const startMetricsCollection = () => {
  // Update business metrics immediately
  updateBusinessMetrics();
  
  // Set up periodic updates
  const interval = setInterval(updateBusinessMetrics, METRICS_UPDATE_INTERVAL);
  
  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(interval);
  });
  
  process.on('SIGINT', () => {
    clearInterval(interval);
  });
  
  logger.info('Metrics collection started', { 
    updateInterval: METRICS_UPDATE_INTERVAL 
  });
};

// Helper functions for tracking specific events
export const trackAuthenticationAttempt = (
  type: 'login' | 'register' | 'refresh' | 'mfa',
  status: 'success' | 'failure',
  organizationId?: string
) => {
  authenticationAttempts.inc({
    type,
    status,
    organization_id: organizationId || 'unknown',
  });
};

export const trackRateLimitHit = (endpoint: string, organizationId?: string) => {
  rateLimitHits.inc({
    endpoint,
    organization_id: organizationId || 'unknown',
  });
};

export const trackRemediationAction = (
  actionType: string,
  status: 'success' | 'failure',
  organizationId: string
) => {
  remediationActions.inc({
    action_type: actionType,
    status,
    organization_id: organizationId,
  });
};

export const trackWebSocketConnection = (organizationId: string, delta: number) => {
  websocketConnections.inc({ organization_id: organizationId }, delta);
};

export const trackWebSocketMessage = (eventType: string, organizationId: string) => {
  websocketMessages.inc({
    event_type: eventType,
    organization_id: organizationId,
  });
};

export const trackRedisOperation = (operation: string, status: 'success' | 'failure') => {
  redisOperations.inc({ operation, status });
};

// Export the register for external use
export { register };
