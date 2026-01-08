/**
 * Health Endpoint Access Control Middleware
 * 
 * Provides tiered access control for health endpoints:
 * 1. DETAILED_HEALTH - Requires authentication (internal use by dashboards)
 * 2. LITE_HEALTH - Allows API key OR internal network (load balancers, monitoring)
 * 3. BASIC_HEALTH - Public access but rate-limited (basic status only)
 * 
 * Security Principles:
 * - Production health endpoints require authentication or authorized API key
 * - Prevents reconnaissance attacks and information disclosure
 * - NIST SP 800-61 Revision 3 - Incident Response and Detection
 * - OWASP A01:2021 - Broken Access Control
 * - SOC2 Type II - Access Control and Monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

// Extend Express Request with health check metadata
declare global {
  namespace Express {
    interface Request {
      healthAccessLevel?: 'public' | 'internal' | 'authenticated';
      internalNetworkAccess?: boolean;
    }
  }
}

/**
 * List of internal IP addresses/networks that can access lite health endpoints
 * In production, configure these via environment variables or AWS Security Groups
 */
const INTERNAL_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '169.254.169.254', // AWS metadata service
];

/**
 * Check if request is from internal/private network
 * In production Kubernetes or AWS, use X-Forwarded-For header from trusted proxy
 */
function isInternalNetwork(req: Request): boolean {
  // In production, check X-Forwarded-For from trusted ALB/reverse proxy
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  const clientIp = xForwardedFor ? xForwardedFor.split(',')[0].trim() : req.ip;

  // Check internal IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (!clientIp) return false;

  // Direct local connections
  if (INTERNAL_IPS.includes(clientIp)) {
    return true;
  }

  // AWS internal VPC ranges
  if (isPrivateIP(clientIp)) {
    return true;
  }

  return false;
}

/**
 * Check if IP is in private/internal ranges (RFC 1918)
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const [a, b] = [parseInt(parts[0], 10), parseInt(parts[1], 10)];

  return (
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) // 192.168.0.0/16
  );
}

/**
 * Validate API key for health endpoint access
 * Keys should be stored in environment variables and marked as 'health-monitoring'
 */
function validateHealthApiKey(apiKey: string): boolean {
  const validKeys = (process.env.HEALTH_ENDPOINT_API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (validKeys.length === 0) {
    logger.warn('No HEALTH_ENDPOINT_API_KEYS configured');
    return false;
  }

  // Hash comparison to prevent timing attacks
  return validKeys.some((key) => constantTimeCompare(apiKey, key));
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Prevents attackers from determining API key characters by response time
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * DETAILED ACCESS - Requires JWT authentication
 * Used by: Admin dashboards, security monitoring tools, internal applications
 * Exposes: Full system status, all service health details, error messages
 */
export const requireDetailedHealthAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Detailed health endpoints require valid JWT token',
    });
  }

  req.healthAccessLevel = 'authenticated';
  next();
};

/**
 * LITE ACCESS - Allows API key OR internal network access
 * Used by: Load balancers, monitoring systems, alerting tools
 * Exposes: Basic service health status, availability indicators
 * Rate Limited: 100 req/min per API key or IP
 */
export const requireLiteHealthAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  const isInternal = isInternalNetwork(req);

  // Check if request has valid API key
  if (apiKey && validateHealthApiKey(apiKey)) {
    req.healthAccessLevel = 'internal';
    next();
    return;
  }

  // Check if request is from internal network
  if (isInternal) {
    req.healthAccessLevel = 'internal';
    req.internalNetworkAccess = true;
    next();
    return;
  }

  return res.status(403).json({
    error: 'Access forbidden',
    message: 'Lite health endpoints require valid API key or internal network access',
  });
};

/**
 * BASIC ACCESS - Public but rate-limited
 * Used by: External monitoring services, public status pages (if any)
 * Exposes: Only overall system status (healthy/unhealthy), no details
 * Rate Limited: 10 req/min per IP address
 */
export const requireBasicHealthAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.healthAccessLevel = 'public';
  next();
};

/**
 * Request logging middleware for health endpoints
 * Logs all access to health endpoints for security auditing
 */
export const logHealthAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    logger.info('Health endpoint accessed', {
      method: req.method,
      path: req.path,
      accessLevel: req.healthAccessLevel,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    return originalJson(data);
  };

  next();
};
