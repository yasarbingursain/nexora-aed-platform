import Redis from 'ioredis';
import { env } from './env';

// Redis client for general use
export const redis = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
});

// Redis client for BullMQ (separate connection)
export const redisQueue = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
});

// Redis client for rate limiting
export const redisRateLimit = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisQueue.on('connect', () => {
  console.log('✅ Redis Queue connected');
});

redisQueue.on('error', (err) => {
  console.error('❌ Redis Queue connection error:', err);
});

redisRateLimit.on('connect', () => {
  console.log('✅ Redis Rate Limit connected');
});

redisRateLimit.on('error', (err) => {
  console.error('❌ Redis Rate Limit connection error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  await redisQueue.quit();
  await redisRateLimit.quit();
});

process.on('SIGINT', async () => {
  await redis.quit();
  await redisQueue.quit();
  await redisRateLimit.quit();
});
