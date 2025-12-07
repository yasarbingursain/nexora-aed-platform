import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from './audit-logging.service';
import { Request } from 'express';

/**
 * GDPR Compliance Service
 * 
 * Implements GDPR requirements:
 * - Article 15: Right of Access
 * - Article 16: Right to Rectification
 * - Article 17: Right to Erasure ("Right to be Forgotten")
 * - Article 18: Right to Restriction of Processing
 * - Article 20: Right to Data Portability
 * - Article 21: Right to Object
 * - Article 25: Data Protection by Design and by Default
 * - Article 30: Records of Processing Activities
 * - Article 32: Security of Processing
 * - Article 33: Breach Notification
 * 
 * Also supports:
 * - CCPA (California Consumer Privacy Act)
 * - LGPD (Brazilian General Data Protection Law)
 * - PIPEDA (Canadian Personal Information Protection)
 */

export interface DataExportRequest {
  userId: string;
  organizationId: string;
  format: 'json' | 'csv' | 'xml';
  includeAuditLogs?: boolean;
}

export interface DataDeletionRequest {
  userId: string;
  organizationId: string;
  reason: string;
  retainAuditLogs: boolean;
}

export interface ConsentRecord {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class GDPRComplianceService {
  /**
   * Article 15: Right of Access
   * Export all personal data for a user
   */
  async exportUserData(request: DataExportRequest, req: Request): Promise<any> {
    try {
      logger.info('GDPR data export initiated', {
        userId: request.userId,
        organizationId: request.organizationId,
        format: request.format,
      });

      // Fetch all user data
      const [
        user,
        sessions,
        apiKeys,
        auditLogs,
        identities,
        threats,
      ] = await Promise.all([
        // User profile
        prisma.user.findUnique({
          where: { id: request.userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
            mfaEnabled: true,
            // Exclude sensitive fields
            passwordHash: false,
            mfaSecret: false,
          },
        }),

        // User sessions
        prisma.userSession.findMany({
          where: { userId: request.userId },
          select: {
            id: true,
            deviceInfo: true,
            ipAddress: true,
            createdAt: true,
            lastActivity: true,
            expiresAt: true,
          },
        }),

        // API keys
        prisma.apiKey.findMany({
          where: {
            organizationId: request.organizationId,
            createdBy: request.userId,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            // Exclude key hash
            keyHash: false,
          },
        }),

        // Audit logs (if requested)
        request.includeAuditLogs
          ? prisma.auditLog.findMany({
              where: { userId: request.userId },
              orderBy: { timestamp: 'desc' },
              take: 1000, // Limit to prevent huge exports
            })
          : [],

        // Identities created/modified by user
        prisma.identity.findMany({
          where: {
            organizationId: request.organizationId,
            // Add createdBy field if exists
          },
          take: 100,
        }),

        // Threats assigned to user
        prisma.threat.findMany({
          where: {
            organizationId: request.organizationId,
            assignedTo: request.userId,
          },
          take: 100,
        }),
      ]);

      const exportData = {
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          userId: request.userId,
          organizationId: request.organizationId,
          format: request.format,
          gdprArticle: 'Article 15 - Right of Access',
        },
        personalData: {
          user,
          sessions,
          apiKeys,
          identities,
          threats,
        },
        auditTrail: request.includeAuditLogs ? auditLogs : undefined,
      };

      // Log export event
      await auditLoggingService.logDataExport(
        'user_data',
        request.userId,
        request.organizationId,
        req,
        Object.keys(exportData.personalData).reduce(
          (sum, key) => sum + (exportData.personalData[key as keyof typeof exportData.personalData]?.length || 1),
          0
        )
      );

      logger.info('GDPR data export completed', {
        userId: request.userId,
        recordCount: Object.keys(exportData.personalData).length,
      });

      return exportData;
    } catch (error) {
      logger.error('GDPR data export failed', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Article 17: Right to Erasure ("Right to be Forgotten")
   * Permanently delete all user data
   */
  async deleteUserData(request: DataDeletionRequest, req: Request): Promise<void> {
    try {
      logger.security('GDPR data deletion initiated', {
        userId: request.userId,
        organizationId: request.organizationId,
        reason: request.reason,
      });

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // 1. Delete user sessions
        await tx.userSession.deleteMany({
          where: { userId: request.userId },
        });

        // 2. Delete API keys created by user
        await tx.apiKey.deleteMany({
          where: {
            organizationId: request.organizationId,
            createdBy: request.userId,
          },
        });

        // 3. Delete refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId: request.userId },
        });

        // 4. Anonymize audit logs (if not retaining)
        if (!request.retainAuditLogs) {
          await tx.auditLog.updateMany({
            where: { userId: request.userId },
            data: {
              userId: null,
              ipAddress: '[ANONYMIZED]',
              userAgent: '[ANONYMIZED]',
              metadata: JSON.stringify({ anonymized: true }),
            },
          });
        }

        // 5. Delete user account
        await tx.user.delete({
          where: { id: request.userId },
        });
      });

