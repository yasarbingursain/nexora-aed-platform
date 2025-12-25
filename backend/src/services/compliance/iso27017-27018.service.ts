/**
 * ISO 27017 & ISO 27018 Cloud Security and Privacy Service
 * Cloud-specific security and privacy controls
 * 
 * Standards: ISO/IEC 27017:2015, ISO/IEC 27018:2019
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface CloudControl {
  controlId: string;
  controlName: string;
  standard: 'ISO27017' | 'ISO27018';
  category: string;
  implemented: boolean;
  evidenceIds: string[];
  lastAssessed: Date;
}

export interface CloudSecurityAssessment {
  organizationId: string;
  iso27017Controls: CloudControl[];
  iso27018Controls: CloudControl[];
  iso27017Compliance: number;
  iso27018Compliance: number;
  overallCompliance: number;
  cloudProviderControls: boolean;
  customerDataProtection: boolean;
  piiProcessingCompliant: boolean;
  assessmentDate: Date;
}

export class ISO27017And27018Service {
  async assessCompliance(organizationId: string): Promise<CloudSecurityAssessment> {
    logger.info('Starting ISO 27017/27018 cloud security assessment', { organizationId });

    const iso27017Controls = this.getISO27017Controls();
    const iso27018Controls = this.getISO27018Controls();

    const assessed27017: CloudControl[] = [];
    const assessed27018: CloudControl[] = [];

    for (const control of iso27017Controls) {
      const assessment = await this.assessControl(organizationId, control);
      assessed27017.push(assessment);
    }

    for (const control of iso27018Controls) {
      const assessment = await this.assessControl(organizationId, control);
      assessed27018.push(assessment);
    }

    const iso27017Compliance = this.calculateCompliance(assessed27017);
    const iso27018Compliance = this.calculateCompliance(assessed27018);
    const overallCompliance = (iso27017Compliance + iso27018Compliance) / 2;

    const assessment: CloudSecurityAssessment = {
      organizationId,
      iso27017Controls: assessed27017,
      iso27018Controls: assessed27018,
      iso27017Compliance,
      iso27018Compliance,
      overallCompliance,
      cloudProviderControls: true,
      customerDataProtection: iso27017Compliance >= 90,
      piiProcessingCompliant: iso27018Compliance >= 90,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'iso27017_27018_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { iso27017Compliance, iso27018Compliance, overallCompliance },
      severity: 'high',
    });

    return assessment;
  }

  private getISO27017Controls(): Partial<CloudControl>[] {
    return [
      // Cloud Service Provider Controls
      { controlId: '27017-5.1', controlName: 'Shared roles and responsibilities', standard: 'ISO27017', category: 'Governance' },
      { controlId: '27017-6.3', controlName: 'Removal of customer assets', standard: 'ISO27017', category: 'Asset Management' },
      { controlId: '27017-8.1', controlName: 'Cloud service customer user access management', standard: 'ISO27017', category: 'Access Control' },
      { controlId: '27017-9.5', controlName: 'Virtual machine hardening', standard: 'ISO27017', category: 'System Security' },
      { controlId: '27017-12.1', controlName: 'Virtual and cloud network environment', standard: 'ISO27017', category: 'Network Security' },
      { controlId: '27017-12.4', controlName: 'Cloud service customer monitoring', standard: 'ISO27017', category: 'Monitoring' },
      { controlId: '27017-13.1', controlName: 'Data protection in virtual environments', standard: 'ISO27017', category: 'Data Protection' },
      { controlId: '27017-17.1', controlName: 'Planning cloud service continuity', standard: 'ISO27017', category: 'Business Continuity' },
      { controlId: '27017-17.2', controlName: 'Redundancy of cloud services', standard: 'ISO27017', category: 'Availability' },
    ];
  }

  private getISO27018Controls(): Partial<CloudControl>[] {
    return [
      // PII Protection in Public Cloud
      { controlId: '27018-A.1', controlName: 'Consent and choice', standard: 'ISO27018', category: 'Privacy' },
      { controlId: '27018-A.2', controlName: 'Purpose legitimacy and specification', standard: 'ISO27018', category: 'Privacy' },
      { controlId: '27018-A.3', controlName: 'Collection limitation', standard: 'ISO27018', category: 'Privacy' },
      { controlId: '27018-A.4', controlName: 'Data minimization', standard: 'ISO27018', category: 'Privacy' },
      { controlId: '27018-A.5', controlName: 'Use, retention and disclosure limitation', standard: 'ISO27018', category: 'Privacy' },
      { controlId: '27018-A.6', controlName: 'Accuracy and quality', standard: 'ISO27018', category: 'Data Quality' },
      { controlId: '27018-A.7', controlName: 'Openness, transparency and notice', standard: 'ISO27018', category: 'Transparency' },
      { controlId: '27018-A.8', controlName: 'Individual participation and access', standard: 'ISO27018', category: 'Data Subject Rights' },
      { controlId: '27018-A.9', controlName: 'Accountability', standard: 'ISO27018', category: 'Accountability' },
      { controlId: '27018-A.10', controlName: 'Information security', standard: 'ISO27018', category: 'Security' },
      { controlId: '27018-A.11', controlName: 'Privacy compliance', standard: 'ISO27018', category: 'Compliance' },
    ];
  }

  private async assessControl(organizationId: string, controlDef: Partial<CloudControl>): Promise<CloudControl> {
    const evidence = await this.collectEvidence(organizationId, controlDef.controlId!);
    const implemented = evidence.length > 0;

    return {
      controlId: controlDef.controlId!,
      controlName: controlDef.controlName!,
      standard: controlDef.standard!,
      category: controlDef.category!,
      implemented,
      evidenceIds: evidence,
      lastAssessed: new Date(),
    };
  }

  private async collectEvidence(organizationId: string, controlId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      if (controlId.includes('27017')) {
        // Cloud security evidence
        const cloudLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['vm_hardened', 'network_segmented', 'backup_completed', 'monitoring_active'] },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...cloudLogs.map(log => log.id));
      } else {
        // Privacy evidence
        const privacyLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['consent_obtained', 'data_minimized', 'dsar_completed', 'privacy_notice_updated'] },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...privacyLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect cloud security evidence', { controlId, error });
    }

    return evidenceIds;
  }

  private calculateCompliance(controls: CloudControl[]): number {
    if (controls.length === 0) return 100;
    const implemented = controls.filter(c => c.implemented).length;
    return (implemented / controls.length) * 100;
  }

  private async persistAssessment(assessment: CloudSecurityAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'iso27017_27018',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist ISO 27017/27018 assessment', { error });
    }
  }

  async getLatestAssessment(organizationId: string): Promise<CloudSecurityAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: { organizationId, framework: 'iso27017_27018', status: 'completed' },
        orderBy: { generatedAt: 'desc' },
      });
      return report?.data ? JSON.parse(report.data) : null;
    } catch (error) {
      logger.error('Failed to get ISO 27017/27018 assessment', { error });
      return null;
    }
  }
}

export const iso27017And27018Service = new ISO27017And27018Service();
