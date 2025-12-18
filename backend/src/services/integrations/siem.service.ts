/**
 * Enterprise SIEM Integration Service
 * Nexora AED Platform - Universal SIEM Compatibility
 * 
 * Standards Compliance:
 * - RFC 5424 (Syslog Protocol)
 * - CEF (Common Event Format) - ArcSight, Splunk, QRadar
 * - LEEF (Log Event Extended Format) - IBM QRadar
 * - OCSF (Open Cybersecurity Schema Framework)
 * 
 * Supported SIEM Platforms:
 * - Splunk (HEC - HTTP Event Collector)
 * - IBM QRadar (Syslog, LEEF)
 * - Microsoft Sentinel (Data Collector API)
 * - Elastic SIEM (Elasticsearch)
 * - ArcSight (CEF over Syslog)
 * - Generic Syslog (RFC 5424)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SiemEvent {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  eventType: string;
  source: string;
  sourceIp?: string;
  destinationIp?: string;
  user?: string;
  identityId?: string;
  identityName?: string;
  organizationId: string;
  title: string;
  description: string;
  rawData?: Record<string, unknown>;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  indicators?: string[];
  riskScore?: number;
}

export interface SiemConfig {
  enabled: boolean;
  format: 'cef' | 'leef' | 'json' | 'syslog';
  transport: 'udp' | 'tcp' | 'tls' | 'http' | 'https';
  host: string;
  port: number;
  facility?: number;
  appName?: string;
  token?: string;
  apiKey?: string;
  workspaceId?: string;
  sharedKey?: string;
  index?: string;
  sourcetype?: string;
  verifySsl?: boolean;
  batchSize?: number;
  flushIntervalMs?: number;
}

export interface SiemResult {
  success: boolean;
  eventsProcessed: number;
  eventsFailed: number;
  errors?: string[];
  timestamp: Date;
}

// ============================================================================
// SEVERITY MAPPINGS
// ============================================================================

const CEF_SEVERITY_MAP: Record<string, number> = {
  low: 3,
  medium: 5,
  high: 7,
  critical: 10,
};

const SYSLOG_SEVERITY_MAP: Record<string, number> = {
  critical: 2, // Critical
  high: 3,     // Error
  medium: 4,   // Warning
  low: 6,      // Informational
};

const LEEF_SEVERITY_MAP: Record<string, number> = {
  low: 1,
  medium: 5,
  high: 8,
  critical: 10,
};

// ============================================================================
// CEF FORMATTER (Common Event Format)
// ============================================================================

export class CefFormatter {
  private vendor = 'Nexora';
  private product = 'AED Platform';
  private version = '1.0';

  format(event: SiemEvent): string {
    const severity = CEF_SEVERITY_MAP[event.severity] || 5;
    const signatureId = this.getSignatureId(event.eventType);
    const name = this.sanitize(event.title);
    
    const extension = this.buildExtension(event);
    
    return `CEF:0|${this.vendor}|${this.product}|${this.version}|${signatureId}|${name}|${severity}|${extension}`;
  }

  private getSignatureId(eventType: string): string {
    const signatureMap: Record<string, string> = {
      'threat_detected': '100',
      'identity_compromised': '101',
      'credential_abuse': '102',
      'privilege_escalation': '103',
      'data_exfiltration': '104',
      'anomaly_detected': '105',
      'malware_detected': '106',
      'policy_violation': '107',
      'authentication_failure': '108',
      'unauthorized_access': '109',
      'osint_threat': '110',
      'remediation_executed': '200',
      'quarantine_applied': '201',
      'credential_rotated': '202',
    };
    return signatureMap[eventType] || '999';
  }

  private buildExtension(event: SiemEvent): string {
    const fields: string[] = [];
    
    fields.push(`rt=${event.timestamp.getTime()}`);
    fields.push(`cat=${this.sanitize(event.category)}`);
    fields.push(`msg=${this.sanitize(event.description)}`);
    
    if (event.sourceIp) fields.push(`src=${event.sourceIp}`);
    if (event.destinationIp) fields.push(`dst=${event.destinationIp}`);
    if (event.user) fields.push(`suser=${this.sanitize(event.user)}`);
    if (event.identityId) fields.push(`cs1=${event.identityId} cs1Label=IdentityId`);
    if (event.identityName) fields.push(`cs2=${this.sanitize(event.identityName)} cs2Label=IdentityName`);
    if (event.organizationId) fields.push(`cs3=${event.organizationId} cs3Label=OrganizationId`);
    if (event.riskScore !== undefined) fields.push(`cn1=${event.riskScore} cn1Label=RiskScore`);
    
    if (event.mitreTactics?.length) {
      fields.push(`cs4=${event.mitreTactics.join(',')} cs4Label=MitreTactics`);
    }
    if (event.mitreTechniques?.length) {
      fields.push(`cs5=${event.mitreTechniques.join(',')} cs5Label=MitreTechniques`);
    }
    if (event.indicators?.length) {
      fields.push(`cs6=${event.indicators.slice(0, 5).join(',')} cs6Label=Indicators`);
    }
    
    fields.push(`externalId=${event.id}`);
    fields.push(`deviceVendor=${this.vendor}`);
    fields.push(`deviceProduct=${this.product}`);
    
    return fields.join(' ');
  }

  private sanitize(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }
}

// ============================================================================
// LEEF FORMATTER (Log Event Extended Format - IBM QRadar)
// ============================================================================

export class LeefFormatter {
  private vendor = 'Nexora';
  private product = 'AED Platform';
  private version = '1.0';

  format(event: SiemEvent): string {
    const eventId = this.getEventId(event.eventType);
    const attributes = this.buildAttributes(event);
    
    return `LEEF:2.0|${this.vendor}|${this.product}|${this.version}|${eventId}|${attributes}`;
  }

  private getEventId(eventType: string): string {
    const eventMap: Record<string, string> = {
      'threat_detected': 'ThreatDetected',
      'identity_compromised': 'IdentityCompromised',
      'credential_abuse': 'CredentialAbuse',
      'privilege_escalation': 'PrivilegeEscalation',
      'data_exfiltration': 'DataExfiltration',
      'anomaly_detected': 'AnomalyDetected',
      'malware_detected': 'MalwareDetected',
      'policy_violation': 'PolicyViolation',
      'authentication_failure': 'AuthenticationFailure',
      'unauthorized_access': 'UnauthorizedAccess',
      'osint_threat': 'OsintThreat',
      'remediation_executed': 'RemediationExecuted',
    };
    return eventMap[eventType] || 'SecurityEvent';
  }

  private buildAttributes(event: SiemEvent): string {
    const attrs: string[] = [];
    const delimiter = '\t';
    
    attrs.push(`devTime=${event.timestamp.toISOString()}`);
    attrs.push(`devTimeFormat=yyyy-MM-dd'T'HH:mm:ss.SSSXXX`);
    attrs.push(`cat=${event.category}`);
    attrs.push(`sev=${LEEF_SEVERITY_MAP[event.severity] || 5}`);
    attrs.push(`msg=${this.sanitize(event.description)}`);
    
    if (event.sourceIp) attrs.push(`src=${event.sourceIp}`);
    if (event.destinationIp) attrs.push(`dst=${event.destinationIp}`);
    if (event.user) attrs.push(`usrName=${this.sanitize(event.user)}`);
    if (event.identityId) attrs.push(`identityId=${event.identityId}`);
    if (event.identityName) attrs.push(`identityName=${this.sanitize(event.identityName)}`);
    if (event.organizationId) attrs.push(`orgId=${event.organizationId}`);
    if (event.riskScore !== undefined) attrs.push(`riskScore=${event.riskScore}`);
    
    if (event.mitreTactics?.length) {
      attrs.push(`mitreTactics=${event.mitreTactics.join(',')}`);
    }
    if (event.mitreTechniques?.length) {
      attrs.push(`mitreTechniques=${event.mitreTechniques.join(',')}`);
    }
    
    attrs.push(`externalId=${event.id}`);
    
    return attrs.join(delimiter);
  }

  private sanitize(value: string): string {
    return value
      .replace(/\t/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }
}

// ============================================================================
// SYSLOG FORMATTER (RFC 5424)
// ============================================================================

export class SyslogFormatter {
  private appName: string;
  private facility: number;

  constructor(appName = 'nexora-aed', facility = 16) { // 16 = local0
    this.appName = appName;
    this.facility = facility;
  }

  format(event: SiemEvent): string {
    const severity = SYSLOG_SEVERITY_MAP[event.severity] || 6;
    const priority = (this.facility * 8) + severity;
    const version = 1;
    const timestamp = event.timestamp.toISOString();
    const hostname = process.env.HOSTNAME || 'nexora-platform';
    const procId = process.pid.toString();
    const msgId = event.eventType.toUpperCase().replace(/_/g, '-');
    
    const structuredData = this.buildStructuredData(event);
    const message = `${event.title}: ${event.description}`;
    
    return `<${priority}>${version} ${timestamp} ${hostname} ${this.appName} ${procId} ${msgId} ${structuredData} ${message}`;
  }

  private buildStructuredData(event: SiemEvent): string {
    const sdElements: string[] = [];
    
    // Nexora-specific structured data
    const nexoraParams: string[] = [
      `id="${event.id}"`,
      `cat="${event.category}"`,
      `sev="${event.severity}"`,
      `org="${event.organizationId}"`,
    ];
    
    if (event.sourceIp) nexoraParams.push(`src="${event.sourceIp}"`);
    if (event.identityId) nexoraParams.push(`identityId="${event.identityId}"`);
    if (event.riskScore !== undefined) nexoraParams.push(`risk="${event.riskScore}"`);
    
    sdElements.push(`[nexora@52000 ${nexoraParams.join(' ')}]`);
    
    // MITRE ATT&CK structured data
    if (event.mitreTactics?.length || event.mitreTechniques?.length) {
      const mitreParams: string[] = [];
      if (event.mitreTactics?.length) {
        mitreParams.push(`tactics="${event.mitreTactics.join(',')}"`);
      }
      if (event.mitreTechniques?.length) {
        mitreParams.push(`techniques="${event.mitreTechniques.join(',')}"`);
      }
      sdElements.push(`[mitre@52000 ${mitreParams.join(' ')}]`);
    }
    
    return sdElements.length > 0 ? sdElements.join('') : '-';
  }
}

// ============================================================================
// SPLUNK HEC CONNECTOR
// ============================================================================

export class SplunkHecConnector {
  private config: {
    url: string;
    token: string;
    index: string;
    sourcetype: string;
    verifySsl: boolean;
  };

  constructor() {
    this.config = {
      url: process.env.SPLUNK_HEC_URL || '',
      token: process.env.SPLUNK_HEC_TOKEN || '',
      index: process.env.SPLUNK_INDEX || 'nexora_security',
      sourcetype: process.env.SPLUNK_SOURCETYPE || 'nexora:security:events',
      verifySsl: process.env.SPLUNK_VERIFY_SSL !== 'false',
    };
  }

  isConfigured(): boolean {
    return !!(this.config.url && this.config.token);
  }

  async sendEvents(events: SiemEvent[]): Promise<SiemResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        eventsProcessed: 0,
        eventsFailed: events.length,
        errors: ['Splunk HEC not configured'],
        timestamp: new Date(),
      };
    }

    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Batch events for efficiency
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const payload = batch.map(event => this.formatEvent(event)).join('\n');

      try {
        const response = await fetch(`${this.config.url}/services/collector/event`, {
          method: 'POST',
          headers: {
            'Authorization': `Splunk ${this.config.token}`,
            'Content-Type': 'application/json',
          },
          body: payload,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Splunk HEC error: ${response.status} - ${errorText}`);
        }

        processed += batch.length;
        logger.debug('Splunk HEC batch sent', { count: batch.length });
      } catch (error) {
        failed += batch.length;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
        logger.error('Splunk HEC batch failed', { error: errorMsg, batchSize: batch.length });
      }
    }

    return {
      success: failed === 0,
      eventsProcessed: processed,
      eventsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date(),
    };
  }

  private formatEvent(event: SiemEvent): string {
    const hecEvent = {
      time: Math.floor(event.timestamp.getTime() / 1000),
      host: process.env.HOSTNAME || 'nexora-platform',
      source: 'nexora:aed',
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      event: {
        event_id: event.id,
        timestamp: event.timestamp.toISOString(),
        severity: event.severity,
        category: event.category,
        event_type: event.eventType,
        source: event.source,
        title: event.title,
        description: event.description,
        organization_id: event.organizationId,
        source_ip: event.sourceIp,
        destination_ip: event.destinationIp,
        user: event.user,
        identity_id: event.identityId,
        identity_name: event.identityName,
        risk_score: event.riskScore,
        mitre_tactics: event.mitreTactics,
        mitre_techniques: event.mitreTechniques,
        indicators: event.indicators,
        raw_data: event.rawData,
      },
    };

    return JSON.stringify(hecEvent);
  }
}

// ============================================================================
// MICROSOFT SENTINEL CONNECTOR (Log Analytics Data Collector API)
// ============================================================================

export class SentinelConnector {
  private config: {
    workspaceId: string;
    sharedKey: string;
    logType: string;
  };

  constructor() {
    this.config = {
      workspaceId: process.env.SENTINEL_WORKSPACE_ID || '',
      sharedKey: process.env.SENTINEL_SHARED_KEY || '',
      logType: process.env.SENTINEL_LOG_TYPE || 'NexoraSecurityEvents',
    };
  }

  isConfigured(): boolean {
    return !!(this.config.workspaceId && this.config.sharedKey);
  }

  async sendEvents(events: SiemEvent[]): Promise<SiemResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        eventsProcessed: 0,
        eventsFailed: events.length,
        errors: ['Microsoft Sentinel not configured'],
        timestamp: new Date(),
      };
    }

    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Format events for Sentinel
    const formattedEvents = events.map(event => this.formatEvent(event));
    const body = JSON.stringify(formattedEvents);
    const contentLength = Buffer.byteLength(body, 'utf8');
    const dateString = new Date().toUTCString();

    try {
      const signature = this.buildSignature(dateString, contentLength, 'POST', 'application/json');
      const url = `https://${this.config.workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Log-Type': this.config.logType,
          'x-ms-date': dateString,
          'Authorization': signature,
          'time-generated-field': 'timestamp',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sentinel API error: ${response.status} - ${errorText}`);
      }

      processed = events.length;
      logger.info('Sentinel events sent', { count: events.length });
    } catch (error) {
      failed = events.length;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error('Sentinel send failed', { error: errorMsg });
    }

    return {
      success: failed === 0,
      eventsProcessed: processed,
      eventsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date(),
    };
  }

  private buildSignature(date: string, contentLength: number, method: string, contentType: string): string {
    const xHeaders = `x-ms-date:${date}`;
    const stringToHash = `${method}\n${contentLength}\n${contentType}\n${xHeaders}\n/api/logs`;
    const bytesToHash = Buffer.from(stringToHash, 'utf8');
    const decodedKey = Buffer.from(this.config.sharedKey, 'base64');
    const hmac = crypto.createHmac('sha256', decodedKey);
    hmac.update(bytesToHash);
    const encodedHash = hmac.digest('base64');
    return `SharedKey ${this.config.workspaceId}:${encodedHash}`;
  }

  private formatEvent(event: SiemEvent): Record<string, unknown> {
    return {
      TimeGenerated: event.timestamp.toISOString(),
      EventId: event.id,
      Severity: event.severity,
      Category: event.category,
      EventType: event.eventType,
      Source: event.source,
      Title: event.title,
      Description: event.description,
      OrganizationId: event.organizationId,
      SourceIP: event.sourceIp,
      DestinationIP: event.destinationIp,
      User: event.user,
      IdentityId: event.identityId,
      IdentityName: event.identityName,
      RiskScore: event.riskScore,
      MitreTactics: event.mitreTactics?.join(','),
      MitreTechniques: event.mitreTechniques?.join(','),
      Indicators: event.indicators?.join(','),
    };
  }
}

// ============================================================================
// ELASTIC SIEM CONNECTOR
// ============================================================================

export class ElasticConnector {
  private config: {
    url: string;
    apiKey: string;
    index: string;
    verifySsl: boolean;
  };

  constructor() {
    this.config = {
      url: process.env.ELASTIC_URL || '',
      apiKey: process.env.ELASTIC_API_KEY || '',
      index: process.env.ELASTIC_INDEX || 'nexora-security-events',
      verifySsl: process.env.ELASTIC_VERIFY_SSL !== 'false',
    };
  }

  isConfigured(): boolean {
    return !!(this.config.url && this.config.apiKey);
  }

  async sendEvents(events: SiemEvent[]): Promise<SiemResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        eventsProcessed: 0,
        eventsFailed: events.length,
        errors: ['Elastic SIEM not configured'],
        timestamp: new Date(),
      };
    }

    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Build bulk request body
    const bulkBody = events.flatMap(event => [
      JSON.stringify({ index: { _index: this.config.index } }),
      JSON.stringify(this.formatEvent(event)),
    ]).join('\n') + '\n';

    try {
      const response = await fetch(`${this.config.url}/_bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${this.config.apiKey}`,
          'Content-Type': 'application/x-ndjson',
        },
        body: bulkBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Elastic API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as { errors: boolean; items: Array<{ index: { status: number } }> };
      
      if (result.errors) {
        result.items.forEach((item, idx) => {
          if (item.index.status >= 400) {
            failed++;
            errors.push(`Event ${idx} failed with status ${item.index.status}`);
          } else {
            processed++;
          }
        });
      } else {
        processed = events.length;
      }

      logger.info('Elastic events sent', { processed, failed });
    } catch (error) {
      failed = events.length;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error('Elastic send failed', { error: errorMsg });
    }

    return {
      success: failed === 0,
      eventsProcessed: processed,
      eventsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date(),
    };
  }

  private formatEvent(event: SiemEvent): Record<string, unknown> {
    return {
      '@timestamp': event.timestamp.toISOString(),
      event: {
        id: event.id,
        kind: 'alert',
        category: [event.category],
        type: [event.eventType],
        severity: CEF_SEVERITY_MAP[event.severity] || 5,
        risk_score: event.riskScore,
        original: event.title,
      },
      message: event.description,
      source: {
        ip: event.sourceIp,
      },
      destination: {
        ip: event.destinationIp,
      },
      user: {
        name: event.user,
      },
      organization: {
        id: event.organizationId,
      },
      nexora: {
        identity_id: event.identityId,
        identity_name: event.identityName,
        source: event.source,
      },
      threat: {
        tactic: {
          name: event.mitreTactics,
        },
        technique: {
          id: event.mitreTechniques,
        },
        indicator: {
          type: event.indicators?.length ? 'multiple' : undefined,
        },
      },
      labels: {
        severity: event.severity,
        category: event.category,
      },
    };
  }
}

// ============================================================================
// SYSLOG TRANSPORT (UDP/TCP/TLS)
// ============================================================================

export class SyslogTransport {
  private config: {
    host: string;
    port: number;
    protocol: 'udp' | 'tcp' | 'tls';
    verifySsl: boolean;
  };

  constructor() {
    this.config = {
      host: process.env.SYSLOG_HOST || '',
      port: parseInt(process.env.SYSLOG_PORT || '514', 10),
      protocol: (process.env.SYSLOG_PROTOCOL || 'udp') as 'udp' | 'tcp' | 'tls',
      verifySsl: process.env.SYSLOG_VERIFY_SSL !== 'false',
    };
  }

  isConfigured(): boolean {
    return !!this.config.host;
  }

  async send(message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      switch (this.config.protocol) {
        case 'udp':
          return await this.sendUdp(message);
        case 'tcp':
          return await this.sendTcp(message);
        case 'tls':
          return await this.sendTls(message);
        default:
          return await this.sendUdp(message);
      }
    } catch (error) {
      logger.error('Syslog send failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  private sendUdp(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = dgram.createSocket('udp4');
      const buffer = Buffer.from(message);

      client.send(buffer, 0, buffer.length, this.config.port, this.config.host, (err) => {
        client.close();
        if (err) {
          logger.error('Syslog UDP send failed', { error: err.message });
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  private sendTcp(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        resolve(false);
      }, 5000);

      client.connect(this.config.port, this.config.host, () => {
        client.write(message + '\n', () => {
          clearTimeout(timeout);
          client.end();
          resolve(true);
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        logger.error('Syslog TCP send failed', { error: err.message });
        resolve(false);
      });
    });
  }

  private sendTls(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        host: this.config.host,
        port: this.config.port,
        rejectUnauthorized: this.config.verifySsl,
      };

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const client = tls.connect(options, () => {
        client.write(message + '\n', () => {
          clearTimeout(timeout);
          client.end();
          resolve(true);
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        logger.error('Syslog TLS send failed', { error: err.message });
        resolve(false);
      });
    });
  }
}

// ============================================================================
// UNIFIED SIEM SERVICE
// ============================================================================

export class SiemService {
  private cefFormatter: CefFormatter;
  private leefFormatter: LeefFormatter;
  private syslogFormatter: SyslogFormatter;
  private syslogTransport: SyslogTransport;
  private splunkConnector: SplunkHecConnector;
  private sentinelConnector: SentinelConnector;
  private elasticConnector: ElasticConnector;

  private eventBuffer: SiemEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor() {
    this.cefFormatter = new CefFormatter();
    this.leefFormatter = new LeefFormatter();
    this.syslogFormatter = new SyslogFormatter();
    this.syslogTransport = new SyslogTransport();
    this.splunkConnector = new SplunkHecConnector();
    this.sentinelConnector = new SentinelConnector();
    this.elasticConnector = new ElasticConnector();

    this.batchSize = parseInt(process.env.SIEM_BATCH_SIZE || '50', 10);
    this.flushIntervalMs = parseInt(process.env.SIEM_FLUSH_INTERVAL_MS || '10000', 10);

    // Start flush interval if any SIEM is configured
    if (this.isAnyConfigured()) {
      this.startFlushInterval();
    }
  }

  isAnyConfigured(): boolean {
    return (
      this.syslogTransport.isConfigured() ||
      this.splunkConnector.isConfigured() ||
      this.sentinelConnector.isConfigured() ||
      this.elasticConnector.isConfigured()
    );
  }

  getConfiguredSiems(): string[] {
    const configured: string[] = [];
    if (this.syslogTransport.isConfigured()) configured.push('syslog');
    if (this.splunkConnector.isConfigured()) configured.push('splunk');
    if (this.sentinelConnector.isConfigured()) configured.push('sentinel');
    if (this.elasticConnector.isConfigured()) configured.push('elastic');
    return configured;
  }

  async sendEvent(event: SiemEvent): Promise<void> {
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async sendEvents(events: SiemEvent[]): Promise<SiemResult> {
    const results: SiemResult[] = [];

    // Send to all configured SIEMs
    if (this.syslogTransport.isConfigured()) {
      const syslogResult = await this.sendToSyslog(events);
      results.push(syslogResult);
    }

    if (this.splunkConnector.isConfigured()) {
      const splunkResult = await this.splunkConnector.sendEvents(events);
      results.push(splunkResult);
    }

    if (this.sentinelConnector.isConfigured()) {
      const sentinelResult = await this.sentinelConnector.sendEvents(events);
      results.push(sentinelResult);
    }

    if (this.elasticConnector.isConfigured()) {
      const elasticResult = await this.elasticConnector.sendEvents(events);
      results.push(elasticResult);
    }

    // Aggregate results
    return this.aggregateResults(results);
  }

  private async sendToSyslog(events: SiemEvent[]): Promise<SiemResult> {
    const format = process.env.SYSLOG_FORMAT || 'cef';
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const event of events) {
      let message: string;
      
      switch (format) {
        case 'cef':
          message = this.cefFormatter.format(event);
          break;
        case 'leef':
          message = this.leefFormatter.format(event);
          break;
        default:
          message = this.syslogFormatter.format(event);
      }

      const success = await this.syslogTransport.send(message);
      if (success) {
        processed++;
      } else {
        failed++;
        errors.push(`Failed to send event ${event.id}`);
      }
    }

    return {
      success: failed === 0,
      eventsProcessed: processed,
      eventsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date(),
    };
  }

  private aggregateResults(results: SiemResult[]): SiemResult {
    if (results.length === 0) {
      return {
        success: false,
        eventsProcessed: 0,
        eventsFailed: 0,
        errors: ['No SIEM configured'],
        timestamp: new Date(),
      };
    }

    const totalProcessed = results.reduce((sum, r) => sum + r.eventsProcessed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.eventsFailed, 0);
    const allErrors = results.flatMap(r => r.errors || []);

    return {
      success: totalFailed === 0,
      eventsProcessed: totalProcessed,
      eventsFailed: totalFailed,
      errors: allErrors.length > 0 ? allErrors : undefined,
      timestamp: new Date(),
    };
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.sendEvents(events);
      logger.debug('SIEM buffer flushed', { count: events.length });
    } catch (error) {
      logger.error('SIEM flush failed', { error: error instanceof Error ? error.message : error });
      // Re-add events to buffer for retry (with limit to prevent memory issues)
      if (this.eventBuffer.length < 1000) {
        this.eventBuffer.unshift(...events);
      }
    }
  }

  private startFlushInterval(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        logger.error('SIEM flush interval error', { error: err.message });
      });
    }, this.flushIntervalMs);

    logger.info('SIEM flush interval started', { intervalMs: this.flushIntervalMs });
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    await this.flush();
    logger.info('SIEM service shutdown complete');
  }

  // Format helpers for external use
  formatCef(event: SiemEvent): string {
    return this.cefFormatter.format(event);
  }

  formatLeef(event: SiemEvent): string {
    return this.leefFormatter.format(event);
  }

  formatSyslog(event: SiemEvent): string {
    return this.syslogFormatter.format(event);
  }

  // Test connectivity
  async testConnectivity(): Promise<Record<string, { connected: boolean; error?: string }>> {
    const results: Record<string, { connected: boolean; error?: string }> = {};

    if (this.syslogTransport.isConfigured()) {
      const testEvent: SiemEvent = {
        id: 'test-' + Date.now(),
        timestamp: new Date(),
        severity: 'low',
        category: 'test',
        eventType: 'connectivity_test',
        source: 'nexora',
        organizationId: 'test',
        title: 'SIEM Connectivity Test',
        description: 'Testing SIEM connectivity from Nexora AED Platform',
      };

      const success = await this.syslogTransport.send(this.syslogFormatter.format(testEvent));
      results.syslog = { connected: success, error: success ? undefined : 'Failed to send test message' };
    }

    if (this.splunkConnector.isConfigured()) {
      try {
        const result = await this.splunkConnector.sendEvents([{
          id: 'test-' + Date.now(),
          timestamp: new Date(),
          severity: 'low',
          category: 'test',
          eventType: 'connectivity_test',
          source: 'nexora',
          organizationId: 'test',
          title: 'SIEM Connectivity Test',
          description: 'Testing Splunk HEC connectivity',
        }]);
        results.splunk = { connected: result.success, error: result.errors?.[0] };
      } catch (error) {
        results.splunk = { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (this.sentinelConnector.isConfigured()) {
      try {
        const result = await this.sentinelConnector.sendEvents([{
          id: 'test-' + Date.now(),
          timestamp: new Date(),
          severity: 'low',
          category: 'test',
          eventType: 'connectivity_test',
          source: 'nexora',
          organizationId: 'test',
          title: 'SIEM Connectivity Test',
          description: 'Testing Microsoft Sentinel connectivity',
        }]);
        results.sentinel = { connected: result.success, error: result.errors?.[0] };
      } catch (error) {
        results.sentinel = { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (this.elasticConnector.isConfigured()) {
      try {
        const result = await this.elasticConnector.sendEvents([{
          id: 'test-' + Date.now(),
          timestamp: new Date(),
          severity: 'low',
          category: 'test',
          eventType: 'connectivity_test',
          source: 'nexora',
          organizationId: 'test',
          title: 'SIEM Connectivity Test',
          description: 'Testing Elastic SIEM connectivity',
        }]);
        results.elastic = { connected: result.success, error: result.errors?.[0] };
      } catch (error) {
        results.elastic = { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return results;
  }
}

// Export singleton instance
export const siemService = new SiemService();

// Export formatters for direct use
export const cefFormatter = new CefFormatter();
export const leefFormatter = new LeefFormatter();
export const syslogFormatter = new SyslogFormatter();
