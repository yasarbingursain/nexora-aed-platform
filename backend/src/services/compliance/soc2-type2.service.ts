/**
 * SOC 2 Type II Audit Readiness Service
 * Trust Services Criteria Implementation and Evidence Collection
 * 
 * Standards: AICPA SOC 2 Type II, Trust Services Criteria
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface SOC2Control {
  controlId: string;
  category: 'CC' | 'A' | 'C' | 'P' | 'PI';
  categoryName: string;
  title: string;
  description: string;
  testingProcedure: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  operatingEffectiveness: boolean;
  designEffectiveness: boolean;
  evidenceCollected: string[];
  exceptions: string[];
  lastTested: Date;
}

export interface SOC2Assessment {
  organizationId: string;
  reportingPeriod: { start: Date; end: Date };
  controls: SOC2Control[];
  overallReadiness: number;
  securityScore: number;
  availabilityScore: number;
  confidentialityScore: number;
  processingIntegrityScore: number;
  privacyScore: number;
  auditReadiness: boolean;
  gaps: string[];
  assessmentDate: Date;
}

export class SOC2Type2Service {
  /**
   * Assess SOC 2 Type II audit readiness
   */
  async assessAuditReadiness(
    organizationId: string,
    reportingPeriodStart: Date,
    reportingPeriodEnd: Date
  ): Promise<SOC2Assessment> {
    logger.info('Starting SOC 2 Type II audit readiness assessment', {
      organizationId,
      reportingPeriod: { start: reportingPeriodStart, end: reportingPeriodEnd },
    });

    const controls = this.getAllSOC2Controls();
    const assessedControls: SOC2Control[] = [];

    for (const control of controls) {
      const assessment = await this.testControl(organizationId, control, reportingPeriodStart, reportingPeriodEnd);
      assessedControls.push(assessment);
    }

    const scores = this.calculateCategoryScores(assessedControls);
    const gaps = this.identifyGaps(assessedControls);
    const auditReadiness = gaps.length === 0 && scores.overallReadiness >= 95;

    const assessment: SOC2Assessment = {
      organizationId,
      reportingPeriod: { start: reportingPeriodStart, end: reportingPeriodEnd },
      controls: assessedControls,
      overallReadiness: scores.overallReadiness,
      securityScore: scores.security,
      availabilityScore: scores.availability,
      confidentialityScore: scores.confidentiality,
      processingIntegrityScore: scores.processingIntegrity,
      privacyScore: scores.privacy,
      auditReadiness,
      gaps,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'soc2_type2_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallReadiness: scores.overallReadiness, auditReadiness, gapCount: gaps.length },
      severity: 'high',
    });

    return assessment;
  }

  /**
   * Test individual SOC 2 control for operating effectiveness
   */
  private async testControl(
    organizationId: string,
    controlDef: Partial<SOC2Control>,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SOC2Control> {
    const evidence = await this.collectControlEvidence(organizationId, controlDef.controlId!, periodStart, periodEnd);
    const operatingEffectiveness = this.testOperatingEffectiveness(evidence, controlDef.frequency!);
    const designEffectiveness = this.testDesignEffectiveness(controlDef.controlId!);
    const exceptions = this.identifyExceptions(evidence, controlDef.frequency!);

    return {
      controlId: controlDef.controlId!,
      category: controlDef.category!,
      categoryName: controlDef.categoryName!,
      title: controlDef.title!,
      description: controlDef.description!,
      testingProcedure: controlDef.testingProcedure!,
      frequency: controlDef.frequency!,
      operatingEffectiveness,
      designEffectiveness,
      evidenceCollected: evidence,
      exceptions,
      lastTested: new Date(),
    };
  }

  /**
   * Get all SOC 2 Trust Services Criteria controls
   */
  private getAllSOC2Controls(): Partial<SOC2Control>[] {
    return [
      // Common Criteria (CC) - Security
      {
        controlId: 'CC1.1',
        category: 'CC',
        categoryName: 'Control Environment',
        title: 'Commitment to Integrity and Ethical Values',
        description: 'The entity demonstrates a commitment to integrity and ethical values',
        testingProcedure: 'Review code of conduct, ethics policies, and employee acknowledgments',
        frequency: 'annually',
      },
      {
        controlId: 'CC1.2',
        category: 'CC',
        categoryName: 'Control Environment',
        title: 'Board Independence',
        description: 'The board of directors demonstrates independence from management',
        testingProcedure: 'Review board composition and meeting minutes',
        frequency: 'quarterly',
      },
      {
        controlId: 'CC2.1',
        category: 'CC',
        categoryName: 'Communication and Information',
        title: 'Quality Information',
        description: 'The entity obtains or generates relevant, quality information',
        testingProcedure: 'Review information systems and data quality controls',
        frequency: 'monthly',
      },
      {
        controlId: 'CC3.1',
        category: 'CC',
        categoryName: 'Risk Assessment',
        title: 'Risk Identification',
        description: 'The entity specifies objectives with sufficient clarity',
        testingProcedure: 'Review risk assessment documentation and risk register',
        frequency: 'quarterly',
      },
      {
        controlId: 'CC3.2',
        category: 'CC',
        categoryName: 'Risk Assessment',
        title: 'Risk Analysis',
        description: 'The entity identifies risks to the achievement of objectives',
        testingProcedure: 'Review risk analysis and mitigation plans',
        frequency: 'quarterly',
      },
      {
        controlId: 'CC4.1',
        category: 'CC',
        categoryName: 'Monitoring Activities',
        title: 'Ongoing Evaluations',
        description: 'The entity selects, develops, and performs ongoing evaluations',
        testingProcedure: 'Review continuous monitoring reports and security dashboards',
        frequency: 'continuous',
      },
      {
        controlId: 'CC5.1',
        category: 'CC',
        categoryName: 'Control Activities',
        title: 'Control Selection and Development',
        description: 'The entity selects and develops control activities',
        testingProcedure: 'Review control documentation and implementation evidence',
        frequency: 'annually',
      },
      {
        controlId: 'CC5.2',
        category: 'CC',
        categoryName: 'Control Activities',
        title: 'Technology Controls',
        description: 'The entity selects and develops technology controls',
        testingProcedure: 'Review technical security controls and configurations',
        frequency: 'monthly',
      },
      {
        controlId: 'CC6.1',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'Logical Access Security',
        description: 'Logical access security software, infrastructure, and architectures',
        testingProcedure: 'Test access controls, authentication mechanisms, and authorization',
        frequency: 'continuous',
      },
      {
        controlId: 'CC6.2',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'User Registration and Authorization',
        description: 'Prior to issuing system credentials, the entity registers authorized users',
        testingProcedure: 'Review user provisioning process and access requests',
        frequency: 'continuous',
      },
      {
        controlId: 'CC6.3',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'User Deprovisioning',
        description: 'The entity removes access when no longer required',
        testingProcedure: 'Test user deprovisioning and access revocation',
        frequency: 'continuous',
      },
      {
        controlId: 'CC6.6',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'Threat Detection and Prevention',
        description: 'The entity implements controls to prevent or detect threats',
        testingProcedure: 'Review threat detection logs, IDS/IPS alerts, and incident response',
        frequency: 'continuous',
      },
      {
        controlId: 'CC6.7',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'Data Transmission Security',
        description: 'The entity restricts transmission of data to authorized parties',
        testingProcedure: 'Test encryption in transit and data transmission controls',
        frequency: 'monthly',
      },
      {
        controlId: 'CC6.8',
        category: 'CC',
        categoryName: 'Logical and Physical Access',
        title: 'Credential Management',
        description: 'The entity implements controls to prevent unauthorized access',
        testingProcedure: 'Review password policies, MFA implementation, and credential storage',
        frequency: 'monthly',
      },
      {
        controlId: 'CC7.1',
        category: 'CC',
        categoryName: 'System Operations',
        title: 'System Monitoring',
        description: 'The entity monitors system components for anomalies',
        testingProcedure: 'Review monitoring dashboards, alerts, and anomaly detection',
        frequency: 'continuous',
      },
      {
        controlId: 'CC7.2',
        category: 'CC',
        categoryName: 'System Operations',
        title: 'Incident Detection and Response',
        description: 'The entity monitors for and responds to security incidents',
        testingProcedure: 'Review incident response logs and response times',
        frequency: 'continuous',
      },
      {
        controlId: 'CC7.3',
        category: 'CC',
        categoryName: 'System Operations',
        title: 'Incident Evaluation',
        description: 'The entity evaluates security events and determines response',
        testingProcedure: 'Review incident classification and escalation procedures',
        frequency: 'continuous',
      },
      {
        controlId: 'CC7.4',
        category: 'CC',
        categoryName: 'System Operations',
        title: 'Incident Mitigation',
        description: 'The entity responds to identified security incidents',
        testingProcedure: 'Review incident remediation and lessons learned',
        frequency: 'continuous',
      },
      {
        controlId: 'CC8.1',
        category: 'CC',
        categoryName: 'Change Management',
        title: 'Change Authorization and Implementation',
        description: 'The entity authorizes, designs, develops, and implements changes',
        testingProcedure: 'Review change tickets, approvals, and deployment logs',
        frequency: 'continuous',
      },
      {
        controlId: 'CC9.1',
        category: 'CC',
        categoryName: 'Risk Mitigation',
        title: 'Risk Mitigation Activities',
        description: 'The entity identifies, selects, and develops risk mitigation activities',
        testingProcedure: 'Review risk treatment plans and mitigation evidence',
        frequency: 'quarterly',
      },
      
      // Availability Criteria
      {
        controlId: 'A1.1',
        category: 'A',
        categoryName: 'Availability',
        title: 'Availability Commitments',
        description: 'The entity maintains system availability as committed',
        testingProcedure: 'Review uptime metrics, SLA compliance, and availability reports',
        frequency: 'continuous',
      },
      {
        controlId: 'A1.2',
        category: 'A',
        categoryName: 'Availability',
        title: 'Capacity Planning',
        description: 'The entity monitors and manages system capacity',
        testingProcedure: 'Review capacity planning documentation and resource utilization',
        frequency: 'monthly',
      },
      
      // Confidentiality Criteria
      {
        controlId: 'C1.1',
        category: 'C',
        categoryName: 'Confidentiality',
        title: 'Confidential Information Protection',
        description: 'The entity protects confidential information',
        testingProcedure: 'Review data classification and encryption controls',
        frequency: 'monthly',
      },
      
      // Processing Integrity Criteria
      {
        controlId: 'PI1.1',
        category: 'PI',
        categoryName: 'Processing Integrity',
        title: 'Processing Accuracy',
        description: 'The entity processes data accurately and completely',
        testingProcedure: 'Review data validation controls and error handling',
        frequency: 'monthly',
      },
      
      // Privacy Criteria
      {
        controlId: 'P1.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Privacy Notice',
        description: 'The entity provides notice about privacy practices',
        testingProcedure: 'Review privacy policy and user consent mechanisms',
        frequency: 'quarterly',
      },
      {
        controlId: 'P2.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Choice and Consent',
        description: 'The entity provides choice and obtains consent',
        testingProcedure: 'Review consent management and opt-out mechanisms',
        frequency: 'monthly',
      },
      {
        controlId: 'P3.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Data Collection',
        description: 'The entity collects personal information as disclosed',
        testingProcedure: 'Review data collection practices and disclosures',
        frequency: 'quarterly',
      },
      {
        controlId: 'P4.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Data Access and Correction',
        description: 'The entity provides access to and correction of personal information',
        testingProcedure: 'Test data subject access request process',
        frequency: 'monthly',
      },
      {
        controlId: 'P5.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Data Disclosure',
        description: 'The entity discloses personal information to third parties',
        testingProcedure: 'Review third-party data sharing agreements',
        frequency: 'quarterly',
      },
      {
        controlId: 'P6.1',
        category: 'P',
        categoryName: 'Privacy',
        title: 'Data Retention and Disposal',
        description: 'The entity retains and disposes of personal information',
        testingProcedure: 'Review data retention policies and disposal procedures',
        frequency: 'quarterly',
      },
    ];
  }

  /**
   * Collect evidence for control testing
   */
  private async collectControlEvidence(
    organizationId: string,
    controlId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      // Map control to evidence sources
      if (controlId.startsWith('CC6')) {
        // Access control evidence
        const accessLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['user_login', 'access_granted', 'access_denied', 'permission_change'] },
            timestamp: { gte: periodStart, lte: periodEnd },
          },
        });
        evidenceIds.push(...accessLogs.map(log => log.id));
      } else if (controlId.startsWith('CC7')) {
        // Incident response evidence
        const incidents = await prisma.incident.findMany({
          where: {
            organizationId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        });
        evidenceIds.push(...incidents.map(inc => inc.id));
      } else if (controlId.startsWith('CC8')) {
        // Change management evidence
        const changeLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'change' },
            timestamp: { gte: periodStart, lte: periodEnd },
          },
        });
        evidenceIds.push(...changeLogs.map(log => log.id));
      } else if (controlId.startsWith('A1')) {
        // Availability evidence
        const uptimeMetrics = await prisma.systemUptimeMetric.findMany({
          where: {
            timestamp: { gte: periodStart, lte: periodEnd },
          },
        });
        evidenceIds.push(...uptimeMetrics.map(metric => metric.id));
      } else if (controlId.startsWith('P')) {
        // Privacy evidence
        const privacyLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['data_export', 'data_deletion', 'consent_given', 'consent_withdrawn'] },
            timestamp: { gte: periodStart, lte: periodEnd },
          },
        });
        evidenceIds.push(...privacyLogs.map(log => log.id));
      } else {
        // Generic audit evidence
        const auditLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            timestamp: { gte: periodStart, lte: periodEnd },
          },
          take: 100,
        });
        evidenceIds.push(...auditLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect SOC 2 control evidence', {
        controlId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return evidenceIds;
  }

  /**
   * Test operating effectiveness (Type II requirement)
   */
  private testOperatingEffectiveness(evidence: string[], frequency: string): boolean {
    // Type II requires evidence of controls operating over time
    const requiredSamples = this.getRequiredSampleSize(frequency);
    return evidence.length >= requiredSamples;
  }

  /**
   * Test design effectiveness
   */
  private testDesignEffectiveness(controlId: string): boolean {
    // For now, assume design is effective if control is defined
    // In production, this would involve detailed control design review
    return true;
  }

  /**
   * Get required sample size based on frequency
   */
  private getRequiredSampleSize(frequency: string): number {
    switch (frequency) {
      case 'continuous':
        return 365; // Daily samples for continuous controls
      case 'daily':
        return 365;
      case 'weekly':
        return 52;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'annually':
        return 1;
      default:
        return 12;
    }
  }

  /**
   * Identify control exceptions
   */
  private identifyExceptions(evidence: string[], frequency: string): string[] {
    const exceptions: string[] = [];
    const requiredSamples = this.getRequiredSampleSize(frequency);

    if (evidence.length < requiredSamples) {
      exceptions.push(`Insufficient evidence: ${evidence.length} samples found, ${requiredSamples} required`);
    }

    return exceptions;
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(controls: SOC2Control[]): {
    overallReadiness: number;
    security: number;
    availability: number;
    confidentiality: number;
    processingIntegrity: number;
    privacy: number;
  } {
    const ccControls = controls.filter(c => c.category === 'CC');
    const aControls = controls.filter(c => c.category === 'A');
    const cControls = controls.filter(c => c.category === 'C');
    const piControls = controls.filter(c => c.category === 'PI');
    const pControls = controls.filter(c => c.category === 'P');

    const calculateScore = (controlSet: SOC2Control[]) => {
      if (controlSet.length === 0) return 100;
      const effective = controlSet.filter(c => c.operatingEffectiveness && c.designEffectiveness).length;
      return (effective / controlSet.length) * 100;
    };

    const security = calculateScore(ccControls);
    const availability = calculateScore(aControls);
    const confidentiality = calculateScore(cControls);
    const processingIntegrity = calculateScore(piControls);
    const privacy = calculateScore(pControls);

    const overallReadiness = calculateScore(controls);

    return {
      overallReadiness,
      security,
      availability,
      confidentiality,
      processingIntegrity,
      privacy,
    };
  }

  /**
   * Identify gaps for audit readiness
   */
  private identifyGaps(controls: SOC2Control[]): string[] {
    const gaps: string[] = [];

    for (const control of controls) {
      if (!control.designEffectiveness) {
        gaps.push(`${control.controlId}: Design effectiveness not demonstrated`);
      }
      if (!control.operatingEffectiveness) {
        gaps.push(`${control.controlId}: Operating effectiveness not demonstrated`);
      }
      if (control.exceptions.length > 0) {
        gaps.push(`${control.controlId}: ${control.exceptions.join(', ')}`);
      }
    }

    return gaps;
  }

  /**
   * Persist assessment
   */
  private async persistAssessment(assessment: SOC2Assessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'soc2',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist SOC 2 assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get latest assessment
   */
  async getLatestAssessment(organizationId: string): Promise<SOC2Assessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: {
          organizationId,
          framework: 'soc2',
          status: 'completed',
        },
        orderBy: { generatedAt: 'desc' },
      });

      if (!report || !report.data) {
        return null;
      }

      return JSON.parse(report.data) as SOC2Assessment;
    } catch (error) {
      logger.error('Failed to get latest SOC 2 assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const soc2Type2Service = new SOC2Type2Service();
