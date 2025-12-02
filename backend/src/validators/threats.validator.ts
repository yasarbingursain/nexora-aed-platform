import { z } from 'zod';

/**
 * Threat Validators
 * 
 * Zod schemas for threat detection and management
 */

// Severity levels
export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

// Status
export const threatStatusSchema = z.enum(['open', 'investigating', 'resolved', 'false_positive']);

// Category
export const categorySchema = z.enum([
  'credential_abuse',
  'privilege_escalation',
  'data_exfiltration',
  'unauthorized_access',
  'anomalous_behavior',
  'policy_violation',
  'malware',
  'phishing',
  'brute_force',
  'dos',
  'other',
]);

/**
 * Create Threat Schema
 */
export const createThreatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  severity: severitySchema,
  category: categorySchema,
  identityId: z.string().optional(),
  sourceIp: z.string().ip().optional().or(z.literal('')),
  indicators: z.array(z.string()).optional(),
  evidence: z.record(z.string(), z.any()).optional(),
  mitreTactics: z.array(z.string()).optional(),
  mitreId: z.string().optional(),
});

/**
 * Update Threat Schema
 */
export const updateThreatSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  severity: severitySchema.optional(),
  status: threatStatusSchema.optional(),
  category: categorySchema.optional(),
  assignedTo: z.string().email().optional(),
  sourceIp: z.string().ip().optional().or(z.literal('')),
  indicators: z.array(z.string()).optional(),
  evidence: z.record(z.string(), z.any()).optional(),
  mitreTactics: z.array(z.string()).optional(),
  mitreId: z.string().optional(),
});

/**
 * List Threats Query Schema
 */
export const listThreatsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  severity: severitySchema.optional(),
  status: threatStatusSchema.optional(),
  category: categorySchema.optional(),
  identityId: z.string().optional(),
  assignedTo: z.string().email().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Investigate Threat Schema
 */
export const investigateThreatSchema = z.object({
  notes: z.string().optional(),
  assignedTo: z.string().email().optional(),
});

/**
 * Remediate Threat Schema
 */
export const remediateThreatSchema = z.object({
  playbookId: z.string().optional(),
  action: z.enum(['quarantine', 'rotate', 'block', 'notify']),
  notes: z.string().optional(),
});

// Export types
export type CreateThreatInput = z.infer<typeof createThreatSchema>;
export type UpdateThreatInput = z.infer<typeof updateThreatSchema>;
export type ListThreatsQuery = z.infer<typeof listThreatsQuerySchema>;
export type InvestigateThreatInput = z.infer<typeof investigateThreatSchema>;
export type RemediateThreatInput = z.infer<typeof remediateThreatSchema>;
