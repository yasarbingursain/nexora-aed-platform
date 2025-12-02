import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { env } from './env';

declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: Pool | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// PostgreSQL connection pool for raw queries (OCSF threat events)
const pool = globalThis.__pgPool || new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

if (env.NODE_ENV === 'development') {
  globalThis.__pgPool = pool;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

export { prisma, pool };
