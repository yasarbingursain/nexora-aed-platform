/**
 * Evidence Service
 * Immutable audit trail with cryptographic hash-chain integrity
 * 
 * Enterprise-grade evidence logging for compliance:
 * - SOC 2 Type II
 * - ISO 27001
 * - PCI DSS 4.0
 * - HIPAA
 * - GDPR Article 32
 */

import { Pool } from 'pg';
import { logger } from '@/utils/logger';

interface EvidenceEntry {
  organizationId: string;
  actor?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  payload: Record<string, any>;
  retentionYears?: number;
}

interface ChainVerificationResult {
  isValid: boolean;
  totalRecords: number;
  verifiedRecords: number;
  firstBreakAt?: number;
  breakDetails?: {
    id: number;
    expectedHash: string;
    actualHash: string;
    timestamp: Date;
  };
}

export class EvidenceService {
  private pool: Pool;

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Write evidence entry to immutable log
   * Hash-chain is automatically maintained by database trigger
   */
  async writeEvidence(entry: EvidenceEntry): Promise<number> {
    const retentionYears = entry.retentionYears || 7; // Default 7 years for compliance
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);

    try {
      const result = await this.pool.query(
        `INSERT INTO security.evidence_log 
         (organization_id, actor, action, resource_type, resource_id, payload, retention_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          entry.organizationId,
          entry.actor || null,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          JSON.stringify(entry.payload),
          retentionDate.toISOString().split('T')[0],
        ]
      );

      const evidenceId = result.rows[0].id;

      logger.info('Evidence written to immutable log', {
        evidenceId,
        organizationId: entry.organizationId,
        action: entry.action,
        resourceType: entry.resourceType,
      });

      return evidenceId;
    } catch (error) {
      logger.error('Failed to write evidence', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry,
      });
      throw new Error('Evidence logging failed');
    }
  }

  /**
   * Verify hash-chain integrity for an organization
   * Returns first break point if chain is compromised
   */
  async verifyChain(organizationId: string): Promise<ChainVerificationResult> {
    try {
      // Fetch all records for organization in chronological order
      const result = await this.pool.query(
        `SELECT id, ts, organization_id, action, resource_type, resource_id, 
                payload, prev_hash, row_hash
         FROM security.evidence_log
         WHERE organization_id = $1
         ORDER BY id ASC`,
        [organizationId]
      );

      const records = result.rows;
      
      if (records.length === 0) {
        return {
          isValid: true,
          totalRecords: 0,
          verifiedRecords: 0,
        };
      }

      let verifiedCount = 0;
      let prevHash: Buffer | null = null;

      // Verify each record's hash
      for (const record of records) {
        // Verify prev_hash matches previous record's row_hash
        if (prevHash !== null) {
          if (!record.prev_hash || !record.prev_hash.equals(prevHash)) {
            return {
              isValid: false,
              totalRecords: records.length,
              verifiedRecords: verifiedCount,
              firstBreakAt: record.id,
              breakDetails: {
                id: record.id,
                expectedHash: prevHash.toString('hex'),
                actualHash: record.prev_hash ? record.prev_hash.toString('hex') : 'null',
                timestamp: record.ts,
              },
            };
          }
        }

        // Recompute hash and verify
        const computedHash = await this.computeHash(
          record.prev_hash,
          record.organization_id,
          record.action,
          record.resource_type,
          record.resource_id,
          record.ts,
          record.payload
        );

        if (!computedHash.equals(record.row_hash)) {
          return {
            isValid: false,
            totalRecords: records.length,
            verifiedRecords: verifiedCount,
            firstBreakAt: record.id,
            breakDetails: {
              id: record.id,
              expectedHash: computedHash.toString('hex'),
              actualHash: record.row_hash.toString('hex'),
              timestamp: record.ts,
            },
          };
        }

        verifiedCount++;
        prevHash = record.row_hash;
      }

      return {
        isValid: true,
        totalRecords: records.length,
        verifiedRecords: verifiedCount,
      };
    } catch (error) {
      logger.error('Chain verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw new Error('Chain verification failed');
    }
  }

  /**
   * Compute hash for verification
   * Must match database trigger logic exactly
   */
  private async computeHash(
    prevHash: Buffer | null,
    orgId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    timestamp: Date,
    payload: any
  ): Promise<Buffer> {
    const crypto = require('crypto');
    
    const material = Buffer.concat([
      prevHash || Buffer.alloc(0),
      Buffer.from(orgId || '', 'utf8'),
      Buffer.from(action || '', 'utf8'),
      Buffer.from(resourceType || '', 'utf8'),
      Buffer.from(resourceId || '', 'utf8'),
      Buffer.from(timestamp.toISOString() || '', 'utf8'),
      Buffer.from(JSON.stringify(payload), 'utf8'),
    ]);

    return crypto.createHash('sha256').update(material).digest();
  }

  /**
   * Query evidence log with filters
   */
  async queryEvidence(
    organizationId: string,
    filters: {
      action?: string;
      resourceType?: string;
      resourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(filters.resourceId);
    }

    if (filters.dateFrom) {
      conditions.push(`ts >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`ts <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    const limit = filters.limit || 100;
    const query = `
      SELECT id, ts, actor, action, resource_type, resource_id, payload
      FROM security.evidence_log
      WHERE ${conditions.join(' AND ')}
      ORDER BY ts DESC
      LIMIT ${limit}
    `;

    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Evidence query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        filters,
      });
      throw new Error('Evidence query failed');
    }
  }

  /**
   * Get chain statistics for organization
   */
  async getChainStats(organizationId: string): Promise<{
    totalRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    retentionExpiring: number;
  }> {
    try {
      const result = await this.pool.query(
        `SELECT 
           COUNT(*) as total,
           MIN(ts) as oldest,
           MAX(ts) as newest,
           COUNT(*) FILTER (WHERE retention_until < NOW() + INTERVAL '30 days') as expiring
         FROM security.evidence_log
         WHERE organization_id = $1`,
        [organizationId]
      );

      const row = result.rows[0];
      return {
        totalRecords: parseInt(row.total),
        oldestRecord: row.oldest,
        newestRecord: row.newest,
        retentionExpiring: parseInt(row.expiring),
      };
    } catch (error) {
      logger.error('Failed to get chain stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw new Error('Failed to get chain statistics');
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const evidenceService = new EvidenceService();