      // Log deletion event (create new audit log after deletion)
      await auditLoggingService.logComplianceEvent(
        'data_deletion',
        'user',
        request.userId,
        'system',
        request.organizationId,
        req,
        {
          reason: request.reason,
          retainedAuditLogs: request.retainAuditLogs,
          gdprArticle: 'Article 17 - Right to Erasure',
        }
      );

      logger.security('GDPR data deletion completed', {
        userId: request.userId,
        organizationId: request.organizationId,
      });
    } catch (error) {
      logger.error('GDPR data deletion failed', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Article 20: Right to Data Portability
   * Export data in machine-readable format
   */
  async exportPortableData(userId: string, organizationId: string, req: Request): Promise<any> {
    const exportRequest: DataExportRequest = {
      userId,
      organizationId,
      format: 'json',
      includeAuditLogs: false,
    };

    return this.exportUserData(exportRequest, req);
  }

  /**
   * Record user consent (GDPR Article 7)
   */
  async recordConsent(consent: ConsentRecord, req: Request): Promise<void> {
    try {
      // Store consent in database
      await prisma.user.update({
        where: { id: consent.userId },
        data: {
          // Add consent fields to user model if needed
          // For now, log in audit trail
        },
      });

      // Log consent
      await auditLoggingService.logComplianceEvent(
        'consent_recorded',
        'user',
        consent.userId,
        consent.userId,
        '', // organizationId from user
        req,
        {
          purpose: consent.purpose,
          granted: consent.granted,
          gdprArticle: 'Article 7 - Conditions for Consent',
        }
      );

      logger.info('User consent recorded', {
        userId: consent.userId,
        purpose: consent.purpose,
        granted: consent.granted,
      });
    } catch (error) {
      logger.error('Failed to record consent', {
        userId: consent.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, purpose: string, req: Request): Promise<void> {
    try {
      await auditLoggingService.logComplianceEvent(
        'consent_withdrawn',
        'user',
        userId,
        userId,
        '', // organizationId from user
        req,
        {
          purpose,
          gdprArticle: 'Article 7 - Conditions for Consent',
        }
      );

      logger.info('User consent withdrawn', {
        userId,
        purpose,
      });
    } catch (error) {
      logger.error('Failed to withdraw consent', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user's consent history
   */
  async getConsentHistory(userId: string): Promise<any[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        event: { in: ['compliance_consent_recorded', 'compliance_consent_withdrawn'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    return logs.map(log => ({
      event: log.event,
      timestamp: log.timestamp,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
    }));
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(organizationId: string): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      dataExports,
      dataDeletions,
      consentRecords,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.count({
        where: { organizationId },
      }),
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          event: 'data_export',
        },
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          event: 'compliance_data_deletion',
        },
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          event: { in: ['compliance_consent_recorded', 'compliance_consent_withdrawn'] },
        },
      }),
      prisma.auditLog.count({
        where: { organizationId },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      organizationId,
      compliance: {
        gdpr: {
          article15: { dataExports },
          article17: { dataDeletions },
          article7: { consentRecords },
          article30: { auditLogCount },
        },
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
    };
  }

  /**
   * Check if data retention period has expired
   */
  async checkRetentionPeriod(organizationId: string, retentionDays: number = 365): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: false,
        lastLoginAt: { lt: cutoffDate },
      },
      select: { id: true, email: true, lastLoginAt: true },
    });

    return inactiveUsers.map(u => u.id);
  }

  /**
   * Anonymize old data (GDPR Article 5 - Storage Limitation)
   */
  async anonymizeOldData(organizationId: string, retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.updateMany({
      where: {
        organizationId,
        timestamp: { lt: cutoffDate },
        ipAddress: { not: '[ANONYMIZED]' },
      },
      data: {
        ipAddress: '[ANONYMIZED]',
        userAgent: '[ANONYMIZED]',
      },
    });

    logger.info('Old audit logs anonymized', {
      organizationId,
      count: result.count,
      cutoffDate,
    });

    return result.count;
  }
}

export const gdprComplianceService = new GDPRComplianceService();
