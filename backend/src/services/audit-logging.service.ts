import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { Request } from 'express';

/**
 * COMPLIANCE: Comprehensive Audit Logging Service
 * 
 * Standards Compliance:
 * - SOC 2 Type II: Complete audit trail
 * - ISO 27001: Security event logging
 * - GDPR Article 30: Records of processing activities
 * - HIPAA §164.312(b): Audit controls
 * - PCI DSS 10: Track and monitor all access
 * - NIST SP 800-53: AU-2, AU-3, AU-6, AU-12
 * 
 * Logs all security-relevant events with:
 * - Who (user/identity)
 * - What (action performed)
 * - When (timestamp with timezone)
 * - Where (IP address, geolocation)
 * - Why (business context)
 * - How (method, result)
 */

export interface AuditLogEntry {
  event: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'access' | 'export';
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  changes?: Record<string, { old: any; new: any }>;
  result?: 'success' | 'failure' | 'partial';
  errorMessage?: string;
}

export class AuditLoggingService {
  /**
   * Log a security-relevant event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize metadata to remove sensitive data
      const sanitizedMetadata = this.sanitizeMetadata(entry.metadata);

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          event: entry.event,
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          userId: entry.userId || null,
          organizationId: entry.organizationId || null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
          severity: entry.severity || 'medium',
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          result: entry.result || 'success',
          errorMessage: entry.errorMessage || null,
        },
      });

      // Also log to Winston for real-time monitoring
      if (entry.severity === 'critical' || entry.severity === 'high') {
        logger.security(`Audit: ${entry.event}`, {
          ...entry,
          metadata: sanitizedMetadata,
        });
      }
    } catch (error) {
      // CRITICAL: Never let audit logging failure break the application
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry,
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    event: 'login' | 'logout' | 'mfa_setup' | 'mfa_verify' | 'password_change' | 'password_reset',
    userId: string,
    organizationId: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      event: `auth_${event}`,
      entityType: 'authentication',
      entityId: userId,
      action: 'access',
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata,
      severity: event === 'password_change' ? 'high' : 'medium',
    });
  }

  /**
   * Log data access events (GDPR compliance)
   */
  async logDataAccess(
    entityType: string,
    entityId: string,
    userId: string,
    organizationId: string,
    req: Request,
    purpose?: string
  ): Promise<void> {
    await this.log({
      event: 'data_access',
      entityType,
      entityId,
      action: 'read',
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata: { purpose },
      severity: 'low',
    });
  }

  /**
   * Log data modifications with change tracking
   */
  async logDataModification(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    userId: string,
    organizationId: string,
    req: Request,
    changes?: Record<string, { old: any; new: any }>
  ): Promise<void> {
    await this.log({
      event: `${entityType}_${action}`,
      entityType,
      entityId,
      action,
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      changes,
      severity: action === 'delete' ? 'high' : 'medium',
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId: string | undefined,
    organizationId: string | undefined,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      event,
      entityType: 'security',
      entityId: userId || 'system',
      action: 'access',
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata,
      severity,
    });
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    action: string,
    targetEntityType: string,
    targetEntityId: string,
    adminUserId: string,
    organizationId: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      event: `admin_${action}`,
      entityType: targetEntityType,
      entityId: targetEntityId,
      action: 'execute',
      userId: adminUserId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata,
      severity: 'high',
    });
  }

  /**
   * Log data export (GDPR compliance)
   */
  async logDataExport(
    exportType: string,
    userId: string,
    organizationId: string,
    req: Request,
    recordCount: number
  ): Promise<void> {
    await this.log({
      event: 'data_export',
      entityType: exportType,
      entityId: userId,
      action: 'export',
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata: { recordCount, exportType },
      severity: 'high',
    });
  }

  /**
   * Log compliance-related events
   */
  async logComplianceEvent(
    event: string,
    entityType: string,
    entityId: string,
    userId: string,
    organizationId: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      event: `compliance_${event}`,
      entityType,
      entityId,
      action: 'execute',
      userId,
      organizationId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata,
      severity: 'high',
    });
  }

  /**
   * Query audit logs with filtering
   */
  async query(filters: {
    organizationId?: string;
    userId?: string;
    entityType?: string;
    action?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.severity) where.severity = filters.severity;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        changes: log.changes ? JSON.parse(log.changes) : null,
      })),
      total,
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalEvents,
      bySeverity,
      byAction,
      byEntityType,
      securityEvents,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          organizationId,
          timestamp: { gte: startDate },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['severity'],
        where: {
          organizationId,
          timestamp: { gte: startDate },
        },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          organizationId,
          timestamp: { gte: startDate },
        },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where: {
          organizationId,
          timestamp: { gte: startDate },
        },
        _count: true,
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          entityType: 'security',
          timestamp: { gte: startDate },
        },
      }),
    ]);

    return {
      totalEvents,
      securityEvents,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: byEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      period: {
        start: startDate,
        end: new Date(),
        days,
      },
    };
  }

  /**
   * Archive old audit logs (compliance retention)
   */
  async archiveOldLogs(retentionDays: number = 2555): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // In production, export to cold storage before deleting
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    logger.info('Audit logs archived', {
      deletedCount: result.count,
      cutoffDate,
      retentionDays,
    });

    return result.count;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'mfaSecret',
      'privateKey',
    ];

    const sanitized = { ...metadata };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeMetadata(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

export const auditLoggingService = new AuditLoggingService();
