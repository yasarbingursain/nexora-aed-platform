import { z } from 'zod';
import { iocTypeSchema } from '@/validators/intel.validator';

/**
 * MalGenX Validators
 *
 * Zod schemas for malware sample analysis and IOC/threat queries.
 */

/**
 * SECURITY: SSRF protection for URL validation
 * Blocks private IP ranges and cloud metadata endpoints
 */
const ssrfSafeUrlSchema = z.string().url().refine((url) => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Block private IP ranges
    const hostname = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^127\./,                    // 127.0.0.0/8
      /^10\./,                     // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,               // 192.168.0.0/16
      /^169\.254\./,               // 169.254.0.0/16 (link-local)
      /^0\./,                      // 0.0.0.0/8
      /^localhost$/i,
      /^metadata\.google\.internal$/i,
      /^169\.254\.169\.254$/,      // AWS/Azure/GCP metadata
    ];
    
    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}, 'URL must be publicly accessible (private IPs and metadata endpoints blocked)');

export const submitSampleSchema = z.object({
  type: z.enum(['file', 'url']),
  url: ssrfSafeUrlSchema.optional(),
  fileId: z.string().min(1, 'fileId is required for file submissions').optional(),
  source: z.string().max(255).optional(),
  tags: z.array(z.string()).max(20).optional(),
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
