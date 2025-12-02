import { z } from 'zod';

/**
 * Compliance Validators
 * 
 * Zod schemas for compliance reporting
 */

// Framework types
export const frameworkSchema = z.enum([
  'soc2',
  'iso27001',
  'pci_dss',
  'hipaa',
  'gdpr',
  'nist',
  'ccpa',
]);

// Report types
export const reportTypeSchema = z.enum([
  'audit',
  'assessment',
  'evidence',
  'summary',
]);

// Report status
export const reportStatusSchema = z.enum([
  'generating',
  'completed',
  'failed',
]);

/**
 * Generate Report Schema
 */
export const generateReportSchema = z.object({
  framework: frameworkSchema,
  reportType: reportTypeSchema,
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeEvidence: z.boolean().optional().default(true),
  format: z.enum(['json', 'pdf', 'csv']).optional().default('json'),
});

/**
 * List Reports Query Schema
 */
export const listReportsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  framework: frameworkSchema.optional(),
  reportType: reportTypeSchema.optional(),
  status: reportStatusSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// Export types
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
