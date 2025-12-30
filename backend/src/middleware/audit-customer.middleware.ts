import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: CWE-778 - Insufficient Logging
 * 
 * Enhanced audit logging middleware for customer actions.
 * Captures all customer API calls with sanitized request/response data.
 */

export function auditCustomerActions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only audit customer actions
    if (!req.path.startsWith('/api/v1/customer')) {
      return next();
    }

    const startTime = Date.now();
    const { organizationId, userId, email } = req.user || {};

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const duration = Date.now() - startTime;

      // Log after response (non-blocking)
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              event: `${req.method}_${req.path.replace(/\//g, '_')}`,
              entityType: 'api_request',
              entityId: req.user?.userId || 'anonymous',
              action: `${req.method} ${req.path}`,
              userId: req.user?.userId || null,
              organizationId: req.user?.organizationId || '',
              ipAddress: req.ip || '',
              userAgent: req.headers['user-agent'] || '',
              resource: req.path,
              requestBody: JSON.stringify(req.body),
              responseStatus: res.statusCode,
              duration: Date.now() - startTime,
              severity: res.statusCode >= 400 ? 'high' : 'low',
            },
          });

          logger.info('Customer action audited', {
            userId,
            organizationId,
            action: `${req.method} ${req.path}`,
            status: res.statusCode,
            duration,
          });
        } catch (error) {
          logger.error('Failed to create audit log', {
            error: error instanceof Error ? error.message : 'Unknown',
            userId,
            organizationId,
          });
        }
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: any): string {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'credentials',
    'mfaSecret',
    'refreshToken',
    'accessToken',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  try {
    return JSON.stringify(sanitized);
  } catch (error) {
    return '[SERIALIZATION_ERROR]';
  }
}

/**
 * Audit security-sensitive actions (separate from regular audit)
 */
export function auditSecurityAction(action: string, metadata: Record<string, any> = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { organizationId, userId } = req.user || {};

    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          organizationId: organizationId || '',
          action,
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || '',
          requestBody: JSON.stringify(metadata),
          responseStatus: 0, // Will be updated after response
          duration: 0,
        },
      });

      logger.security('Security action audited', {
        userId,
        organizationId,
        action,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to audit security action', {
        error: error instanceof Error ? error.message : 'Unknown',
        action,
      });
    }

    next();
  };
}
