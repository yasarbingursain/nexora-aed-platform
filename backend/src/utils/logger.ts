import winston from 'winston';
import { env } from '@/config/env';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
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
    logger.add(new LokiTransport({
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
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  
  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}
