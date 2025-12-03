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

// Trigger schema with strict validation
const triggerSchema = z.object({
  type: z.enum(['threat_detected', 'risk_threshold', 'schedule', 'manual']),
  conditions: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    category: z.string().optional(),
    riskScore: z.number().min(0).max(100).optional(),
  }).optional(),
  schedule: z.string().optional(), // Cron expression
}).strict();

// Action parameter schemas by type
const rotateParamsSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp', 'github', 'custom']),
  keyId: z.string().optional(),
  notifyOwner: z.boolean().default(true),
}).strict();

const quarantineParamsSchema = z.object({
  duration: z.number().int().positive().max(86400), // Max 24 hours in seconds
  reason: z.string().min(1).max(500),
  notifyOwner: z.boolean().default(true),
}).strict();

const notifyParamsSchema = z.object({
  recipients: z.array(z.string().email()).min(1).max(10),
  channel: z.enum(['email', 'sms', 'slack', 'webhook']),
  message: z.string().min(1).max(1000),
}).strict();

const blockParamsSchema = z.object({
  duration: z.number().int().positive().optional(),
  permanent: z.boolean().default(false),
  reason: z.string().min(1).max(500),
}).strict();

// Discriminated union for actions
const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rotate'),
    parameters: rotateParamsSchema,
  }),
  z.object({
    type: z.literal('quarantine'),
    parameters: quarantineParamsSchema,
  }),
  z.object({
    type: z.literal('notify'),
    parameters: notifyParamsSchema,
  }),
  z.object({
    type: z.literal('block'),
    parameters: blockParamsSchema,
  }),
  z.object({
    type: z.enum(['deception', 'rollback']),
    parameters: z.record(z.string(), z.any()).optional(),
  }),
]);

/**
 * Create Playbook Schema
 */
export const createPlaybookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  actions: z.array(actionSchema)
    .min(1, 'At least one action required')
    .max(20, 'Maximum 20 actions per playbook'),
  isActive: z.boolean().optional().default(true),
});

/**
 * Update Playbook Schema
 */
export const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  actions: z.array(actionSchema)
    .min(1, 'At least one action required')
    .max(20, 'Maximum 20 actions per playbook')
    .optional(),
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
