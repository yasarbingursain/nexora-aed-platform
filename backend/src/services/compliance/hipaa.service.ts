/**
 * HIPAA Security Rule Compliance Service
 * Health Insurance Portability and Accountability Act Implementation
 * 
 * Standards: HIPAA Security Rule (45 CFR Part 164 Subpart C)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface HIPAASafeguard {
  safeguardId: string;
  category: 'administrative' | 'physical' | 'technical';
  standard: string;
  implementation: 'required' | 'addressable';
  implemented: boolean;
  implementationStatus: 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable';
  evidenceIds: string[];
  baaInPlace: boolean;
  lastAssessed: Date;
  findings: string[];
}

export interface HIPAAAssessment {
  organizationId: string;
  safeguards: HIPAASafeguard[];
  overallCompliance: number;
  administrativeCompliance: number;
  physicalCompliance: number;
  technicalCompliance: number;
  riskAssessmentCompleted: boolean;
  baaTemplateAvailable: boolean;
  breachNotificationProcedure: boolean;
  assessmentDate: Date;
  nextAssessmentDue: Date;
}

export class HIPAAService {
  /**
   * Assess HIPAA Security Rule compliance
   */
  async assessCompliance(organizationId: string): Promise<HIPAAAssessment> {
    logger.info('Starting HIPAA Security Rule compliance assessment', { organizationId });

    const safeguards = this.getAllSafeguards();
    const assessedSafeguards: HIPAASafeguard[] = [];

    for (const safeguard of safeguards) {
      const assessment = await this.assessSafeguard(organizationId, safeguard);
      assessedSafeguards.push(assessment);
    }

    const scores = this.calculateCategoryScores(assessedSafeguards);

    const assessment: HIPAAAssessment = {
      organizationId,
      safeguards: assessedSafeguards,
      overallCompliance: scores.overall,
      administrativeCompliance: scores.administrative,
      physicalCompliance: scores.physical,
      technicalCompliance: scores.technical,
      riskAssessmentCompleted: await this.checkRiskAssessment(organizationId),
      baaTemplateAvailable: true, // Should check actual template existence
      breachNotificationProcedure: true, // Should check actual procedure
      assessmentDate: new Date(),
      nextAssessmentDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'hipaa_compliance_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallCompliance: scores.overall, safeguardsAssessed: assessedSafeguards.length },
      severity: 'critical',
    });

    return assessment;
  }

  /**
   * Assess individual HIPAA safeguard
   */
  private async assessSafeguard(
    organizationId: string,
    safeguardDef: Partial<HIPAASafeguard>
  ): Promise<HIPAASafeguard> {
    const evidence = await this.collectEvidence(organizationId, safeguardDef.safeguardId!);
    const implementationStatus = this.determineImplementationStatus(evidence, safeguardDef.implementation!);
    const findings = this.generateFindings(safeguardDef.safeguardId!, implementationStatus, safeguardDef.implementation!);

    return {
      safeguardId: safeguardDef.safeguardId!,
      category: safeguardDef.category!,
      standard: safeguardDef.standard!,
      implementation: safeguardDef.implementation!,
      implemented: implementationStatus === 'implemented',
      implementationStatus,
      evidenceIds: evidence,
      baaInPlace: true, // Should check actual BAA
      lastAssessed: new Date(),
      findings,
    };
  }

  /**
   * Get all HIPAA Security Rule safeguards
   */
  private getAllSafeguards(): Partial<HIPAASafeguard>[] {
    return [
      // Administrative Safeguards
      {
        safeguardId: '164.308(a)(1)(i)',
        category: 'administrative',
        standard: 'Security Management Process - Risk Analysis',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(1)(ii)(A)',
        category: 'administrative',
        standard: 'Security Management Process - Risk Management',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(1)(ii)(B)',
        category: 'administrative',
        standard: 'Security Management Process - Sanction Policy',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(1)(ii)(C)',
        category: 'administrative',
        standard: 'Security Management Process - Information System Activity Review',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(2)',
        category: 'administrative',
        standard: 'Assigned Security Responsibility',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(3)(i)',
        category: 'administrative',
        standard: 'Workforce Security - Authorization and/or Supervision',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(3)(ii)(A)',
        category: 'administrative',
        standard: 'Workforce Security - Workforce Clearance Procedure',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(3)(ii)(B)',
        category: 'administrative',
        standard: 'Workforce Security - Termination Procedures',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(4)(i)',
        category: 'administrative',
        standard: 'Information Access Management - Isolating Health Care Clearinghouse Functions',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(4)(ii)(A)',
        category: 'administrative',
        standard: 'Information Access Management - Access Authorization',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(4)(ii)(B)',
        category: 'administrative',
        standard: 'Information Access Management - Access Establishment and Modification',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(5)(i)',
        category: 'administrative',
        standard: 'Security Awareness and Training',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(5)(ii)(A)',
        category: 'administrative',
        standard: 'Security Awareness and Training - Security Reminders',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(5)(ii)(B)',
        category: 'administrative',
        standard: 'Security Awareness and Training - Protection from Malicious Software',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(5)(ii)(C)',
        category: 'administrative',
        standard: 'Security Awareness and Training - Log-in Monitoring',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(5)(ii)(D)',
        category: 'administrative',
        standard: 'Security Awareness and Training - Password Management',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(6)(i)',
        category: 'administrative',
        standard: 'Security Incident Procedures',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(6)(ii)',
        category: 'administrative',
        standard: 'Security Incident Procedures - Response and Reporting',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(7)(i)',
        category: 'administrative',
        standard: 'Contingency Plan',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(7)(ii)(A)',
        category: 'administrative',
        standard: 'Contingency Plan - Data Backup Plan',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(7)(ii)(B)',
        category: 'administrative',
        standard: 'Contingency Plan - Disaster Recovery Plan',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(7)(ii)(C)',
        category: 'administrative',
        standard: 'Contingency Plan - Emergency Mode Operation Plan',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(a)(7)(ii)(D)',
        category: 'administrative',
        standard: 'Contingency Plan - Testing and Revision Procedures',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(7)(ii)(E)',
        category: 'administrative',
        standard: 'Contingency Plan - Applications and Data Criticality Analysis',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.308(a)(8)',
        category: 'administrative',
        standard: 'Evaluation',
        implementation: 'required',
      },
      {
        safeguardId: '164.308(b)(1)',
        category: 'administrative',
        standard: 'Business Associate Contracts and Other Arrangements',
        implementation: 'required',
      },

      // Physical Safeguards
      {
        safeguardId: '164.310(a)(1)',
        category: 'physical',
        standard: 'Facility Access Controls',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(a)(2)(i)',
        category: 'physical',
        standard: 'Facility Access Controls - Contingency Operations',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.310(a)(2)(ii)',
        category: 'physical',
        standard: 'Facility Access Controls - Facility Security Plan',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.310(a)(2)(iii)',
        category: 'physical',
        standard: 'Facility Access Controls - Access Control and Validation Procedures',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.310(a)(2)(iv)',
        category: 'physical',
        standard: 'Facility Access Controls - Maintenance Records',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.310(b)',
        category: 'physical',
        standard: 'Workstation Use',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(c)',
        category: 'physical',
        standard: 'Workstation Security',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(d)(1)',
        category: 'physical',
        standard: 'Device and Media Controls',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(d)(2)(i)',
        category: 'physical',
        standard: 'Device and Media Controls - Disposal',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(d)(2)(ii)',
        category: 'physical',
        standard: 'Device and Media Controls - Media Re-use',
        implementation: 'required',
      },
      {
        safeguardId: '164.310(d)(2)(iii)',
        category: 'physical',
        standard: 'Device and Media Controls - Accountability',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.310(d)(2)(iv)',
        category: 'physical',
        standard: 'Device and Media Controls - Data Backup and Storage',
        implementation: 'addressable',
      },

      // Technical Safeguards
      {
        safeguardId: '164.312(a)(1)',
        category: 'technical',
        standard: 'Access Control',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(a)(2)(i)',
        category: 'technical',
        standard: 'Access Control - Unique User Identification',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(a)(2)(ii)',
        category: 'technical',
        standard: 'Access Control - Emergency Access Procedure',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(a)(2)(iii)',
        category: 'technical',
        standard: 'Access Control - Automatic Logoff',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.312(a)(2)(iv)',
        category: 'technical',
        standard: 'Access Control - Encryption and Decryption',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.312(b)',
        category: 'technical',
        standard: 'Audit Controls',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(c)(1)',
        category: 'technical',
        standard: 'Integrity',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(c)(2)',
        category: 'technical',
        standard: 'Integrity - Mechanism to Authenticate ePHI',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.312(d)',
        category: 'technical',
        standard: 'Person or Entity Authentication',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(e)(1)',
        category: 'technical',
        standard: 'Transmission Security',
        implementation: 'required',
      },
      {
        safeguardId: '164.312(e)(2)(i)',
        category: 'technical',
        standard: 'Transmission Security - Integrity Controls',
        implementation: 'addressable',
      },
      {
        safeguardId: '164.312(e)(2)(ii)',
        category: 'technical',
        standard: 'Transmission Security - Encryption',
        implementation: 'addressable',
      },
    ];
  }

  /**
   * Collect evidence for safeguard
   */
  private async collectEvidence(organizationId: string, safeguardId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      const category = safeguardId.split('(')[1]?.charAt(0);

      if (category === 'a') {
        // Administrative safeguards
        const adminLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['policy_updated', 'training_completed', 'risk_assessment', 'incident_response'] },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...adminLogs.map(log => log.id));
      } else if (category === 'b') {
        // Physical safeguards (limited in SaaS context)
        const physicalLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { contains: 'physical' },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 20,
        });
        evidenceIds.push(...physicalLogs.map(log => log.id));
      } else {
        // Technical safeguards
        const techLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['user_login', 'access_granted', 'access_denied', 'data_encrypted', 'audit_log_created'] },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...techLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect HIPAA evidence', {
        safeguardId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return evidenceIds;
  }

  /**
   * Determine implementation status
   */
  private determineImplementationStatus(
    evidence: string[],
    implementation: 'required' | 'addressable'
  ): 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable' {
    if (evidence.length === 0) {
      return implementation === 'addressable' ? 'not_applicable' : 'not_implemented';
    } else if (evidence.length < 10) {
      return 'partially_implemented';
    } else {
      return 'implemented';
    }
  }

  /**
   * Generate findings
   */
  private generateFindings(
    safeguardId: string,
    status: string,
    implementation: 'required' | 'addressable'
  ): string[] {
    const findings: string[] = [];

    if (status === 'not_implemented' && implementation === 'required') {
      findings.push(`CRITICAL: Required safeguard ${safeguardId} is not implemented`);
    } else if (status === 'partially_implemented') {
      findings.push(`Safeguard ${safeguardId} is partially implemented. Additional evidence needed.`);
    }

    return findings;
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(safeguards: HIPAASafeguard[]): {
    overall: number;
    administrative: number;
    physical: number;
    technical: number;
  } {
    const adminSafeguards = safeguards.filter(s => s.category === 'administrative');
    const physicalSafeguards = safeguards.filter(s => s.category === 'physical');
    const technicalSafeguards = safeguards.filter(s => s.category === 'technical');

    const calculateScore = (safeguardSet: HIPAASafeguard[]) => {
      if (safeguardSet.length === 0) return 100;
      const implemented = safeguardSet.filter(s => s.implementationStatus === 'implemented').length;
      return (implemented / safeguardSet.length) * 100;
    };

    return {
      overall: calculateScore(safeguards),
      administrative: calculateScore(adminSafeguards),
      physical: calculateScore(physicalSafeguards),
      technical: calculateScore(technicalSafeguards),
    };
  }

  /**
   * Check if risk assessment completed
   */
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

  /**
   * Persist assessment
   */
  private async persistAssessment(assessment: HIPAAAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'hipaa',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist HIPAA assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get latest assessment
   */
  async getLatestAssessment(organizationId: string): Promise<HIPAAAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: {
          organizationId,
          framework: 'hipaa',
          status: 'completed',
        },
        orderBy: { generatedAt: 'desc' },
      });

      if (!report || !report.data) {
        return null;
      }

      return JSON.parse(report.data) as HIPAAAssessment;
    } catch (error) {
      logger.error('Failed to get latest HIPAA assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const hipaaService = new HIPAAService();
