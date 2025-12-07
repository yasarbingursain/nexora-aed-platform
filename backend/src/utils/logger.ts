import winston from 'winston';
import { env } from '@/config/env';

/**
 * Extended Logger interface with security method
 */
interface ExtendedLogger extends winston.Logger {
  security: (message: string, meta?: any) => void;
}

/**
 * SECURITY: Sanitize log messages to prevent log injection (CWE-117)
 * Removes newlines, carriage returns, and control characters
 */
function sanitizeLogMessage(message: string): string {
  if (typeof message !== 'string') return String(message);
  return message
    .replace(/[\r\n]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 1000); // Limit message length
}

/**
 * SECURITY: Sanitize metadata to remove sensitive data
 */
function sanitizeMetadata(meta: any): any {
  if (!meta || typeof meta !== 'object') return meta;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
  const sanitized = { ...meta };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message: sanitizeLogMessage(String(message)),
      ...sanitizeMetadata(meta),
    });
  })
);

// Create logger instance
const baseLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'nexora-api',
    environment: env.NODE_ENV,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add Loki transport if URL is provided
if (env.LOKI_URL) {
  try {
    const LokiTransport = require('winston-loki');
    baseLogger.add(new LokiTransport({
      host: env.LOKI_URL,
      labels: { 
        app: 'nexora-api',
        environment: env.NODE_ENV,
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err: any) => {
        console.error('Loki connection error:', err);
      },
    }));
  } catch (error) {
    console.warn('Loki transport not available:', error);
  }
}

// Handle uncaught exceptions and rejections
if (env.NODE_ENV === 'production') {
  baseLogger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  
  baseLogger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}

// SECURITY FIX: Add security logging method with proper typing
const extendedLogger = baseLogger as ExtendedLogger;
extendedLogger.security = (message: string, meta?: any) => {
  baseLogger.warn(`[SECURITY] ${message}`, { ...meta, securityEvent: true });
};

// Export with proper type
export const logger = extendedLogger;
