import { z } from 'zod';

/**
 * Identity Validators
 * 
 * Zod schemas for input validation
 * - Type-safe validation
 * - Clear error messages
 * - Reusable schemas
 */

// Identity types
export const identityTypeSchema = z.enum([
  'api_key',
  'service_account',
  'ssh_key',
  'certificate',
  'ai_agent',
  'bot',
]);

// Provider types
export const providerSchema = z.enum([
  'aws',
  'azure',
  'gcp',
  'github',
  'gitlab',
  'kubernetes',
  'custom',
]);

// Risk levels
export const riskLevelSchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

// Status
export const statusSchema = z.enum([
  'active',
  'inactive',
  'compromised',
  'quarantined',
]);

/**
 * Create Identity Schema
 */
export const createIdentitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  type: identityTypeSchema,
  provider: providerSchema,
  externalId: z.string().optional(),
  owner: z.string().email('Invalid email').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  tags: z.array(z.string()).optional(),
  credentials: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  rotationInterval: z.number().int().positive().optional(),
});

/**
 * Update Identity Schema
 */
export const updateIdentitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: statusSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  owner: z.string().email().optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  rotationInterval: z.number().int().positive().optional(),
});

/**
 * List Identities Query Schema
 */
export const listIdentitiesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  type: identityTypeSchema.optional(),
  provider: providerSchema.optional(),
  status: statusSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  owner: z.string().email().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastSeenAt', 'riskLevel']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Rotate Credentials Schema
 */
export const rotateCredentialsSchema = z.object({
  rotationStrategy: z.enum(['immediate', 'scheduled', 'gradual']).default('immediate'),
  notifyOwner: z.boolean().default(true),
  scheduledDate: z.string().datetime().optional(),
});

/**
 * Quarantine Identity Schema
 */
export const quarantineIdentitySchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
  notifyOwner: z.boolean().default(true),
});

/**
 * Discover Identities Schema
 */
export const discoverIdentitiesSchema = z.object({
  provider: providerSchema,
  credentials: z.record(z.string(), z.any()),
  regions: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

// Export types
export type CreateIdentityInput = z.infer<typeof createIdentitySchema>;
export type UpdateIdentityInput = z.infer<typeof updateIdentitySchema>;
export type ListIdentitiesQuery = z.infer<typeof listIdentitiesQuerySchema>;
export type RotateCredentialsInput = z.infer<typeof rotateCredentialsSchema>;
export type QuarantineIdentityInput = z.infer<typeof quarantineIdentitySchema>;
export type DiscoverIdentitiesInput = z.infer<typeof discoverIdentitiesSchema>;
