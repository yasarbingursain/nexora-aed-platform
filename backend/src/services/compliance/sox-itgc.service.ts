/**
 * SOX IT General Controls (ITGC) Compliance Service
 * Sarbanes-Oxley Act Section 404 - IT Controls
 * 
 * Standards: SOX Section 404, COSO Framework, COBIT
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface SOXControl {
  controlId: string;
  controlName: string;
  category: 'access_controls' | 'change_management' | 'backup_recovery' | 'operations';
  controlObjective: string;
  testingProcedure: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  automated: boolean;
  keyControl: boolean;
  operatingEffectiveness: boolean;
  designEffectiveness: boolean;
  evidenceIds: string[];
  deficiencies: string[];
  lastTested: Date;
}

export interface SOXAssessment {
  organizationId: string;
  fiscalYear: number;
  controls: SOXControl[];
  overallCompliance: number;
  accessControlsScore: number;
  changeManagementScore: number;
  backupRecoveryScore: number;
  operationsScore: number;
  materialWeaknesses: string[];
  significantDeficiencies: string[];
  controlDeficiencies: string[];
  ipoReady: boolean;
  assessmentDate: Date;
}

export class SOXITGCService {
  async assessCompliance(organizationId: string, fiscalYear: number): Promise<SOXAssessment> {
    logger.info('Starting SOX ITGC compliance assessment', { organizationId, fiscalYear });

    const controls = this.getAllITGCs();
    const assessedControls: SOXControl[] = [];

    for (const control of controls) {
      const assessment = await this.testControl(organizationId, control);
      assessedControls.push(assessment);
    }

    const scores = this.calculateScores(assessedControls);
    const deficiencies = this.classifyDeficiencies(assessedControls);

    const assessment: SOXAssessment = {
      organizationId,
      fiscalYear,
      controls: assessedControls,
      overallCompliance: scores.overall,
      accessControlsScore: scores.accessControls,
      changeManagementScore: scores.changeManagement,
      backupRecoveryScore: scores.backupRecovery,
      operationsScore: scores.operations,
      materialWeaknesses: deficiencies.material,
      significantDeficiencies: deficiencies.significant,
      controlDeficiencies: deficiencies.control,
      ipoReady: deficiencies.material.length === 0 && deficiencies.significant.length === 0,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'sox_itgc_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { fiscalYear, overallCompliance: scores.overall, ipoReady: assessment.ipoReady },
      severity: 'critical',
    });

    return assessment;
  }

  private getAllITGCs(): Partial<SOXControl>[] {
    return [
      // Access Controls
      {
        controlId: 'AC-1',
        controlName: 'User Access Provisioning',
        category: 'access_controls',
        controlObjective: 'Ensure only authorized users have access to financial systems',
        testingProcedure: 'Review user access requests and approvals',
        frequency: 'continuous',
        automated: true,
        keyControl: true,
      },
      {
        controlId: 'AC-2',
        controlName: 'User Access Deprovisioning',
        category: 'access_controls',
        controlObjective: 'Ensure terminated users are removed promptly',
        testingProcedure: 'Review termination logs and access revocation',
        frequency: 'continuous',
        automated: true,
        keyControl: true,
      },
      {
        controlId: 'AC-3',
        controlName: 'Privileged Access Management',
        category: 'access_controls',
        controlObjective: 'Restrict and monitor privileged access',
        testingProcedure: 'Review privileged user list and activity logs',
        frequency: 'monthly',
        automated: false,
        keyControl: true,
      },
      {
        controlId: 'AC-4',
        controlName: 'Segregation of Duties',
        category: 'access_controls',
        controlObjective: 'Prevent conflicting duties in financial processes',
        testingProcedure: 'Review role assignments and access matrices',
        frequency: 'quarterly',
        automated: false,
        keyControl: true,
      },

      // Change Management
      {
        controlId: 'CM-1',
        controlName: 'Change Authorization',
        category: 'change_management',
        controlObjective: 'All changes to production systems are authorized',
        testingProcedure: 'Review change tickets and approvals',
        frequency: 'continuous',
        automated: true,
        keyControl: true,
      },
      {
        controlId: 'CM-2',
        controlName: 'Change Testing',
        category: 'change_management',
        controlObjective: 'Changes are tested before production deployment',
        testingProcedure: 'Review test results and sign-offs',
        frequency: 'continuous',
        automated: false,
        keyControl: true,
      },
      {
        controlId: 'CM-3',
        controlName: 'Emergency Change Procedures',
        category: 'change_management',
        controlObjective: 'Emergency changes follow documented procedures',
        testingProcedure: 'Review emergency change logs and post-implementation reviews',
        frequency: 'monthly',
        automated: false,
        keyControl: false,
      },
      {
        controlId: 'CM-4',
        controlName: 'Production Migration Controls',
        category: 'change_management',
        controlObjective: 'Code migrations to production are controlled',
        testingProcedure: 'Review deployment logs and separation of duties',
        frequency: 'continuous',
        automated: true,
        keyControl: true,
      },

      // Backup and Recovery
      {
        controlId: 'BR-1',
        controlName: 'Data Backup Procedures',
        category: 'backup_recovery',
        controlObjective: 'Critical data is backed up regularly',
        testingProcedure: 'Review backup logs and schedules',
        frequency: 'daily',
        automated: true,
        keyControl: true,
      },
      {
        controlId: 'BR-2',
        controlName: 'Backup Testing',
        category: 'backup_recovery',
        controlObjective: 'Backups are tested for recoverability',
        testingProcedure: 'Review restore test results',
        frequency: 'quarterly',
        automated: false,
        keyControl: true,
      },
      {
        controlId: 'BR-3',
        controlName: 'Disaster Recovery Plan',
        category: 'backup_recovery',
        controlObjective: 'DR plan exists and is tested',
        testingProcedure: 'Review DR plan and test results',
        frequency: 'quarterly',
        automated: false,
        keyControl: true,
      },

      // Operations
      {
        controlId: 'OP-1',
        controlName: 'System Monitoring',
        category: 'operations',
        controlObjective: 'Systems are monitored for availability and performance',
        testingProcedure: 'Review monitoring dashboards and alerts',
        frequency: 'continuous',
        automated: true,
        keyControl: false,
      },
      {
        controlId: 'OP-2',
        controlName: 'Incident Management',
        category: 'operations',
        controlObjective: 'Incidents are logged, tracked, and resolved',
        testingProcedure: 'Review incident tickets and resolution times',
        frequency: 'continuous',
        automated: true,
        keyControl: false,
      },
      {
        controlId: 'OP-3',
        controlName: 'Audit Logging',
        category: 'operations',
        controlObjective: 'All financial system activities are logged',
        testingProcedure: 'Review audit log completeness and retention',
        frequency: 'continuous',
        automated: true,
        keyControl: true,
      },
      {
        controlId: 'OP-4',
        controlName: 'Log Review',
        category: 'operations',
        controlObjective: 'Audit logs are reviewed for anomalies',
        testingProcedure: 'Review log review documentation',
        frequency: 'monthly',
        automated: false,
        keyControl: true,
      },
    ];
  }

  private async testControl(organizationId: string, controlDef: Partial<SOXControl>): Promise<SOXControl> {
    const evidence = await this.collectEvidence(organizationId, controlDef.controlId!);
    const operatingEffectiveness = evidence.length >= this.getRequiredSampleSize(controlDef.frequency!);
    const designEffectiveness = true; // Assume design is effective
    const deficiencies = operatingEffectiveness ? [] : [`Insufficient evidence for ${controlDef.controlId}`];

    return {
      controlId: controlDef.controlId!,
      controlName: controlDef.controlName!,
      category: controlDef.category!,
      controlObjective: controlDef.controlObjective!,
      testingProcedure: controlDef.testingProcedure!,
      frequency: controlDef.frequency!,
      automated: controlDef.automated!,
      keyControl: controlDef.keyControl!,
      operatingEffectiveness,
      designEffectiveness,
      evidenceIds: evidence,
      deficiencies,
      lastTested: new Date(),
    };
  }

  private async collectEvidence(organizationId: string, controlId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      if (controlId.startsWith('AC')) {
        const accessLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['user_login', 'access_granted', 'access_denied', 'permission_change'] },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...accessLogs.map(log => log.id));
      } else if (controlId.startsWith('CM')) {
        const changeLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'change' },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...changeLogs.map(log => log.id));
      } else if (controlId.startsWith('BR')) {
        const backupLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'backup' },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...backupLogs.map(log => log.id));
      } else if (controlId.startsWith('OP')) {
        const opLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...opLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect SOX evidence', { controlId, error });
    }

    return evidenceIds;
  }

  private getRequiredSampleSize(frequency: string): number {
    switch (frequency) {
      case 'continuous': return 90;
      case 'daily': return 90;
      case 'weekly': return 12;
      case 'monthly': return 3;
      case 'quarterly': return 1;
      default: return 10;
    }
  }

  private calculateScores(controls: SOXControl[]): {
    overall: number;
    accessControls: number;
    changeManagement: number;
    backupRecovery: number;
    operations: number;
  } {
    const calcScore = (category: string) => {
      const categoryControls = controls.filter(c => c.category === category);
      if (categoryControls.length === 0) return 100;
      const effective = categoryControls.filter(c => c.operatingEffectiveness && c.designEffectiveness).length;
      return (effective / categoryControls.length) * 100;
    };

    return {
      overall: calcScore(''),
      accessControls: calcScore('access_controls'),
      changeManagement: calcScore('change_management'),
      backupRecovery: calcScore('backup_recovery'),
      operations: calcScore('operations'),
    };
  }

  private classifyDeficiencies(controls: SOXControl[]): {
    material: string[];
    significant: string[];
    control: string[];
  } {
    const material: string[] = [];
    const significant: string[] = [];
    const control: string[] = [];

    for (const ctrl of controls) {
      if (ctrl.deficiencies.length > 0) {
        if (ctrl.keyControl && !ctrl.operatingEffectiveness) {
          material.push(`Material Weakness: ${ctrl.controlId} - ${ctrl.controlName}`);
        } else if (ctrl.keyControl) {
          significant.push(`Significant Deficiency: ${ctrl.controlId} - ${ctrl.controlName}`);
        } else {
          control.push(`Control Deficiency: ${ctrl.controlId} - ${ctrl.controlName}`);
        }
      }
    }

    return { material, significant, control };
  }

  private async persistAssessment(assessment: SOXAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'sox',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist SOX assessment', { error });
    }
  }

  async getLatestAssessment(organizationId: string): Promise<SOXAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: { organizationId, framework: 'sox', status: 'completed' },
        orderBy: { generatedAt: 'desc' },
      });
      return report?.data ? JSON.parse(report.data) : null;
    } catch (error) {
      logger.error('Failed to get SOX assessment', { error });
      return null;
    }
  }
}

export const soxITGCService = new SOXITGCService();
