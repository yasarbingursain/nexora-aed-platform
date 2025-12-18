import Redis from 'ioredis';
import { env } from './env';

// Helper to create Redis options
const createRedisOptions = () => {
  const options: any = {
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    retryStrategy: (times: number) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 100, 3000);
    },
  };
  
  if (env.REDIS_PASSWORD) {
    options.password = env.REDIS_PASSWORD;
  }
  
  return options;
};

// Redis clients for production
const redis = new Redis(env.REDIS_URL, createRedisOptions());
const redisQueue = new Redis(env.REDIS_URL, createRedisOptions());
const redisRateLimit = new Redis(env.REDIS_URL, createRedisOptions());
const redisCache = new Redis(env.REDIS_URL, createRedisOptions());

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redisQueue.on('error', (err) => {
  console.error('❌ Redis Queue connection error:', err.message);
});

redisRateLimit.on('error', (err) => {
  console.error('❌ Redis Rate Limit connection error:', err.message);
});

redisCache.on('error', (err) => {
  console.error('❌ Redis Cache connection error:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  await redisQueue.quit();
  await redisRateLimit.quit();
  await redisCache.quit();
});

process.on('SIGINT', async () => {
  await redis.quit();
  await redisQueue.quit();
  await redisRateLimit.quit();
  await redisCache.quit();
});

export { redis, redisQueue, redisRateLimit, redisCache };
