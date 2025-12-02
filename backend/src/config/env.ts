import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),
  API_VERSION: z.string().default('v1'),

  // Database Configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis Configuration
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS Configuration
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOKI_URL: z.string().optional(),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Cloud Provider Credentials
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),

  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),

  GCP_PROJECT_ID: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),

  // Encryption Keys
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').optional(),
  ENCRYPTION_IV: z.string().min(16, 'ENCRYPTION_IV must be at least 16 characters').optional(),

  // Webhook URLs
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  TEAMS_WEBHOOK_URL: z.string().url().optional(),

  // Feature Flags
  ENABLE_MFA: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AUDIT_LOGGING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_THREAT_INTEL: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WEBSOCKETS: z.string().transform(val => val === 'true').default('true'),

  // Demo Mode Configuration
  DEMO_MODE: z.string().transform(val => val === 'true').default('false'),
  DEMO_LIVE_ENRICHMENT: z.string().transform(val => val === 'true').default('false'),
  DEMO_SEED: z.string().transform(Number).optional(),
  DEMO_TIME_WARP_RATE: z.string().transform(Number).default('144'),

  // Compliance Settings
  ENABLE_PCI_COMPLIANCE: z.string().transform(val => val === 'true').default('false'),
  ENABLE_HIPAA_COMPLIANCE: z.string().transform(val => val === 'true').default('false'),
  ENABLE_SOX_COMPLIANCE: z.string().transform(val => val === 'true').default('false'),

  // MalGenX Service Configuration
  MALGENX_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  MALGENX_SERVICE_TIMEOUT_MS: z.string().transform(Number).default('30000'),
  MALGENX_API_KEY: z.string().min(32, 'MALGENX_API_KEY must be at least 32 characters').optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment configuration:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };
