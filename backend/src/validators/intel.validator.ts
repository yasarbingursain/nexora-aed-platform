import { z } from 'zod';

/**
 * Threat Intel Validators
 * 
 * Zod schemas for threat intelligence sharing
 */

// IOC types
export const iocTypeSchema = z.enum([
  'ip',
  'domain',
  'url',
  'hash',
  'email',
  'file',
  'registry',
  'mutex',
]);

/**
 * Contribute IOC Schema
 */
export const contributeIocSchema = z.object({
  type: iocTypeSchema,
  value: z.string().min(1, 'Value is required'),
  description: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  firstSeen: z.string().datetime().optional(),
  lastSeen: z.string().datetime().optional(),
});

/**
 * Search Intel Query Schema
 */
export const searchIntelQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: iocTypeSchema.optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

// Export types
export type ContributeIocInput = z.infer<typeof contributeIocSchema>;
export type SearchIntelQuery = z.infer<typeof searchIntelQuerySchema>;
