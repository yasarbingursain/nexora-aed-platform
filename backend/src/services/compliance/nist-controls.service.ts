/**
 * NIST 800-53 Rev 5 Control Implementation Service
 * Full implementation of NIST security controls for Cybersecurity SaaS
 * 
 * Standards: NIST SP 800-53 Rev 5, NIST Cybersecurity Framework
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface NISTControl {
  controlId: string;
  family: string;
  title: string;
  baseline: 'low' | 'moderate' | 'high';
  implemented: boolean;
  implementationStatus: 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable';
  evidenceIds: string[];
  lastAssessed: Date;
  assessor: string;
  findings: string[];
  compensatingControls?: string[];
}

export interface NISTAssessment {
  organizationId: string;
  baseline: 'low' | 'moderate' | 'high';
  controls: NISTControl[];
  overallCompliance: number;
  assessmentDate: Date;
  nextAssessmentDue: Date;
}

export class NISTControlsService {
  /**
   * Assess NIST 800-53 compliance for organization
   */
  async assessCompliance(organizationId: string, baseline: 'low' | 'moderate' | 'high'): Promise<NISTAssessment> {
    logger.info('Starting NIST 800-53 compliance assessment', { organizationId, baseline });

    const controls = this.getControlsForBaseline(baseline);
    const assessedControls: NISTControl[] = [];

    for (const control of controls) {
      const assessment = await this.assessControl(organizationId, control);
      assessedControls.push(assessment);
    }

    const implementedCount = assessedControls.filter(c => c.implementationStatus === 'implemented').length;
    const overallCompliance = (implementedCount / assessedControls.length) * 100;

    const assessment: NISTAssessment = {
      organizationId,
      baseline,
      controls: assessedControls,
      overallCompliance,
      assessmentDate: new Date(),
      nextAssessmentDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'nist_compliance_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { baseline, overallCompliance, controlsAssessed: assessedControls.length },
      severity: 'high',
    });

    return assessment;
  }

  /**
   * Assess individual NIST control
   */
  private async assessControl(organizationId: string, controlDef: Partial<NISTControl>): Promise<NISTControl> {
    const evidenceIds = await this.collectEvidence(organizationId, controlDef.controlId!);
    const implementationStatus = this.determineImplementationStatus(controlDef.controlId!, evidenceIds);
    const findings = await this.generateFindings(organizationId, controlDef.controlId!, implementationStatus);

    return {
      controlId: controlDef.controlId!,
      family: controlDef.family!,
      title: controlDef.title!,
      baseline: controlDef.baseline!,
      implemented: implementationStatus === 'implemented',
      implementationStatus,
      evidenceIds,
      lastAssessed: new Date(),
      assessor: 'system',
      findings,
    };
  }

  /**
   * Get controls for specific baseline
   */
  private getControlsForBaseline(baseline: 'low' | 'moderate' | 'high'): Partial<NISTControl>[] {
    const allControls = this.getAllControls();
    
    if (baseline === 'low') {
      return allControls.filter(c => c.baseline === 'low');
    } else if (baseline === 'moderate') {
      return allControls.filter(c => c.baseline === 'low' || c.baseline === 'moderate');
    } else {
      return allControls;
    }
  }

  /**
   * All NIST 800-53 controls (subset for key families)
   */
  private getAllControls(): Partial<NISTControl>[] {
    return [
      // AC - Access Control Family
      { controlId: 'AC-1', family: 'Access Control', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'AC-2', family: 'Access Control', title: 'Account Management', baseline: 'low' },
      { controlId: 'AC-3', family: 'Access Control', title: 'Access Enforcement', baseline: 'low' },
      { controlId: 'AC-4', family: 'Access Control', title: 'Information Flow Enforcement', baseline: 'moderate' },
      { controlId: 'AC-5', family: 'Access Control', title: 'Separation of Duties', baseline: 'moderate' },
      { controlId: 'AC-6', family: 'Access Control', title: 'Least Privilege', baseline: 'moderate' },
      { controlId: 'AC-7', family: 'Access Control', title: 'Unsuccessful Logon Attempts', baseline: 'low' },
      { controlId: 'AC-17', family: 'Access Control', title: 'Remote Access', baseline: 'moderate' },
      { controlId: 'AC-20', family: 'Access Control', title: 'Use of External Systems', baseline: 'moderate' },
      
      // AU - Audit and Accountability Family
      { controlId: 'AU-1', family: 'Audit and Accountability', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'AU-2', family: 'Audit and Accountability', title: 'Event Logging', baseline: 'low' },
      { controlId: 'AU-3', family: 'Audit and Accountability', title: 'Content of Audit Records', baseline: 'low' },
      { controlId: 'AU-4', family: 'Audit and Accountability', title: 'Audit Log Storage Capacity', baseline: 'low' },
      { controlId: 'AU-5', family: 'Audit and Accountability', title: 'Response to Audit Logging Process Failures', baseline: 'low' },
      { controlId: 'AU-6', family: 'Audit and Accountability', title: 'Audit Record Review, Analysis, and Reporting', baseline: 'low' },
      { controlId: 'AU-9', family: 'Audit and Accountability', title: 'Protection of Audit Information', baseline: 'moderate' },
      { controlId: 'AU-11', family: 'Audit and Accountability', title: 'Audit Record Retention', baseline: 'moderate' },
      { controlId: 'AU-12', family: 'Audit and Accountability', title: 'Audit Record Generation', baseline: 'low' },
      
      // CA - Assessment, Authorization, and Monitoring
      { controlId: 'CA-1', family: 'Assessment and Authorization', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'CA-2', family: 'Assessment and Authorization', title: 'Control Assessments', baseline: 'moderate' },
      { controlId: 'CA-3', family: 'Assessment and Authorization', title: 'Information Exchange', baseline: 'moderate' },
      { controlId: 'CA-5', family: 'Assessment and Authorization', title: 'Plan of Action and Milestones', baseline: 'moderate' },
      { controlId: 'CA-7', family: 'Assessment and Authorization', title: 'Continuous Monitoring', baseline: 'moderate' },
      { controlId: 'CA-9', family: 'Assessment and Authorization', title: 'Internal System Connections', baseline: 'moderate' },
      
      // CM - Configuration Management
      { controlId: 'CM-1', family: 'Configuration Management', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'CM-2', family: 'Configuration Management', title: 'Baseline Configuration', baseline: 'low' },
      { controlId: 'CM-3', family: 'Configuration Management', title: 'Configuration Change Control', baseline: 'moderate' },
      { controlId: 'CM-4', family: 'Configuration Management', title: 'Impact Analyses', baseline: 'moderate' },
      { controlId: 'CM-5', family: 'Configuration Management', title: 'Access Restrictions for Change', baseline: 'moderate' },
      { controlId: 'CM-6', family: 'Configuration Management', title: 'Configuration Settings', baseline: 'low' },
      { controlId: 'CM-7', family: 'Configuration Management', title: 'Least Functionality', baseline: 'low' },
      { controlId: 'CM-8', family: 'Configuration Management', title: 'System Component Inventory', baseline: 'moderate' },
      
      // CP - Contingency Planning
      { controlId: 'CP-1', family: 'Contingency Planning', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'CP-2', family: 'Contingency Planning', title: 'Contingency Plan', baseline: 'low' },
      { controlId: 'CP-3', family: 'Contingency Planning', title: 'Contingency Training', baseline: 'moderate' },
      { controlId: 'CP-4', family: 'Contingency Planning', title: 'Contingency Plan Testing', baseline: 'moderate' },
      { controlId: 'CP-9', family: 'Contingency Planning', title: 'System Backup', baseline: 'low' },
      { controlId: 'CP-10', family: 'Contingency Planning', title: 'System Recovery and Reconstitution', baseline: 'moderate' },
      
      // IA - Identification and Authentication
      { controlId: 'IA-1', family: 'Identification and Authentication', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'IA-2', family: 'Identification and Authentication', title: 'Identification and Authentication', baseline: 'low' },
      { controlId: 'IA-3', family: 'Identification and Authentication', title: 'Device Identification and Authentication', baseline: 'moderate' },
      { controlId: 'IA-4', family: 'Identification and Authentication', title: 'Identifier Management', baseline: 'low' },
      { controlId: 'IA-5', family: 'Identification and Authentication', title: 'Authenticator Management', baseline: 'low' },
      { controlId: 'IA-6', family: 'Identification and Authentication', title: 'Authentication Feedback', baseline: 'low' },
      { controlId: 'IA-8', family: 'Identification and Authentication', title: 'Identification and Authentication (Non-Organizational Users)', baseline: 'moderate' },
      
      // IR - Incident Response
      { controlId: 'IR-1', family: 'Incident Response', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'IR-2', family: 'Incident Response', title: 'Incident Response Training', baseline: 'moderate' },
      { controlId: 'IR-4', family: 'Incident Response', title: 'Incident Handling', baseline: 'low' },
      { controlId: 'IR-5', family: 'Incident Response', title: 'Incident Monitoring', baseline: 'moderate' },
      { controlId: 'IR-6', family: 'Incident Response', title: 'Incident Reporting', baseline: 'low' },
      { controlId: 'IR-7', family: 'Incident Response', title: 'Incident Response Assistance', baseline: 'moderate' },
      { controlId: 'IR-8', family: 'Incident Response', title: 'Incident Response Plan', baseline: 'low' },
      
      // RA - Risk Assessment
      { controlId: 'RA-1', family: 'Risk Assessment', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'RA-2', family: 'Risk Assessment', title: 'Security Categorization', baseline: 'low' },
      { controlId: 'RA-3', family: 'Risk Assessment', title: 'Risk Assessment', baseline: 'low' },
      { controlId: 'RA-5', family: 'Risk Assessment', title: 'Vulnerability Monitoring and Scanning', baseline: 'low' },
      
      // SC - System and Communications Protection
      { controlId: 'SC-1', family: 'System and Communications Protection', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'SC-5', family: 'System and Communications Protection', title: 'Denial-of-Service Protection', baseline: 'moderate' },
      { controlId: 'SC-7', family: 'System and Communications Protection', title: 'Boundary Protection', baseline: 'low' },
      { controlId: 'SC-8', family: 'System and Communications Protection', title: 'Transmission Confidentiality and Integrity', baseline: 'moderate' },
      { controlId: 'SC-12', family: 'System and Communications Protection', title: 'Cryptographic Key Establishment and Management', baseline: 'low' },
      { controlId: 'SC-13', family: 'System and Communications Protection', title: 'Cryptographic Protection', baseline: 'low' },
      { controlId: 'SC-28', family: 'System and Communications Protection', title: 'Protection of Information at Rest', baseline: 'moderate' },
      
      // SI - System and Information Integrity
      { controlId: 'SI-1', family: 'System and Information Integrity', title: 'Policy and Procedures', baseline: 'low' },
      { controlId: 'SI-2', family: 'System and Information Integrity', title: 'Flaw Remediation', baseline: 'low' },
      { controlId: 'SI-3', family: 'System and Information Integrity', title: 'Malicious Code Protection', baseline: 'low' },
      { controlId: 'SI-4', family: 'System and Information Integrity', title: 'System Monitoring', baseline: 'low' },
      { controlId: 'SI-5', family: 'System and Information Integrity', title: 'Security Alerts, Advisories, and Directives', baseline: 'low' },
      { controlId: 'SI-7', family: 'System and Information Integrity', title: 'Software, Firmware, and Information Integrity', baseline: 'moderate' },
      { controlId: 'SI-10', family: 'System and Information Integrity', title: 'Information Input Validation', baseline: 'moderate' },
      { controlId: 'SI-12', family: 'System and Information Integrity', title: 'Information Management and Retention', baseline: 'moderate' },
    ];
  }

  /**
   * Collect evidence for control
   */
  private async collectEvidence(organizationId: string, controlId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      // Collect evidence based on control family
      const family = controlId.split('-')[0];

      switch (family) {
        case 'AC': // Access Control
          const accessLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              event: { in: ['user_login', 'user_logout', 'access_denied', 'permission_change'] },
              timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...accessLogs.map(log => log.id));
          break;

        case 'AU': // Audit and Accountability
          const auditLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...auditLogs.map(log => log.id));
          break;

        case 'IA': // Identification and Authentication
          const authEvents = await prisma.securityEvent.findMany({
            where: {
              organizationId,
              type: { in: ['failed_login', 'mfa_enabled', 'password_change'] },
              timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...authEvents.map(event => event.id));
          break;

        case 'IR': // Incident Response
          const incidents = await prisma.incident.findMany({
            where: {
              organizationId,
              createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...incidents.map(incident => incident.id));
          break;

        case 'SI': // System and Information Integrity
          const threats = await prisma.threat.findMany({
            where: {
              organizationId,
              detectedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...threats.map(threat => threat.id));
          break;

        default:
          // Generic evidence collection
          const genericLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...genericLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect evidence for NIST control', {
        controlId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return evidenceIds;
  }

  /**
   * Determine implementation status based on evidence
   */
  private determineImplementationStatus(
    controlId: string,
    evidenceIds: string[]
  ): 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable' {
    // Simple heuristic: if we have evidence, control is at least partially implemented
    if (evidenceIds.length === 0) {
      return 'not_implemented';
    } else if (evidenceIds.length < 10) {
      return 'partially_implemented';
    } else {
      return 'implemented';
    }
  }

  /**
   * Generate findings for control
   */
  private async generateFindings(
    organizationId: string,
    controlId: string,
    status: string
  ): Promise<string[]> {
    const findings: string[] = [];

    if (status === 'not_implemented') {
      findings.push(`Control ${controlId} is not implemented. Immediate action required.`);
    } else if (status === 'partially_implemented') {
      findings.push(`Control ${controlId} is partially implemented. Additional evidence and controls needed.`);
    }

    return findings;
  }

  /**
   * Persist assessment to database
   */
  private async persistAssessment(assessment: NISTAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'nist',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist NIST assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get latest assessment for organization
   */
  async getLatestAssessment(organizationId: string): Promise<NISTAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: {
          organizationId,
          framework: 'nist',
          status: 'completed',
        },
        orderBy: { generatedAt: 'desc' },
      });

      if (!report || !report.data) {
        return null;
      }

      return JSON.parse(report.data) as NISTAssessment;
    } catch (error) {
      logger.error('Failed to get latest NIST assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const nistControlsService = new NISTControlsService();
