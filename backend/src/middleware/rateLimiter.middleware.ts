import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisRateLimit } from '@/config/redis';
import { env } from '@/config/env';

// Global rate limiter (per IP)
const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisRateLimit,
  keyPrefix: 'global_rate_limit',
  points: env.RATE_LIMIT_MAX_REQUESTS, // requests
  duration: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000), // seconds
  blockDuration: 60, // block for 60 seconds if limit exceeded
});

// Organization-specific rate limiter
const orgRateLimiter = new RateLimiterRedis({
  storeClient: redisRateLimit,
  keyPrefix: 'org_rate_limit',
  points: env.RATE_LIMIT_MAX_REQUESTS * 10, // higher limit for organizations
  duration: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000),
  blockDuration: 60,
});

// API endpoint specific rate limiters
const authRateLimiter = new RateLimiterRedis({
  storeClient: redisRateLimit,
  keyPrefix: 'auth_rate_limit',
  points: 5, // 5 login attempts
  duration: 300, // per 5 minutes
  blockDuration: 900, // block for 15 minutes
});

const apiKeyRateLimiter = new RateLimiterRedis({
  storeClient: redisRateLimit,
  keyPrefix: 'api_key_rate_limit',
  points: 1000, // higher limit for API keys
  duration: 60, // per minute
  blockDuration: 60,
});

export const globalRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.ip || 'unknown';
    await globalRateLimiter.consume(key as string);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': env.RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Global rate limit exceeded. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
  }
};

export const organizationRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      next();
      return;
    }

    const key = `${req.user.organizationId}:${req.ip}`;
    await orgRateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': (env.RATE_LIMIT_MAX_REQUESTS * 10).toString(),
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Organization rate limit exceeded. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
    return;
  }
};

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.ip || 'unknown';
    await authRateLimiter.consume(key as string);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    return res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Authentication rate limit exceeded. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
  }
};

export const apiKeyRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      next();
      return;
    }

    const key = `api_key:${apiKey}`;
    await apiKeyRateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      error: 'API key rate limit exceeded',
      message: 'Too many requests with this API key. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
    return;
  }
};

// Endpoint-specific rate limiter factory
export const createEndpointRateLimit = (
  points: number,
  duration: number,
  keyPrefix: string
) => {
  const limiter = new RateLimiterRedis({
    storeClient: redisRateLimit,
    keyPrefix,
    points,
    duration,
    blockDuration: duration,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${keyPrefix}:${req.ip || 'unknown'}`;
      await limiter.consume(key as string);
      next();
    } catch (rejRes: any) {
      const remainingPoints = rejRes?.remainingPoints || 0;
      const msBeforeNext = rejRes?.msBeforeNext || 0;
      
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000),
        'X-RateLimit-Limit': points.toString(),
        'X-RateLimit-Remaining': remainingPoints.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Endpoint rate limit exceeded for ${keyPrefix}. Please try again later.`,
        retryAfter: Math.round(msBeforeNext / 1000),
      });
    }
  };
};
