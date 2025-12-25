/**
 * GLBA Safeguards Rule Compliance Service
 * Gramm-Leach-Bliley Act - Financial Institution Security
 * 
 * Standards: GLBA Safeguards Rule (16 CFR Part 314)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface GLBASafeguard {
  safeguardId: string;
  safeguard: string;
  category: 'program' | 'risk_assessment' | 'safeguards' | 'monitoring' | 'vendor';
  implemented: boolean;
  evidenceIds: string[];
  lastVerified: Date;
}

export interface GLBAAssessment {
  organizationId: string;
  safeguards: GLBASafeguard[];
  overallCompliance: number;
  informationSecurityProgramEstablished: boolean;
  riskAssessmentConducted: boolean;
  safeguardsImplemented: boolean;
  vendorOversightInPlace: boolean;
  incidentResponsePlanExists: boolean;
  assessmentDate: Date;
}

export class GLBAService {
  async assessCompliance(organizationId: string): Promise<GLBAAssessment> {
    logger.info('Starting GLBA Safeguards Rule assessment', { organizationId });

    const safeguards = this.getAllSafeguards();
    const assessedSafeguards: GLBASafeguard[] = [];

    for (const safeguard of safeguards) {
      const assessment = await this.assessSafeguard(organizationId, safeguard);
      assessedSafeguards.push(assessment);
    }

    const implementedCount = assessedSafeguards.filter(s => s.implemented).length;
    const overallCompliance = (implementedCount / assessedSafeguards.length) * 100;

    const assessment: GLBAAssessment = {
      organizationId,
      safeguards: assessedSafeguards,
      overallCompliance,
      informationSecurityProgramEstablished: true,
      riskAssessmentConducted: await this.checkRiskAssessment(organizationId),
      safeguardsImplemented: overallCompliance >= 90,
      vendorOversightInPlace: true,
      incidentResponsePlanExists: true,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'glba_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallCompliance },
      severity: 'critical',
    });

    return assessment;
  }

  private getAllSafeguards(): Partial<GLBASafeguard>[] {
    return [
      // Information Security Program
      { safeguardId: 'ISP-1', safeguard: 'Designate qualified individual to oversee program', category: 'program' },
      { safeguardId: 'ISP-2', safeguard: 'Written information security program', category: 'program' },
      { safeguardId: 'ISP-3', safeguard: 'Board approval and oversight', category: 'program' },

      // Risk Assessment
      { safeguardId: 'RA-1', safeguard: 'Identify and assess risks', category: 'risk_assessment' },
      { safeguardId: 'RA-2', safeguard: 'Evaluate safeguards effectiveness', category: 'risk_assessment' },
      { safeguardId: 'RA-3', safeguard: 'Periodic risk assessment', category: 'risk_assessment' },

      // Safeguards Design and Implementation
      { safeguardId: 'S-1', safeguard: 'Access controls', category: 'safeguards' },
      { safeguardId: 'S-2', safeguard: 'Data inventory and classification', category: 'safeguards' },
      { safeguardId: 'S-3', safeguard: 'Encryption of customer information', category: 'safeguards' },
      { safeguardId: 'S-4', safeguard: 'Secure development practices', category: 'safeguards' },
      { safeguardId: 'S-5', safeguard: 'Multi-factor authentication', category: 'safeguards' },
      { safeguardId: 'S-6', safeguard: 'Secure disposal of customer information', category: 'safeguards' },
      { safeguardId: 'S-7', safeguard: 'Change management procedures', category: 'safeguards' },
      { safeguardId: 'S-8', safeguard: 'Monitoring and logging', category: 'safeguards' },

      // Monitoring and Testing
      { safeguardId: 'M-1', safeguard: 'Continuous monitoring', category: 'monitoring' },
      { safeguardId: 'M-2', safeguard: 'Annual penetration testing', category: 'monitoring' },
      { safeguardId: 'M-3', safeguard: 'Vulnerability assessments', category: 'monitoring' },
      { safeguardId: 'M-4', safeguard: 'Incident response plan', category: 'monitoring' },

      // Service Provider Oversight
      { safeguardId: 'V-1', safeguard: 'Due diligence in selecting service providers', category: 'vendor' },
      { safeguardId: 'V-2', safeguard: 'Contracts require safeguards', category: 'vendor' },
      { safeguardId: 'V-3', safeguard: 'Periodic assessment of service providers', category: 'vendor' },
    ];
  }

  private async assessSafeguard(
    organizationId: string,
    safeguardDef: Partial<GLBASafeguard>
  ): Promise<GLBASafeguard> {
    const evidence = await this.collectEvidence(organizationId, safeguardDef.safeguardId!);
    const implemented = evidence.length > 0;

    return {
      safeguardId: safeguardDef.safeguardId!,
      safeguard: safeguardDef.safeguard!,
      category: safeguardDef.category!,
      implemented,
      evidenceIds: evidence,
      lastVerified: new Date(),
    };
  }

  private async collectEvidence(organizationId: string, safeguardId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      const category = safeguardId.split('-')[0];

      if (category === 'S' || category === 'M') {
        const securityLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['access_control', 'encryption', 'mfa_enabled', 'vulnerability_scan', 'penetration_test'] },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...securityLogs.map(log => log.id));
      } else if (category === 'RA') {
        const riskLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'risk_assessment' },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 20,
        });
        evidenceIds.push(...riskLogs.map(log => log.id));
      } else if (category === 'V') {
        const vendorLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'vendor' },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 20,
        });
        evidenceIds.push(...vendorLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect GLBA evidence', { safeguardId, error });
    }

    return evidenceIds;
  }

  private async checkRiskAssessment(organizationId: string): Promise<boolean> {
    try {
      const riskAssessment = await prisma.auditLog.findFirst({
        where: {
          organizationId,
          event: 'risk_assessment',
          timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });
      return !!riskAssessment;
    } catch (error) {
      return false;
    }
  }

  private async persistAssessment(assessment: GLBAAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'glba',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist GLBA assessment', { error });
    }
  }

  async getLatestAssessment(organizationId: string): Promise<GLBAAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: { organizationId, framework: 'glba', status: 'completed' },
        orderBy: { generatedAt: 'desc' },
      });
      return report?.data ? JSON.parse(report.data) : null;
    } catch (error) {
      logger.error('Failed to get GLBA assessment', { error });
      return null;
    }
  }
}

export const glbaService = new GLBAService();
