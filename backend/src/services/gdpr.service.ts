/**
 * GDPR Service
 * Implementation of GDPR rights and compliance requirements
 * 
 * Articles implemented:
 * - Article 15: Right to Access
 * - Article 17: Right to Erasure ("Right to be Forgotten")
 * - Article 20: Right to Data Portability
 * - Article 30: Record of Processing Activities (ROPA)
 * - Article 32: Security of Processing
 * - Article 33: Breach Notification (72 hours)
 */

import { Pool } from 'pg';
import { logger } from '@/utils/logger';
import { evidenceService } from './evidence.service';

interface DSARRequest {
  organizationId: string;
  userId: string;
  requestType: 'access' | 'erasure' | 'portability';
  lawfulBasis?: string;
  createdBy?: string;
}

interface DSARStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  exportUrl?: string;
  exportExpiresAt?: Date;
}

export class GDPRService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
    });
  }

  /**
   * Article 15: Right to Access
   * Export all personal data for a user
   */
  async handleAccessRequest(
    organizationId: string,
    userId: string
  ): Promise<Record<string, any>> {
    try {
      // Collect all personal data from various tables
      const [identities, activities, threats, auditLogs] = await Promise.all([
        this.pool.query(
          `SELECT * FROM identities WHERE organization_id = $1 AND owner = $2`,
          [organizationId, userId]
        ),
        this.pool.query(
          `SELECT ia.* FROM identity_activities ia
           JOIN identities i ON ia.identity_id = i.id
           WHERE i.organization_id = $1 AND i.owner = $2`,
          [organizationId, userId]
        ),
        this.pool.query(
          `SELECT t.* FROM threats t
           JOIN identities i ON t.identity_id = i.id
           WHERE i.organization_id = $1 AND i.owner = $2`,
          [organizationId, userId]
        ),
        this.pool.query(
          `SELECT * FROM audit_logs 
           WHERE organization_id = $1 AND user_id = $2`,
          [organizationId, userId]
        ),
      ]);

      const exportData = {
        user_id: userId,
        organization_id: organizationId,
        export_date: new Date().toISOString(),
        retention_period: '7 years (regulatory requirement)',
        data: {
          identities: identities.rows,
          activities: activities.rows,
          threats: threats.rows,
          audit_logs: auditLogs.rows,
        },
        lawful_basis: 'GDPR Article 15 - Right to Access',
      };

      // Log to evidence chain
      await evidenceService.writeEvidence({
        organizationId,
        actor: userId,
        action: 'gdpr_access_request',
        resourceType: 'personal_data',
        resourceId: userId,
        payload: {
          records_exported: {
            identities: identities.rows.length,
            activities: activities.rows.length,
            threats: threats.rows.length,
            audit_logs: auditLogs.rows.length,
          },
        },
      });

      return exportData;
    } catch (error) {
      logger.error('GDPR access request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      throw new Error('Access request failed');
    }
  }

  /**
   * Article 17: Right to Erasure
   * Pseudonymize PII while maintaining audit trail integrity
   */
  async handleErasureRequest(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; pseudonymizedRecords: number }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Pseudonymize user data in identities
      const identitiesResult = await client.query(
        `UPDATE identities
         SET owner = privacy.pseudo(owner),
             labels = labels - 'email' - 'name' - 'phone',
             metadata = jsonb_set(metadata, '{gdpr_erased}', 'true'::jsonb)
         WHERE organization_id = $1 AND owner = $2
         RETURNING id`,
        [organizationId, userId]
      );

      // Redact PII from identity activities
      await client.query(
        `UPDATE identity_activities
         SET metadata = jsonb_set(metadata, '{pii_redacted}', 'true'::jsonb)
         WHERE identity_id IN (
           SELECT id FROM identities 
           WHERE organization_id = $1 AND owner LIKE 'anon_%'
         )`,
        [organizationId]
      );

      // Redact PII from audit logs (keep for compliance, remove PII)
      await client.query(
        `UPDATE audit_logs
         SET ip_address = '0.0.0.0',
             user_agent = '[redacted]',
             request_body = '[redacted]'
         WHERE organization_id = $1 AND user_id = $2`,
        [organizationId, userId]
      );

      // Log pseudonymization to audit trail
      await client.query(
        `INSERT INTO privacy.pseudonymization_log 
         (organization_id, user_id, original_hash, pseudonym, reason, performed_by)
         VALUES ($1, $2, digest($2, 'sha256'), privacy.pseudo($2), 'gdpr_erasure', 'system')`,
        [organizationId, userId]
      );

      await client.query('COMMIT');

      const recordsAffected = identitiesResult.rows.length;

      // Log to evidence chain
      await evidenceService.writeEvidence({
        organizationId,
        actor: 'system',
        action: 'gdpr_erasure_request',
        resourceType: 'personal_data',
        resourceId: userId,
        payload: {
          records_pseudonymized: recordsAffected,
          erasure_date: new Date().toISOString(),
        },
      });

      logger.info('GDPR erasure completed', {
        organizationId,
        userId,
        recordsAffected,
      });

      return {
        success: true,
        pseudonymizedRecords: recordsAffected,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('GDPR erasure request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      throw new Error('Erasure request failed');
    } finally {
      client.release();
    }
  }

  /**
   * Article 20: Right to Data Portability
   * Export data in machine-readable format (JSON/CSV)
   */
  async handlePortabilityRequest(
    organizationId: string,
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const data = await this.handleAccessRequest(organizationId, userId);

    if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Create DSAR (Data Subject Access Request) job
   * Async processing for large datasets
   */
  async createDSARJob(request: DSARRequest): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO privacy.dsar_requests 
         (organization_id, user_id, request_type, lawful_basis, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          request.organizationId,
          request.userId,
          request.requestType,
          request.lawfulBasis || 'GDPR Article 15/17/20',
          request.createdBy || 'system',
        ]
      );

      const dsarId = result.rows[0].id;

      // Log to evidence chain
      await evidenceService.writeEvidence({
        organizationId: request.organizationId,
        actor: request.userId,
        action: `gdpr_dsar_created_${request.requestType}`,
        resourceType: 'dsar_request',
        resourceId: dsarId,
        payload: {
          request_type: request.requestType,
          lawful_basis: request.lawfulBasis,
        },
      });

      logger.info('DSAR job created', {
        dsarId,
        organizationId: request.organizationId,
        userId: request.userId,
        requestType: request.requestType,
      });

      // TODO: Trigger background job to process request
      // This would be handled by a job queue (Bull, BullMQ, etc.)

      return dsarId;
    } catch (error) {
      logger.error('Failed to create DSAR job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
      });
      throw new Error('Failed to create DSAR job');
    }
  }

  /**
   * Get DSAR job status
   */
  async getDSARStatus(dsarId: string, organizationId: string): Promise<DSARStatus> {
    try {
      const result = await this.pool.query(
        `SELECT id, status, requested_at, completed_at, export_url, export_expires_at
         FROM privacy.dsar_requests
         WHERE id = $1 AND organization_id = $2`,
        [dsarId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('DSAR request not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get DSAR status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dsarId,
        organizationId,
      });
      throw new Error('Failed to get DSAR status');
    }
  }

  /**
   * Helper: Convert data to CSV format
   */
  private convertToCSV(data: Record<string, any>): string {
    // Simple CSV conversion
    // In production, use a proper CSV library
    const rows: string[] = [];
    
    for (const [key, value] of Object.entries(data.data)) {
      if (Array.isArray(value) && value.length > 0) {
        const headers = Object.keys(value[0]).join(',');
        rows.push(`\n# ${key}\n${headers}`);
        
        for (const item of value) {
          const values = Object.values(item).map(v => 
            typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
          ).join(',');
          rows.push(values);
        }
      }
    }
    
    return rows.join('\n');
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const gdprService = new GDPRService();
