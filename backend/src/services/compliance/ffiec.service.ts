/**
 * FFIEC CAT Compliance Service
 * Federal Financial Institutions Examination Council Cybersecurity Assessment Tool
 * 
 * Standards: FFIEC CAT
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface FFIECDomain {
  domainId: string;
  domain: string;
  maturityLevel: 'baseline' | 'evolving' | 'intermediate' | 'advanced' | 'innovative';
  declarativeStatements: FFIECStatement[];
  overallScore: number;
}

export interface FFIECStatement {
  statementId: string;
  statement: string;
  implemented: boolean;
  evidenceIds: string[];
}

export interface FFIECAssessment {
  organizationId: string;
  domains: FFIECDomain[];
  inherentRiskProfile: 'least' | 'minimal' | 'moderate' | 'significant' | 'most';
  cybersecurityMaturity: 'baseline' | 'evolving' | 'intermediate' | 'advanced' | 'innovative';
  overallScore: number;
  assessmentDate: Date;
}

export class FFIECService {
  async assessCompliance(organizationId: string): Promise<FFIECAssessment> {
    logger.info('Starting FFIEC CAT assessment', { organizationId });

    const domains = this.getAllDomains();
    const assessedDomains: FFIECDomain[] = [];

    for (const domain of domains) {
      const assessment = await this.assessDomain(organizationId, domain);
      assessedDomains.push(assessment);
    }

    const overallScore = assessedDomains.reduce((sum, d) => sum + d.overallScore, 0) / assessedDomains.length;
    const maturity = this.determineMaturityLevel(overallScore);

    const assessment: FFIECAssessment = {
      organizationId,
      domains: assessedDomains,
      inherentRiskProfile: 'moderate',
      cybersecurityMaturity: maturity,
      overallScore,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'ffiec_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallScore, maturity },
      severity: 'high',
    });

    return assessment;
  }

  private getAllDomains(): Partial<FFIECDomain>[] {
    return [
      {
        domainId: 'D1',
        domain: 'Cyber Risk Management and Oversight',
        maturityLevel: 'baseline',
        declarativeStatements: [
          { statementId: 'D1.G.1', statement: 'Board and senior management establish cybersecurity as priority', implemented: false, evidenceIds: [] },
          { statementId: 'D1.G.2', statement: 'Cybersecurity strategy aligned with business objectives', implemented: false, evidenceIds: [] },
          { statementId: 'D1.G.3', statement: 'Lines of defense established for cybersecurity', implemented: false, evidenceIds: [] },
        ],
        overallScore: 0,
      },
      {
        domainId: 'D2',
        domain: 'Threat Intelligence and Collaboration',
        maturityLevel: 'baseline',
        declarativeStatements: [
          { statementId: 'D2.G.1', statement: 'Threat intelligence sources identified', implemented: false, evidenceIds: [] },
          { statementId: 'D2.G.2', statement: 'Threat information analyzed and shared', implemented: false, evidenceIds: [] },
        ],
        overallScore: 0,
      },
      {
        domainId: 'D3',
        domain: 'Cybersecurity Controls',
        maturityLevel: 'baseline',
        declarativeStatements: [
          { statementId: 'D3.G.1', statement: 'Preventive controls implemented', implemented: false, evidenceIds: [] },
          { statementId: 'D3.G.2', statement: 'Detective controls implemented', implemented: false, evidenceIds: [] },
          { statementId: 'D3.G.3', statement: 'Corrective controls implemented', implemented: false, evidenceIds: [] },
        ],
        overallScore: 0,
      },
      {
        domainId: 'D4',
        domain: 'External Dependency Management',
        maturityLevel: 'baseline',
        declarativeStatements: [
          { statementId: 'D4.G.1', statement: 'Third-party connections identified and managed', implemented: false, evidenceIds: [] },
          { statementId: 'D4.G.2', statement: 'Third-party risks assessed', implemented: false, evidenceIds: [] },
        ],
        overallScore: 0,
      },
      {
        domainId: 'D5',
        domain: 'Cyber Incident Management and Resilience',
        maturityLevel: 'baseline',
        declarativeStatements: [
          { statementId: 'D5.G.1', statement: 'Incident response plan established', implemented: false, evidenceIds: [] },
          { statementId: 'D5.G.2', statement: 'Business continuity plan tested', implemented: false, evidenceIds: [] },
        ],
        overallScore: 0,
      },
    ];
  }

  private async assessDomain(organizationId: string, domainDef: Partial<FFIECDomain>): Promise<FFIECDomain> {
    const assessedStatements: FFIECStatement[] = [];

    for (const statement of domainDef.declarativeStatements!) {
      const evidence = await this.collectEvidence(organizationId, statement.statementId);
      assessedStatements.push({
        ...statement,
        implemented: evidence.length > 0,
        evidenceIds: evidence,
      });
    }

    const implementedCount = assessedStatements.filter(s => s.implemented).length;
    const overallScore = (implementedCount / assessedStatements.length) * 100;

    return {
      domainId: domainDef.domainId!,
      domain: domainDef.domain!,
      maturityLevel: this.determineMaturityLevel(overallScore),
      declarativeStatements: assessedStatements,
      overallScore,
    };
  }

  private async collectEvidence(organizationId: string, statementId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
        take: 50,
      });
      evidenceIds.push(...logs.map(log => log.id));
    } catch (error) {
      logger.error('Failed to collect FFIEC evidence', { statementId, error });
    }

    return evidenceIds;
  }

  private determineMaturityLevel(score: number): 'baseline' | 'evolving' | 'intermediate' | 'advanced' | 'innovative' {
    if (score >= 90) return 'innovative';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    if (score >= 40) return 'evolving';
    return 'baseline';
  }

  private async persistAssessment(assessment: FFIECAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'ffiec',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist FFIEC assessment', { error });
    }
  }

  async getLatestAssessment(organizationId: string): Promise<FFIECAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: { organizationId, framework: 'ffiec', status: 'completed' },
        orderBy: { generatedAt: 'desc' },
      });
      return report?.data ? JSON.parse(report.data) : null;
    } catch (error) {
      logger.error('Failed to get FFIEC assessment', { error });
      return null;
    }
  }
}

export const ffiecService = new FFIECService();
