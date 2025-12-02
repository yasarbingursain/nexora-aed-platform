import { z } from 'zod';
import { iocTypeSchema } from '@/validators/intel.validator';

/**
 * MalGenX Validators
 *
 * Zod schemas for malware sample analysis and IOC/threat queries.
 */

export const submitSampleSchema = z.object({
  type: z.enum(['file', 'url']),
  url: z.string().url().optional(),
  fileId: z.string().min(1, 'fileId is required for file submissions').optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
}).superRefine((value, ctx) => {
  if (value.type === 'url' && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'url is required when type is "url"',
      path: ['url'],
    });
  }
  if (value.type === 'file' && !value.fileId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'fileId is required when type is "file"',
      path: ['fileId'],
    });
  }
});

export const sampleIdParamsSchema = z.object({
  id: z.string().min(1, 'Sample ID is required'),
});

export const iocSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: iocTypeSchema.optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export const threatsFeedQuerySchema = z.object({
  sinceMinutes: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional()
    .default('100'),
});

export type SubmitSampleInput = z.infer<typeof submitSampleSchema>;
export type SampleIdParams = z.infer<typeof sampleIdParamsSchema>;
export type IocSearchInput = z.infer<typeof iocSearchSchema>;
export type ThreatsFeedQuery = z.infer<typeof threatsFeedQuerySchema>;
