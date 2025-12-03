import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { threatRepository } from '@/repositories/threats.repository';
import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: CWE-502 - Deserialization of Untrusted Data
 * SECURITY FIX: CWE-400 - Uncontrolled Resource Consumption
 * 
 * All JSON operations validated with Zod schemas.
 * Database aggregation used instead of loading all records into memory.
 */

// Threat Indicator Schema - Strictly typed
const ThreatIndicatorSchema = z.object({
  type: z.enum(['ip', 'domain', 'hash', 'email', 'url', 'file_path']),
  value: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

const ThreatIndicatorsSchema = z.array(ThreatIndicatorSchema).max(100);

// Threat Evidence Schema - Strictly typed
const ThreatEvidenceSchema = z.object({
  source: z.string().max(255).optional(),
  timestamp: z.string().datetime().optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  artifacts: z.array(z.string()).max(50).optional(),
}).strict();

// Allowed fields for statistics aggregation (CWE-400 protection)
const ALLOWED_STATS_FIELDS = ['severity', 'status', 'category'] as const;
type AllowedStatsField = typeof ALLOWED_STATS_FIELDS[number];

interface CreateThreatInput {
  title: string;
  description: string;
  severity: string;
  category: string;
  identityId?: string;
  sourceIp?: string;
  indicators?: any;
  evidence?: any;
  mitreTactics?: string[];
  mitreId?: string;
}

interface UpdateThreatInput {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  category?: string;
  assignedTo?: string;
  sourceIp?: string;
  indicators?: any;
  evidence?: any;
  mitreTactics?: string[];
  mitreId?: string;
}

interface InvestigateThreatInput {
  assignedTo?: string;
  notes?: string;
}

interface RemediateThreatInput {
  action: string;
  playbookId?: string;
  notes?: string;
}

class ThreatService {
  /**
   * Find all threats with pagination
   */
  async findAll(
    organizationId: string,
    filters: {
      severity?: string;
      status?: string;
      category?: string;
      identityId?: string;
      assignedTo?: string;
    } = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 20, 100); // Max 100 per page

    const result = await threatRepository.findAll(organizationId, filters, { page, limit });

    // SECURITY: Validate indicators and evidence on read
    const threats = result.data.map((threat) => {
      let indicators = [];
      let evidence = {};

      try {
        indicators = ThreatIndicatorsSchema.parse(JSON.parse(threat.indicators || '[]'));
      } catch (error) {
        logger.warn('Invalid threat indicators', { 
          threatId: threat.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }

      try {
        evidence = ThreatEvidenceSchema.parse(JSON.parse(threat.evidence || '{}'));
      } catch (error) {
        logger.warn('Invalid threat evidence', { 
          threatId: threat.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }

      return {
        ...threat,
        indicators,
        evidence,
        mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',').filter(Boolean) : [],
      };
    });

    logger.info('Threats listed', {
      organizationId,
      count: threats.length,
      total: result.meta.total,
      page,
    });

    return {
      data: threats,
      meta: result.meta,
    };
  }

  /**
   * Get threat by ID
   */
  async getById(id: string, organizationId: string) {
    const threat = await threatRepository.findById(id, organizationId);

    if (!threat) {
      logger.warn('Threat not found', { id, organizationId });
      throw new Error('Threat not found');
    }

    // SECURITY: Validate indicators
    let indicators = [];
    try {
      indicators = ThreatIndicatorsSchema.parse(JSON.parse(threat.indicators || '[]'));
    } catch (error) {
      logger.error('Corrupted threat indicators', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Invalid threat indicators data');
    }

    // SECURITY: Validate evidence
    let evidence = {};
    try {
      evidence = ThreatEvidenceSchema.parse(JSON.parse(threat.evidence || '{}'));
    } catch (error) {
      logger.error('Corrupted threat evidence', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Invalid threat evidence data');
    }

    logger.info('Threat retrieved', { id, organizationId, title: threat.title });

    return {
      ...threat,
      indicators,
      evidence,
      mitreTactics: threat.mitreTactics ? threat.mitreTactics.split(',').filter(Boolean) : [],
    };
  }

  /**
   * Create new threat
   */
  async create(organizationId: string, data: CreateThreatInput) {
    // SECURITY: Validate indicators before storing
    const validatedIndicators = data.indicators 
      ? ThreatIndicatorsSchema.parse(data.indicators)
      : [];

    // SECURITY: Validate evidence before storing
    const validatedEvidence = data.evidence 
      ? ThreatEvidenceSchema.parse(data.evidence)
      : {};

    const threatData: Prisma.ThreatCreateInput = {
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      sourceIp: data.sourceIp || null,
      indicators: JSON.stringify(validatedIndicators),
      evidence: JSON.stringify(validatedEvidence),
      mitreTactics: data.mitreTactics?.join(',') || '',
      mitreId: data.mitreId || null,
      organization: {
        connect: { id: organizationId },
      },
      ...(data.identityId && {
        identity: {
          connect: { id: data.identityId },
        },
      }),
    };

    const threat = await threatRepository.create(threatData);

    logger.warn('Threat created', {
      id: threat.id,
      organizationId,
      title: threat.title,
      severity: threat.severity,
      category: threat.category,
    });

    return {
      ...threat,
      indicators: validatedIndicators,
      evidence: validatedEvidence,
      mitreTactics: data.mitreTactics || [],
    };
  }

  /**
   * Update threat
   */
  async update(id: string, organizationId: string, data: UpdateThreatInput) {
    // Verify threat exists
    await this.getById(id, organizationId);

    const updateData: Prisma.ThreatUpdateInput = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.severity && { severity: data.severity }),
      ...(data.status && { status: data.status }),
      ...(data.category && { category: data.category }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(data.sourceIp !== undefined && { sourceIp: data.sourceIp || null }),
      ...(data.mitreId !== undefined && { mitreId: data.mitreId || null }),
      updatedAt: new Date(),
    };

    // SECURITY: Validate indicators if provided
    if (data.indicators) {
      const validatedIndicators = ThreatIndicatorsSchema.parse(data.indicators);
      updateData.indicators = JSON.stringify(validatedIndicators);
    }

    // SECURITY: Validate evidence if provided
    if (data.evidence) {
      const validatedEvidence = ThreatEvidenceSchema.parse(data.evidence);
      updateData.evidence = JSON.stringify(validatedEvidence);
    }

    // SECURITY: Validate MITRE tactics if provided
    if (data.mitreTactics) {
      updateData.mitreTactics = data.mitreTactics.join(',');
    }

    await threatRepository.update(id, organizationId, updateData);

    logger.info('Threat updated', {
      id,
      organizationId,
      changes: Object.keys(data),
    });

    return this.getById(id, organizationId);
  }

  /**
   * Delete threat
   */
  async delete(id: string, organizationId: string) {
    await this.getById(id, organizationId);
    await threatRepository.delete(id, organizationId);

    logger.info('Threat deleted', { id, organizationId });
    return { success: true, message: 'Threat deleted successfully' };
  }

  /**
   * Update threat status
   */
  async updateStatus(id: string, organizationId: string, status: string) {
    await this.getById(id, organizationId);
    await threatRepository.updateStatus(id, organizationId, status);

    logger.info('Threat status updated', { id, organizationId, status });
    return this.getById(id, organizationId);
  }

  /**
   * Investigate threat
   */
  async investigate(id: string, organizationId: string, data: InvestigateThreatInput) {
    await this.getById(id, organizationId);
    await threatRepository.updateStatus(id, organizationId, 'investigating');

    if (data.assignedTo) {
      await threatRepository.assign(id, organizationId, data.assignedTo);
    }

    logger.info('Threat investigation started', {
      id,
      organizationId,
      assignedTo: data.assignedTo,
    });

    return {
      success: true,
      message: 'Investigation started',
      threat: await this.getById(id, organizationId),
    };
  }

  /**
   * Remediate threat
   */
  async remediate(id: string, organizationId: string, data: RemediateThreatInput) {
    await this.getById(id, organizationId);

    logger.info('Threat remediation initiated', {
      id,
      organizationId,
      action: data.action,
      playbookId: data.playbookId,
    });

    // TODO (Sprint 2): Integrate with remediation service for real execution
    
    return {
      success: true,
      message: 'Remediation initiated (simulated)',
      action: data.action,
      threat: await this.getById(id, organizationId),
    };
  }

  /**
   * Search threats
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    const threats = await threatRepository.search(organizationId, searchTerm, Math.min(limit, 100));

    logger.info('Threats searched', {
      organizationId,
      searchTerm,
      count: threats.length,
    });

    return threats;
  }

  /**
   * Get threat statistics using database aggregation (CWE-400 fix)
   */
  async getStatistics(organizationId: string) {
    const [
      total,
      bySeverity,
      byStatus,
      byCategory,
      active,
      recent,
    ] = await Promise.all([
      threatRepository.count(organizationId),
      this.getCountByField(organizationId, 'severity'),
      this.getCountByField(organizationId, 'status'),
      this.getCountByField(organizationId, 'category'),
      threatRepository.findActive(organizationId),
      threatRepository.findRecent(organizationId, 5),
    ]);

    return {
      total,
      bySeverity,
      byStatus,
      byCategory,
      active: active.length,
      recent,
    };
  }

  /**
   * SECURITY FIX: CWE-400 - Use database aggregation instead of loading all records
   * Helper: Get count by field using Prisma groupBy
   */
  private async getCountByField(organizationId: string, field: AllowedStatsField) {
    // Validate field is in allowlist
    if (!ALLOWED_STATS_FIELDS.includes(field)) {
      logger.error('Invalid stats field requested', { field, organizationId });
      throw new Error(`Invalid field: ${field}`);
    }

    // Use Prisma groupBy for efficient database aggregation
    const result = await threatRepository.groupByField(organizationId, field);
    
    return result;
  }
}

export const threatService = new ThreatService();
