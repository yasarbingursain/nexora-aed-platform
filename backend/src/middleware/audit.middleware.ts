import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { evidenceService } from '@/services/evidence.service';

/**
 * Audit Logging Middleware
 * 
 * CRITICAL: Immutable audit trail for compliance
 * - Logs all API calls
 * - Captures request/response data
 * - Tracks user actions
 * - Non-blocking (async)
 * - Hash chain for integrity
 * 
 * Compliance: NIST, PCI-DSS, HIPAA, SOC 2
 */

interface AuditLogData {
  userId: string | null;
  organizationId: string;
  action: string;
  resource: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestBody: string | null;
  responseStatus: number | null;
  duration: number | null;
  timestamp: Date;
}

export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;
  let responseSent = false;

  // Override send method
  res.send = function (data: any): Response {
    if (!responseSent) {
      responseBody = data;
      responseSent = true;
    }
    return originalSend.call(this, data);
  };

  // Override json method
  res.json = function (data: any): Response {
    if (!responseSent) {
      responseBody = data;
      responseSent = true;
    }
    return originalJson.call(this, data);
  };

  // Listen for response finish event
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    // Skip audit logging for health checks and metrics
    if (req.path === '/health' || req.path === '/metrics') {
      return;
    }

    // Prepare audit log data
    const auditData: AuditLogData = {
      userId: req.user?.userId || null,
      organizationId: req.tenant?.organizationId || '',
      action: `${req.method} ${req.path}`,
      resource: extractResourceId(req.path) || null,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
      requestBody: sanitizeRequestBody(req.body) || null,
      responseStatus: res.statusCode || null,
      duration,
      timestamp: new Date(),
    };

    // Log to database (async, non-blocking)
    try {
      await createAuditLog(auditData);
      
      // Also write to immutable evidence log for compliance
      const evidenceEntry: any = {
        organizationId: auditData.organizationId,
        actor: auditData.userId || auditData.ipAddress,
        action: auditData.action,
        resourceType: 'api_call',
        payload: {
          method: req.method,
          path: req.path,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
          responseStatus: auditData.responseStatus,
          duration: auditData.duration,
        },
      };
      
      if (auditData.resource) {
        evidenceEntry.resourceId = auditData.resource;
      }
      
      await evidenceService.writeEvidence(evidenceEntry);
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        auditData,
      });
    }
  });

  // Continue to next middleware
  next();
};

/**
 * Create audit log entry in database
 */
async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        organizationId: data.organizationId || '',
        action: data.action,
        resource: data.resource || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        requestBody: data.requestBody || null,
        responseStatus: data.responseStatus || null,
        duration: data.duration || null,
        timestamp: data.timestamp,
      },
    });

    logger.debug('Audit log created', {
      action: data.action,
      userId: data.userId,
      organizationId: data.organizationId,
      status: data.responseStatus,
      duration: data.duration,
    });
  } catch (error) {
    // Log error but don't throw (non-blocking)
    logger.error('Database error creating audit log', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Extract resource ID from path
 * Example: /api/v1/identities/abc123 -> abc123
 */
function extractResourceId(path: string): string | undefined {
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Check if last part looks like an ID (not a keyword)
  const keywords = ['discover', 'rotate', 'quarantine', 'investigate', 'remediate', 'execute', 'rollback'];
  if (lastPart && !keywords.includes(lastPart) && lastPart.length > 10) {
    return lastPart;
  }
  
  return undefined;
}

/**
 * Get client IP address
 * Handles proxies and load balancers
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : 'unknown';
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Sanitize request body for logging
 * Remove sensitive fields (passwords, tokens, secrets)
 */
function sanitizeRequestBody(body: any): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'credentials',
    'mfaSecret',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  try {
    return JSON.stringify(sanitized);
  } catch (error) {
    return '[Unable to serialize]';
  }
}

/**
 * Usage in server:
 * 
 * import { auditMiddleware } from '@/middleware/audit.middleware';
 * 
 * // Apply globally after auth and tenant middleware
 * app.use(auditMiddleware);
 * 
 * // All API calls will be logged automatically
 * // Logs include: user, organization, action, resource, IP, status, duration
 */
