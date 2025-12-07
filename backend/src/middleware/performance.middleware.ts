import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

/**
 * PERFORMANCE: Request Performance Monitoring Middleware
 * 
 * Tracks:
 * - Response time
 * - Memory usage
 * - Slow requests (>1s)
 * - Error rates
 * 
 * Integrates with monitoring tools:
 * - Prometheus metrics
 * - CloudWatch
 * - DataDog
 */

interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsed: number;
  timestamp: Date;
}

export class PerformanceMiddleware {
  private static readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private static readonly VERY_SLOW_REQUEST_THRESHOLD = 5000; // 5 seconds

  /**
   * Track request performance
   */
  static track() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage().heapUsed;

      // Capture original end function
      const originalEnd = res.end;

      // Override end to capture metrics
      res.end = function (this: Response, ...args: any[]): Response {
        // Calculate duration
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms

        // Calculate memory delta
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;

        // Log metrics
        const metrics: PerformanceMetrics = {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: duration,
          memoryUsed: memoryDelta,
          timestamp: new Date(),
        };

        // Log slow requests
        if (duration > PerformanceMiddleware.VERY_SLOW_REQUEST_THRESHOLD) {
          logger.error('Very slow request detected', {
            ...metrics,
            threshold: PerformanceMiddleware.VERY_SLOW_REQUEST_THRESHOLD,
            userId: (req as any).user?.userId,
            organizationId: (req as any).user?.organizationId,
          });
        } else if (duration > PerformanceMiddleware.SLOW_REQUEST_THRESHOLD) {
          logger.warn('Slow request detected', {
            ...metrics,
            threshold: PerformanceMiddleware.SLOW_REQUEST_THRESHOLD,
            userId: (req as any).user?.userId,
            organizationId: (req as any).user?.organizationId,
          });
        } else {
          logger.debug('Request completed', metrics);
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        res.setHeader('X-Memory-Used', `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);

        // Call original end
        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Health check endpoint
   */
  static healthCheck() {
    return (req: Request, res: Response) => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptime,
          formatted: this.formatUptime(uptime),
        },
        memory: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
          heapUsagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2),
        },
        process: {
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };

      // Check if memory usage is critical
      const heapPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (heapPercent > 90) {
        health.status = 'degraded';
        logger.warn('High memory usage detected', {
          heapPercent,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
        });
      }

      res.json(health);
    };
  }

  /**
   * Metrics endpoint (Prometheus format)
   */
  static metrics() {
    return (req: Request, res: Response) => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Prometheus format
      const metrics = [
        `# HELP process_uptime_seconds Process uptime in seconds`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds ${uptime}`,
        ``,
        `# HELP process_heap_used_bytes Process heap used in bytes`,
        `# TYPE process_heap_used_bytes gauge`,
        `process_heap_used_bytes ${memoryUsage.heapUsed}`,
        ``,
        `# HELP process_heap_total_bytes Process heap total in bytes`,
        `# TYPE process_heap_total_bytes gauge`,
        `process_heap_total_bytes ${memoryUsage.heapTotal}`,
        ``,
        `# HELP process_rss_bytes Process RSS in bytes`,
        `# TYPE process_rss_bytes gauge`,
        `process_rss_bytes ${memoryUsage.rss}`,
        ``,
        `# HELP process_external_bytes Process external memory in bytes`,
        `# TYPE process_external_bytes gauge`,
        `process_external_bytes ${memoryUsage.external}`,
      ].join('\n');

      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(metrics);
    };
  }

  /**
   * Format uptime in human-readable format
   */
  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

export const performanceMiddleware = PerformanceMiddleware.track();
export const healthCheckHandler = PerformanceMiddleware.healthCheck();
export const metricsHandler = PerformanceMiddleware.metrics();
