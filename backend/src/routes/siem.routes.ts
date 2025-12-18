/**
 * SIEM Integration API Routes
 * Nexora AED Platform - Enterprise SIEM Compatibility
 * 
 * Endpoints for configuring and managing SIEM integrations:
 * - Splunk HEC
 * - Microsoft Sentinel
 * - Elastic SIEM
 * - IBM QRadar
 * - Generic Syslog (CEF/LEEF/RFC 5424)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { tenantMiddleware } from '@/middleware/tenant.middleware';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import {
  siemService,
  cefFormatter,
  leefFormatter,
  syslogFormatter,
  SiemEvent,
} from '@/services/integrations/siem.service';
import {
  testConnectivitySchema,
  sendEventsSchema,
  formatPreviewSchema,
  siemStatusQuerySchema,
  exportEventsQuerySchema,
} from '@/validators/siem.validator';

const router = Router();

// All SIEM routes require authentication and admin role
router.use(requireAuth);
router.use(tenantMiddleware);

// ============================================================================
// STATUS & CONFIGURATION
// ============================================================================

/**
 * GET /siem/status
 * Get current SIEM integration status
 */
router.get(
  '/status',
  requireRole(['admin', 'super_admin']),
  validateQuery(siemStatusQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.tenant?.organizationId || req.user?.organizationId;

      const configuredSiems = siemService.getConfiguredSiems();
      const isAnyConfigured = siemService.isAnyConfigured();

      // Get organization's SIEM configuration from database
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      let siemSettings = {};
      if (org?.settings) {
        try {
          const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings;
          siemSettings = settings.siem || {};
        } catch {
          siemSettings = {};
        }
      }

      res.json({
        success: true,
        data: {
          configured: isAnyConfigured,
          providers: configuredSiems,
          settings: siemSettings,
          environmentVariables: {
            syslog: {
              configured: !!process.env.SYSLOG_HOST,
              host: process.env.SYSLOG_HOST ? '***configured***' : null,
              port: process.env.SYSLOG_PORT || '514',
              protocol: process.env.SYSLOG_PROTOCOL || 'udp',
              format: process.env.SYSLOG_FORMAT || 'cef',
            },
            splunk: {
              configured: !!(process.env.SPLUNK_HEC_URL && process.env.SPLUNK_HEC_TOKEN),
              url: process.env.SPLUNK_HEC_URL ? '***configured***' : null,
              index: process.env.SPLUNK_INDEX || 'nexora_security',
            },
            sentinel: {
              configured: !!(process.env.SENTINEL_WORKSPACE_ID && process.env.SENTINEL_SHARED_KEY),
              workspaceId: process.env.SENTINEL_WORKSPACE_ID ? '***configured***' : null,
              logType: process.env.SENTINEL_LOG_TYPE || 'NexoraSecurityEvents',
            },
            elastic: {
              configured: !!(process.env.ELASTIC_URL && process.env.ELASTIC_API_KEY),
              url: process.env.ELASTIC_URL ? '***configured***' : null,
              index: process.env.ELASTIC_INDEX || 'nexora-security-events',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get SIEM status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get SIEM status',
      });
    }
  }
);

/**
 * POST /siem/test
 * Test SIEM connectivity
 */
router.post(
  '/test',
  requireRole(['admin', 'super_admin']),
  validate(testConnectivitySchema),
  async (req: Request, res: Response) => {
    try {
      const results = await siemService.testConnectivity();

      const allConnected = Object.values(results).every(r => r.connected);

      logger.info('SIEM connectivity test completed', {
        results,
        organizationId: req.tenant?.organizationId || req.user?.organizationId,
      });

      res.json({
        success: true,
        data: {
          allConnected,
          results,
          testedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('SIEM connectivity test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'SIEM connectivity test failed',
      });
    }
  }
);

// ============================================================================
// EVENT FORWARDING
// ============================================================================

/**
 * POST /siem/events
 * Send events to configured SIEMs
 */
router.post(
  '/events',
  requireRole(['admin', 'super_admin', 'analyst']),
  validate(sendEventsSchema),
  async (req: Request, res: Response) => {
    try {
      const { events } = req.body;
      const organizationId = req.tenant?.organizationId || req.user?.organizationId;

      // Convert input events to SiemEvent format
      const siemEvents: SiemEvent[] = events.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
        organizationId: e.organizationId || organizationId,
      }));

      const result = await siemService.sendEvents(siemEvents);

      logger.info('SIEM events sent', {
        eventsProcessed: result.eventsProcessed,
        eventsFailed: result.eventsFailed,
        organizationId,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to send SIEM events', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to send SIEM events',
      });
    }
  }
);

/**
 * POST /siem/forward/threat
 * Forward a specific threat to SIEM
 */
router.post(
  '/forward/threat/:threatId',
  requireRole(['admin', 'super_admin', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const { threatId } = req.params;
      const organizationId = req.tenant?.organizationId || req.user?.organizationId;

      // Fetch threat from database
      const threat = await prisma.threat.findFirst({
        where: {
          id: threatId,
          organizationId,
        },
        include: {
          identity: true,
        },
      });

      if (!threat) {
        return res.status(404).json({
          success: false,
          error: 'Threat not found',
        });
      }

      // Convert to SIEM event
      const siemEvent: SiemEvent = {
        id: threat.id,
        timestamp: threat.createdAt,
        severity: threat.severity as 'low' | 'medium' | 'high' | 'critical',
        category: threat.category,
        eventType: 'threat_detected',
        source: 'nexora',
        sourceIp: threat.sourceIp || undefined,
        identityId: threat.identityId || undefined,
        identityName: threat.identity?.name,
        organizationId: threat.organizationId,
        title: threat.title,
        description: threat.description,
        mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',') : undefined,
        mitreTechniques: threat.mitreId ? [threat.mitreId] : undefined,
        indicators: threat.indicators ? JSON.parse(threat.indicators) : undefined,
      };

      const result = await siemService.sendEvents([siemEvent]);

      logger.info('Threat forwarded to SIEM', {
        threatId,
        result,
        organizationId,
      });

      res.json({
        success: result.success,
        data: {
          threatId,
          ...result,
        },
      });
    } catch (error) {
      logger.error('Failed to forward threat to SIEM', {
        error: error instanceof Error ? error.message : 'Unknown error',
        threatId: req.params.threatId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to forward threat to SIEM',
      });
    }
  }
);

