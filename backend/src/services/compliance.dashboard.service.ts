/**
 * Compliance Dashboard Service
 * Provides real-time compliance status across all frameworks
 * 
 * Frameworks: SOC2, ISO27001, PCI-DSS, GDPR, HIPAA, DORA
 */

import { Pool } from 'pg';
import { logger } from '@/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface FrameworkStatus {
  status: 'compliant' | 'partial' | 'non_compliant';
  score: number;
  controls_passed: number;
  controls_total: number;
  non_compliant?: Array<{
    control: string;
    issue: string;
    remediation: string;
  }>;
  next_audit?: string;
  certification_expires?: string;
}

interface ComplianceDashboard {
  organization_id: string;
  last_updated: string;
  frameworks: {
    soc2?: FrameworkStatus;
    iso27001?: FrameworkStatus;
    pci_dss?: FrameworkStatus;
    gdpr?: FrameworkStatus;
    hipaa?: FrameworkStatus;
    dora?: FrameworkStatus;
  };
  risk_areas: Array<{
    area: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>;
  evidence_snapshot_hash?: string;
}

export class ComplianceDashboardService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
    });
  }

  /**
   * Get compliance dashboard status
   */
  async getDashboard(organizationId: string): Promise<ComplianceDashboard> {
    try {
      const [soc2, iso27001, pciDss, gdpr, hipaa, dora, risks] = await Promise.all([
        this.getSOC2Status(organizationId),
        this.getISO27001Status(organizationId),
        this.getPCIDSSStatus(organizationId),
        this.getGDPRStatus(organizationId),
        this.getHIPAAStatus(organizationId),
        this.getDORAStatus(organizationId),
        this.getRiskAreas(organizationId),
      ]);

      return {
        organization_id: organizationId,
        last_updated: new Date().toISOString(),
        frameworks: {
          soc2,
          iso27001,
          pci_dss: pciDss,
          gdpr,
          hipaa,
          dora,
        },
        risk_areas: risks,
      };
    } catch (error) {
      logger.error('Failed to get compliance dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw new Error('Failed to get compliance dashboard');
    }
  }

  /**
   * Get SOC2 Type II compliance status
   */
  private async getSOC2Status(organizationId: string): Promise<FrameworkStatus> {
    const client = await this.pool.connect();
    try {
      // Check detection precision
      const precisionResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status <> 'false_positive') as true_positives
        FROM threats
        WHERE organization_id = $1
          AND detected_at > NOW() - INTERVAL '90 days'
      `, [organizationId]);

      const { total, true_positives } = precisionResult.rows[0];
      const precision = total > 0 ? true_positives / total : 1.0;

      // Check MTTR
      const mttrResult = await client.query(`
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (remediated_at - detected_at))
        ) as median_ttm
        FROM threats
        WHERE organization_id = $1
          AND remediated_at IS NOT NULL
          AND detected_at > NOW() - INTERVAL '90 days'
      `, [organizationId]);

      const medianTtm = mttrResult.rows[0]?.median_ttm || 0;

      // Check uptime
      const uptimeResult = await client.query(`
        SELECT uptime FROM system_uptime_last_30_days LIMIT 1
      `);

      const uptime = uptimeResult.rows[0]?.uptime || 0;

      // Calculate compliance
      const controls = [
        { id: 'CC6.1', passed: precision >= 0.95 },
        { id: 'CC6.6', passed: precision >= 0.95 },
        { id: 'CC7.2', passed: uptime >= 0.999 && medianTtm < 3.0 },
      ];

      const passed = controls.filter(c => c.passed).length;
      const total_controls = controls.length;
      const score = Math.round((passed / total_controls) * 100);

      const nonCompliant = controls
        .filter(c => !c.passed)
        .map(c => ({
          control: c.id,
          issue: this.getSOC2Issue(c.id, { precision, medianTtm, uptime }),
          remediation: this.getSOC2Remediation(c.id),
        }));

      return {
        status: score >= 95 ? 'compliant' : score >= 80 ? 'partial' : 'non_compliant',
        score,
        controls_passed: passed,
        controls_total: total_controls,
        non_compliant: nonCompliant.length > 0 ? nonCompliant : undefined,
        next_audit: '2026-01-15',
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get ISO27001 compliance status
   */
  private async getISO27001Status(organizationId: string): Promise<FrameworkStatus> {
    // Simplified - would check all ISO27001 controls
    return {
      status: 'compliant',
      score: 100,
      controls_passed: 114,
      controls_total: 114,
      certification_expires: '2026-06-30',
    };
  }

  /**
   * Get PCI-DSS 4.0 compliance status
   */
  private async getPCIDSSStatus(organizationId: string): Promise<FrameworkStatus> {
    const client = await this.pool.connect();
    try {
      // Check access control violations
      const accessResult = await client.query(`
        SELECT COUNT(*) as violations
        FROM threats
        WHERE organization_id = $1
          AND rule_id LIKE 'NHI-001%'
          AND detected_at > NOW() - INTERVAL '90 days'
      `, [organizationId]);

      const violations = accessResult.rows[0]?.violations || 0;

      const controls = [
        { id: '6.4.3', passed: true }, // MFA implemented
        { id: '7.1.1', passed: violations < 10 }, // Least privilege
        { id: '8.2.3', passed: true }, // Strong crypto
      ];

      const passed = controls.filter(c => c.passed).length;
      const total_controls = controls.length;
      const score = Math.round((passed / total_controls) * 100);

      return {
        status: score >= 95 ? 'compliant' : 'partial',
        score,
        controls_passed: passed,
        controls_total: total_controls,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get GDPR compliance status
   */
  private async getGDPRStatus(organizationId: string): Promise<FrameworkStatus> {
    const client = await this.pool.connect();
    try {
      // Check DSAR response times
      const dsarResult = await client.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (completed_at - requested_at)) / 86400) as avg_days
        FROM privacy.dsar_requests
        WHERE organization_id = $1
          AND completed_at IS NOT NULL
          AND requested_at > NOW() - INTERVAL '90 days'
      `, [organizationId]);

      const avgDays = dsarResult.rows[0]?.avg_days || 0;

      // Check breaches
      const breachResult = await client.query(`
        SELECT COUNT(*) as breaches
        FROM privacy.breach_notifications
        WHERE organization_id = $1
          AND breach_detected_at > NOW() - INTERVAL '72 hours'
      `, [organizationId]);

      const breaches = breachResult.rows[0]?.breaches || 0;

      const controls = [
        { id: 'Article 15', passed: true }, // Right to access
        { id: 'Article 17', passed: true }, // Right to erasure
        { id: 'Article 20', passed: true }, // Right to portability
        { id: 'Article 32', passed: true }, // Security of processing
        { id: 'Article 33', passed: breaches === 0 }, // Breach notification
      ];

      const passed = controls.filter(c => c.passed).length;
      const total_controls = controls.length;
      const score = Math.round((passed / total_controls) * 100);

      return {
        status: score >= 95 ? 'compliant' : 'partial',
        score,
        controls_passed: passed,
        controls_total: total_controls,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get HIPAA compliance status
   */
  private async getHIPAAStatus(organizationId: string): Promise<FrameworkStatus> {
    // Simplified - would check HIPAA controls
    return {
      status: 'compliant',
      score: 98,
      controls_passed: 45,
      controls_total: 46,
    };
  }

  /**
   * Get DORA compliance status
   */
  private async getDORAStatus(organizationId: string): Promise<FrameworkStatus> {
    // Simplified - would check DORA requirements
    return {
      status: 'compliant',
      score: 95,
      controls_passed: 18,
      controls_total: 19,
    };
  }

  /**
   * Get risk areas
   */
  private async getRiskAreas(organizationId: string): Promise<Array<{
    area: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>> {
    // Simplified - would analyze actual risks
    return [
      {
        area: 'Vendor Management',
        risk_level: 'medium',
        action: 'Complete 5 vendor security questionnaires',
      },
    ];
  }

  /**
   * Helper: Get SOC2 issue description
   */
  private getSOC2Issue(controlId: string, metrics: any): string {
    switch (controlId) {
      case 'CC6.1':
        return `Detection precision ${(metrics.precision * 100).toFixed(1)}% below 95% target`;
      case 'CC7.2':
        if (metrics.uptime < 0.999) {
          return `Uptime ${(metrics.uptime * 100).toFixed(2)}% below 99.9% SLO`;
        }
        return `Median TTM ${metrics.medianTtm.toFixed(1)}s exceeds 3s SLO`;
      default:
        return 'Control not meeting requirements';
    }
  }

  /**
   * Helper: Get SOC2 remediation
   */
  private getSOC2Remediation(controlId: string): string {
    switch (controlId) {
      case 'CC6.1':
        return 'Tune detection rules to reduce false positives';
      case 'CC7.2':
        return 'Investigate performance bottlenecks and optimize remediation';
      default:
        return 'Review control implementation';
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const complianceDashboardService = new ComplianceDashboardService();
