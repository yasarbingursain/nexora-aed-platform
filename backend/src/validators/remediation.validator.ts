import { z } from 'zod';

/**
 * Remediation Validators
 * 
 * Zod schemas for remediation actions and playbooks
 */

// Action types
export const actionTypeSchema = z.enum([
  'rotate',
  'quarantine',
  'deception',
  'rollback',
  'notify',
  'block',
]);

// Action status
export const actionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

/**
 * Create Playbook Schema
 */
export const createPlaybookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  trigger: z.record(z.string(), z.any()).optional(),
  actions: z.array(z.object({
    type: actionTypeSchema,
    parameters: z.record(z.string(), z.any()).optional(),
  })),
  isActive: z.boolean().optional().default(true),
});

/**
 * Update Playbook Schema
 */
export const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  trigger: z.record(z.string(), z.any()).optional(),
  actions: z.array(z.object({
    type: actionTypeSchema,
    parameters: z.record(z.string(), z.any()).optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Execute Playbook Schema
 */
export const executePlaybookSchema = z.object({
  playbookId: z.string(),
  identityId: z.string().optional(),
  threatId: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  dryRun: z.boolean().optional().default(false),
});

/**
 * List Playbooks Query Schema
 */
export const listPlaybooksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  isActive: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
});

/**
 * List Actions Query Schema
 */
export const listActionsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  type: actionTypeSchema.optional(),
  status: actionStatusSchema.optional(),
  identityId: z.string().optional(),
  threatId: z.string().optional(),
  playbookId: z.string().optional(),
});

// Export types
export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;
export type ExecutePlaybookInput = z.infer<typeof executePlaybookSchema>;
export type ListPlaybooksQuery = z.infer<typeof listPlaybooksQuerySchema>;
export type ListActionsQuery = z.infer<typeof listActionsQuerySchema>;
