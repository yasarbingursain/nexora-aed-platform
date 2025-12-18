/**
 * SIEM Integration Validators
 * Nexora AED Platform - Enterprise SIEM Compatibility
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// SIEM CONFIGURATION SCHEMAS
// ============================================================================

export const siemProviderSchema = z.enum([
  'splunk',
  'sentinel',
  'elastic',
  'qradar',
  'arcsight',
  'syslog',
]);

export const siemFormatSchema = z.enum([
  'cef',
  'leef',
  'json',
  'syslog',
]);

export const siemTransportSchema = z.enum([
  'udp',
  'tcp',
  'tls',
  'http',
  'https',
]);

export const severitySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

// ============================================================================
// SIEM CONFIGURATION VALIDATION
// ============================================================================

export const syslogConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: siemTransportSchema,
  format: siemFormatSchema,
  facility: z.number().int().min(0).max(23).optional(),
  appName: z.string().min(1).max(48).optional(),
  verifySsl: z.boolean().optional(),
}).strict();

export const splunkConfigSchema = z.object({
  enabled: z.boolean(),
  hecUrl: z.string().url(),
  hecToken: z.string().min(1),
  index: z.string().min(1).max(100).optional(),
  sourcetype: z.string().min(1).max(100).optional(),
  verifySsl: z.boolean().optional(),
}).strict();

export const sentinelConfigSchema = z.object({
  enabled: z.boolean(),
  workspaceId: z.string().uuid(),
  sharedKey: z.string().min(1),
  logType: z.string().min(1).max(100).optional(),
}).strict();

export const elasticConfigSchema = z.object({
  enabled: z.boolean(),
  url: z.string().url(),
  apiKey: z.string().min(1),
  index: z.string().min(1).max(100).optional(),
  verifySsl: z.boolean().optional(),
}).strict();

export const qradarConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['udp', 'tcp', 'tls']),
  format: z.enum(['leef', 'cef']),
  verifySsl: z.boolean().optional(),
}).strict();

// Combined SIEM configuration
export const siemConfigSchema = z.object({
  syslog: syslogConfigSchema.optional(),
  splunk: splunkConfigSchema.optional(),
  sentinel: sentinelConfigSchema.optional(),
  elastic: elasticConfigSchema.optional(),
  qradar: qradarConfigSchema.optional(),
  batchSize: z.number().int().min(1).max(1000).optional(),
  flushIntervalMs: z.number().int().min(1000).max(60000).optional(),
}).strict();

// ============================================================================
// SIEM EVENT VALIDATION
// ============================================================================

export const siemEventSchema = z.object({
  id: z.string().min(1).max(100),
  timestamp: z.string().datetime().or(z.date()),
  severity: severitySchema,
  category: z.string().min(1).max(100),
  eventType: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  sourceIp: z.string().ip().optional(),
  destinationIp: z.string().ip().optional(),
  user: z.string().max(255).optional(),
  identityId: z.string().max(100).optional(),
  identityName: z.string().max(255).optional(),
  organizationId: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  rawData: z.record(z.unknown()).optional(),
  mitreTactics: z.array(z.string()).optional(),
  mitreTechniques: z.array(z.string()).optional(),
  indicators: z.array(z.string()).optional(),
  riskScore: z.number().min(0).max(100).optional(),
}).strict();

export const siemEventsArraySchema = z.array(siemEventSchema).min(1).max(1000);

// ============================================================================
// API REQUEST VALIDATION
// ============================================================================

export const testConnectivitySchema = z.object({
  provider: siemProviderSchema.optional(),
}).strict();

export const sendEventsSchema = z.object({
  events: siemEventsArraySchema,
  providers: z.array(siemProviderSchema).optional(),
}).strict();

export const updateConfigSchema = z.object({
  provider: siemProviderSchema,
  config: z.union([
    syslogConfigSchema,
    splunkConfigSchema,
    sentinelConfigSchema,
    elasticConfigSchema,
    qradarConfigSchema,
  ]),
}).strict();

export const formatPreviewSchema = z.object({
  event: siemEventSchema,
  format: siemFormatSchema,
}).strict();

// ============================================================================
// QUERY PARAMETER VALIDATION
// ============================================================================

export const siemStatusQuerySchema = z.object({
  provider: siemProviderSchema.optional(),
}).strict();

export const exportEventsQuerySchema = z.object({
  format: siemFormatSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  severity: severitySchema.optional(),
  category: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
}).strict();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SiemProvider = z.infer<typeof siemProviderSchema>;
export type SiemFormat = z.infer<typeof siemFormatSchema>;
export type SiemTransport = z.infer<typeof siemTransportSchema>;
export type SyslogConfig = z.infer<typeof syslogConfigSchema>;
export type SplunkConfig = z.infer<typeof splunkConfigSchema>;
export type SentinelConfig = z.infer<typeof sentinelConfigSchema>;
export type ElasticConfig = z.infer<typeof elasticConfigSchema>;
export type QRadarConfig = z.infer<typeof qradarConfigSchema>;
export type SiemConfig = z.infer<typeof siemConfigSchema>;
export type SiemEventInput = z.infer<typeof siemEventSchema>;
