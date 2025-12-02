import { logger } from '@/utils/logger';
import type { ContributeIocInput, SearchIntelQuery } from '@/validators/intel.validator';

/**
 * Threat Intel Service
 * 
 * Business logic for threat intelligence sharing
 * - In-memory storage for now (would use Redis/DB in production)
 * - Shared across all organizations (anonymized)
 */

interface ThreatIntel {
  id: string;
  type: string;
  value: string;
  description: string | undefined;
  severity: string;
  tags: string[];
  source: string | undefined;
  firstSeen: Date;
  lastSeen: Date;
  reportCount: number;
  createdAt: Date;
}

// In-memory storage (would be Redis/DB in production)
const intelStore: Map<string, ThreatIntel> = new Map();

export class IntelService {
  /**
   * Get threat intelligence feed
   */
  async getFeed(organizationId: string, limit: number = 50) {
    logger.info('Threat intel feed requested', { organizationId, limit });

    // Return recent intel entries
    const feed = Array.from(intelStore.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return {
      total: intelStore.size,
      count: feed.length,
      data: feed,
    };
  }

  /**
   * Contribute IOC to threat intelligence
   */
  async contribute(organizationId: string, data: ContributeIocInput) {
    const id = `ioc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if IOC already exists
    const existing = Array.from(intelStore.values()).find(
      intel => intel.type === data.type && intel.value === data.value
    );

    if (existing) {
      // Update existing IOC
      existing.lastSeen = new Date();
      existing.reportCount += 1;
      if (data.tags) {
        existing.tags = [...new Set([...existing.tags, ...data.tags])];
      }

      logger.info('IOC updated', {
        id: existing.id,
        organizationId,
        type: data.type,
        value: data.value,
        reportCount: existing.reportCount,
      });

      return existing;
    }

    // Create new IOC
    const intel: ThreatIntel = {
      id,
      type: data.type,
      value: data.value,
      description: data.description || undefined,
      severity: data.severity,
      tags: data.tags || [],
      source: data.source || undefined,
      firstSeen: data.firstSeen ? new Date(data.firstSeen) : new Date(),
      lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
      reportCount: 1,
      createdAt: new Date(),
    };

    intelStore.set(id, intel);

    logger.info('IOC contributed', {
      id,
      organizationId,
      type: data.type,
      value: data.value,
    });

    return intel;
  }

  /**
   * Search threat intelligence
   */
  async search(organizationId: string, query: SearchIntelQuery) {
    const { q, type, severity, limit = 20 } = query;

    logger.info('Threat intel search', { organizationId, query: q, type, severity });

    // Filter intel entries
    let results = Array.from(intelStore.values()).filter(intel => {
      // Search in value, description, tags
      const searchMatch = 
        intel.value.toLowerCase().includes(q.toLowerCase()) ||
        intel.description?.toLowerCase().includes(q.toLowerCase()) ||
        intel.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()));

      if (!searchMatch) return false;

      // Filter by type
      if (type && intel.type !== type) return false;

      // Filter by severity
      if (severity && intel.severity !== severity) return false;

      return true;
    });

    // Sort by report count and recency
    results = results
      .sort((a, b) => {
        if (b.reportCount !== a.reportCount) {
          return b.reportCount - a.reportCount;
        }
        return b.lastSeen.getTime() - a.lastSeen.getTime();
      })
      .slice(0, limit);

    return {
      query: q,
      count: results.length,
      data: results,
    };
  }

  /**
   * Check if value is in threat intel
   */
  async check(organizationId: string, type: string, value: string) {
    logger.info('Threat intel check', { organizationId, type, value });

    const intel = Array.from(intelStore.values()).find(
      i => i.type === type && i.value === value
    );

    if (intel) {
      return {
        found: true,
        intel,
        risk: intel.severity,
        reportCount: intel.reportCount,
      };
    }

    return {
      found: false,
      risk: 'unknown',
    };
  }

  /**
   * Get statistics
   */
  async getStatistics(organizationId: string) {
    logger.info('Threat intel statistics', { organizationId });

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const intel of intelStore.values()) {
      byType[intel.type] = (byType[intel.type] || 0) + 1;
      bySeverity[intel.severity] = (bySeverity[intel.severity] || 0) + 1;
    }

    return {
      total: intelStore.size,
      byType,
      bySeverity,
      topReported: Array.from(intelStore.values())
        .sort((a, b) => b.reportCount - a.reportCount)
        .slice(0, 10),
    };
  }
}

export const intelService = new IntelService();