/**
 * POST /siem/forward/incident/:incidentId
 * Forward an incident to SIEM
 */
router.post(
  '/forward/incident/:incidentId',
  requireRole(['admin', 'super_admin', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const organizationId = req.tenant?.organizationId || req.user?.organizationId;

      const incident = await prisma.incident.findFirst({
        where: {
          id: incidentId,
          organizationId,
        },
        include: {
          threats: {
            include: {
              identity: true,
            },
          },
        },
      });

      if (!incident) {
        return res.status(404).json({
          success: false,
          error: 'Incident not found',
        });
      }

      // Create SIEM events for incident and all related threats
      const siemEvents: SiemEvent[] = [
        {
          id: incident.id,
          timestamp: incident.createdAt,
          severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
          category: 'incident',
          eventType: 'incident_created',
          source: 'nexora',
          organizationId: incident.organizationId,
          title: incident.title,
          description: incident.description,
        },
        ...incident.threats.map(threat => ({
          id: threat.id,
          timestamp: threat.createdAt,
          severity: threat.severity as 'low' | 'medium' | 'high' | 'critical',
          category: threat.category,
          eventType: 'threat_detected',
          source: 'nexora',
          sourceIp: threat.sourceIp || undefined,
          identityId: threat.identityId || undefined,
          identityName: threat.identity?.name,
          organizationId: threat.organizationId,
          title: threat.title,
          description: threat.description,
          mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',') : undefined,
          mitreTechniques: threat.mitreId ? [threat.mitreId] : undefined,
        })),
      ];

      const result = await siemService.sendEvents(siemEvents);

      logger.info('Incident forwarded to SIEM', {
        incidentId,
        threatCount: incident.threats.length,
        result,
        organizationId,
      });

      res.json({
        success: result.success,
        data: {
          incidentId,
          threatCount: incident.threats.length,
          ...result,
        },
      });
    } catch (error) {
      logger.error('Failed to forward incident to SIEM', {
        error: error instanceof Error ? error.message : 'Unknown error',
        incidentId: req.params.incidentId,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to forward incident to SIEM',
      });
    }
  }
);

// ============================================================================
// FORMAT PREVIEW & EXPORT
// ============================================================================

/**
 * POST /siem/preview
 * Preview event in different SIEM formats
 */
router.post(
  '/preview',
  requireRole(['admin', 'super_admin', 'analyst']),
  validate(formatPreviewSchema),
  async (req: Request, res: Response) => {
    try {
      const { event, format } = req.body;

      const siemEvent: SiemEvent = {
        ...event,
        timestamp: new Date(event.timestamp),
      };

      let formatted: string;
      switch (format) {
        case 'cef':
          formatted = cefFormatter.format(siemEvent);
          break;
        case 'leef':
          formatted = leefFormatter.format(siemEvent);
          break;
        case 'syslog':
          formatted = syslogFormatter.format(siemEvent);
          break;
        case 'json':
          formatted = JSON.stringify(siemEvent, null, 2);
          break;
        default:
          formatted = cefFormatter.format(siemEvent);
      }

      res.json({
        success: true,
        data: {
          format,
          formatted,
          rawEvent: siemEvent,
        },
      });
    } catch (error) {
      logger.error('Failed to preview SIEM format', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to preview SIEM format',
      });
    }
  }
);

/**
 * GET /siem/export
 * Export recent events in specified format
 */
