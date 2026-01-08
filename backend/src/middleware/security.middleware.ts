import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { trackRateLimitHit } from '@/utils/metrics';

// Enhanced Helmet configuration for production security
// Cast helmet options to any to accommodate custom fields and avoid
// strict typing conflicts across helmet versions used in different envs.
export const securityHeaders = helmet(({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    reportOnly: env.NODE_ENV === 'development',
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin'],
  },

  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      ambient_light_sensor: [],
    },
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: env.NODE_ENV === 'production',

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin',
  },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'same-origin',
  },
} as any));

// SQL Injection Prevention Middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+)|(\?)|(\[)|(\])|(\{)|(\}))/,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const scanObject = (obj: any, path = ''): boolean => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'string' && checkForSQLInjection(value)) {
          logger.warn('Potential SQL injection attempt detected', {
            path: currentPath,
            value: value.substring(0, 100), // Log first 100 chars
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          });
          return true;
        }

        if (typeof value === 'object' && value !== null) {
          if (scanObject(value, currentPath)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Check query parameters
  if (req.query && scanObject(req.query, 'query')) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      message: 'Request contains potentially malicious content',
    });
  }

  // Check request body
  if (req.body && scanObject(req.body, 'body')) {
    return res.status(400).json({
      error: 'Invalid request body',
      message: 'Request contains potentially malicious content',
    });
  }

  next();
};

// XSS Protection Middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Preserve forensic/immutable evidence: do not mutate request body/query
  // for endpoints that operate on evidence chains. Mutating evidence payloads
  // could corrupt audit trails and break verification. Skip sanitization
  // for any path containing '/evidence'.
  try {
    if (req.path && req.path.includes('/evidence')) {
      return next();
    }
  } catch (e) {
    // If any unexpected error occurs, log and continue with sanitization as fallback
    logger.warn('xssProtection path check failed, proceeding with sanitization', { error: e });
  }
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
  ];

  const sanitizeString = (str: string): string => {
    let sanitized = str;
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    return sanitized;
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Request Size Limit Middleware
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logger.warn('Request size limit exceeded', {
          contentLength: sizeInBytes,
          maxSize: maxSizeInBytes,
          ip: req.ip,
          path: req.path,
        });
        
        return res.status(413).json({
          error: 'Request too large',
          message: `Request size exceeds the limit of ${maxSize}`,
        });
      }
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

// IP Whitelist/Blacklist Middleware
export const ipFilter = (options: {
  whitelist?: string[];
  blacklist?: string[];
} = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIP)) {
      logger.warn('Blocked request from blacklisted IP', {
        ip: clientIP,
        path: req.path,
        userAgent: req.headers['user-agent'],
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource',
      });
    }
    
    // Check whitelist if provided
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(clientIP)) {
        logger.warn('Blocked request from non-whitelisted IP', {
          ip: clientIP,
          path: req.path,
          userAgent: req.headers['user-agent'],
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not allowed to access this resource',
        });
      }
    }
    
    next();
  };
};

// Request ID Middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Security event logging middleware
export const securityEventLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestId = (req as any).requestId;
    
    // Log security-relevant events
    if (res.statusCode >= 400) {
      logger.warn('Security event detected', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        duration,
        organizationId: (req as any).user?.organizationId,
        userId: (req as any).user?.userId,
      });
      
      // Track rate limit hits
      if (res.statusCode === 429) {
        trackRateLimitHit(req.path, (req as any).user?.organizationId);
      }
    }
  });
  
  next();
};

// Combine all security middleware
export const applySecurity = [
  requestId,
  securityHeaders,
  requestSizeLimit('10mb'),
  sqlInjectionProtection,
  xssProtection,
  securityEventLogger,
];