router.get(
  '/export',
  requireRole(['admin', 'super_admin', 'analyst']),
  validateQuery(exportEventsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.tenant?.organizationId || req.user?.organizationId;
      const {
        format = 'cef',
        startDate,
        endDate,
        severity,
        category,
        limit = 100,
      } = req.query;

      // Build query filters
      const where: any = { organizationId };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }
      if (severity) where.severity = severity;
      if (category) where.category = category;

      // Fetch threats
      const threats = await prisma.threat.findMany({
        where,
        include: { identity: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      // Convert to SIEM events and format
      const formattedEvents = threats.map(threat => {
        const siemEvent: SiemEvent = {
          id: threat.id,
          timestamp: threat.createdAt,
          severity: threat.severity as 'low' | 'medium' | 'high' | 'critical',
          category: threat.category,
          eventType: 'threat_detected',
          source: 'nexora',
          sourceIp: threat.sourceIp || undefined,
          identityId: threat.identityId || undefined,
          identityName: threat.identity?.name,
          organizationId: threat.organizationId,
          title: threat.title,
          description: threat.description,
          mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',') : undefined,
          mitreTechniques: threat.mitreId ? [threat.mitreId] : undefined,
        };

        switch (format) {
          case 'cef':
            return cefFormatter.format(siemEvent);
          case 'leef':
            return leefFormatter.format(siemEvent);
          case 'syslog':
            return syslogFormatter.format(siemEvent);
          case 'json':
            return JSON.stringify(siemEvent);
          default:
            return cefFormatter.format(siemEvent);
        }
      });

      // Set appropriate content type
      const contentType = format === 'json' ? 'application/json' : 'text/plain';
      const filename = `nexora-events-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'log'}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format === 'json') {
        res.send(JSON.stringify(formattedEvents.map(e => JSON.parse(e)), null, 2));
      } else {
        res.send(formattedEvents.join('\n'));
      }
    } catch (error) {
      logger.error('Failed to export SIEM events', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Failed to export SIEM events',
      });
    }
  }
);

// ============================================================================
// SUPPORTED FORMATS INFO
// ============================================================================

/**
 * GET /siem/formats
 * Get information about supported SIEM formats
 */
router.get(
  '/formats',
  async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        formats: [
          {
            id: 'cef',
            name: 'Common Event Format (CEF)',
            description: 'ArcSight CEF format, widely supported by most SIEMs',
            supportedBy: ['Splunk', 'QRadar', 'ArcSight', 'LogRhythm', 'Sumo Logic'],
            example: 'CEF:0|Nexora|AED Platform|1.0|100|Threat Detected|7|src=192.168.1.1 dst=10.0.0.1',
          },
          {
            id: 'leef',
            name: 'Log Event Extended Format (LEEF)',
            description: 'IBM QRadar native format',
            supportedBy: ['IBM QRadar'],
            example: 'LEEF:2.0|Nexora|AED Platform|1.0|ThreatDetected|cat=security\tsev=7',
          },
          {
            id: 'syslog',
            name: 'RFC 5424 Syslog',
            description: 'Standard syslog format with structured data',
            supportedBy: ['Any syslog-compatible system'],
            example: '<134>1 2024-01-15T10:30:00Z nexora-platform nexora-aed 1234 THREAT-DETECTED [nexora@52000 id="abc123"]',
          },
          {
            id: 'json',
            name: 'JSON',
            description: 'Native JSON format for modern SIEM platforms',
            supportedBy: ['Elastic SIEM', 'Splunk', 'Microsoft Sentinel', 'Datadog'],
            example: '{"event_id": "abc123", "severity": "high", "category": "threat"}',
          },
        ],
        transports: [
          { id: 'udp', name: 'UDP', port: 514, description: 'Fast, connectionless (may lose events)' },
          { id: 'tcp', name: 'TCP', port: 514, description: 'Reliable, connection-oriented' },
          { id: 'tls', name: 'TLS/SSL', port: 6514, description: 'Encrypted TCP connection' },
          { id: 'http', name: 'HTTP', port: 80, description: 'REST API over HTTP' },
          { id: 'https', name: 'HTTPS', port: 443, description: 'REST API over HTTPS (recommended)' },
        ],
        providers: [
          {
            id: 'splunk',
            name: 'Splunk',
            description: 'Splunk HTTP Event Collector (HEC)',
            configRequired: ['SPLUNK_HEC_URL', 'SPLUNK_HEC_TOKEN'],
            formats: ['json', 'cef'],
          },
          {
            id: 'sentinel',
            name: 'Microsoft Sentinel',
            description: 'Azure Log Analytics Data Collector API',
            configRequired: ['SENTINEL_WORKSPACE_ID', 'SENTINEL_SHARED_KEY'],
            formats: ['json'],
          },
          {
            id: 'elastic',
            name: 'Elastic SIEM',
            description: 'Elasticsearch bulk API',
            configRequired: ['ELASTIC_URL', 'ELASTIC_API_KEY'],
            formats: ['json'],
          },
          {
            id: 'qradar',
            name: 'IBM QRadar',
            description: 'Syslog with LEEF format',
            configRequired: ['SYSLOG_HOST', 'SYSLOG_PORT'],
            formats: ['leef', 'cef'],
          },
          {
            id: 'syslog',
            name: 'Generic Syslog',
            description: 'Any syslog-compatible SIEM',
            configRequired: ['SYSLOG_HOST', 'SYSLOG_PORT'],
            formats: ['cef', 'leef', 'syslog'],
          },
        ],
      },
    });
  }
);

export default router;
