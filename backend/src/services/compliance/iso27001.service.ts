/**
 * ISO 27001:2022 ISMS Implementation Service
 * Information Security Management System
 * 
 * Standards: ISO/IEC 27001:2022, ISO/IEC 27002:2022
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface ISO27001Control {
  controlId: string;
  controlName: string;
  category: string;
  annex: 'A';
  implemented: boolean;
  implementationLevel: 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable';
  evidenceIds: string[];
  statementOfApplicability: string;
  lastAssessed: Date;
  assessor: string;
  riskTreatment: 'mitigate' | 'accept' | 'transfer' | 'avoid';
}

export interface ISO27001Assessment {
  organizationId: string;
  controls: ISO27001Control[];
  overallCompliance: number;
  organizationalControls: number;
  peopleControls: number;
  physicalControls: number;
  technologicalControls: number;
  ismsEstablished: boolean;
  scopeDefined: boolean;
  riskAssessmentCompleted: boolean;
  certificationReady: boolean;
  assessmentDate: Date;
  nextAssessmentDue: Date;
}

export class ISO27001Service {
  /**
   * Assess ISO 27001:2022 compliance
   */
  async assessCompliance(organizationId: string): Promise<ISO27001Assessment> {
    logger.info('Starting ISO 27001:2022 compliance assessment', { organizationId });

    const controls = this.getAllControls();
    const assessedControls: ISO27001Control[] = [];

    for (const control of controls) {
      const assessment = await this.assessControl(organizationId, control);
      assessedControls.push(assessment);
    }

    const scores = this.calculateCategoryScores(assessedControls);
    const certificationReady = scores.overall >= 95 && this.checkISMSRequirements(assessedControls);

    const assessment: ISO27001Assessment = {
      organizationId,
      controls: assessedControls,
      overallCompliance: scores.overall,
      organizationalControls: scores.organizational,
      peopleControls: scores.people,
      physicalControls: scores.physical,
      technologicalControls: scores.technological,
      ismsEstablished: true,
      scopeDefined: true,
      riskAssessmentCompleted: await this.checkRiskAssessment(organizationId),
      certificationReady,
      assessmentDate: new Date(),
      nextAssessmentDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'iso27001_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallCompliance: scores.overall, certificationReady },
      severity: 'high',
    });

    return assessment;
  }

  /**
   * Assess individual ISO 27001 control
   */
  private async assessControl(
    organizationId: string,
    controlDef: Partial<ISO27001Control>
  ): Promise<ISO27001Control> {
    const evidence = await this.collectEvidence(organizationId, controlDef.controlId!);
    const implementationLevel = this.determineImplementationLevel(evidence);

    return {
      controlId: controlDef.controlId!,
      controlName: controlDef.controlName!,
      category: controlDef.category!,
      annex: 'A',
      implemented: implementationLevel === 'implemented',
      implementationLevel,
      evidenceIds: evidence,
      statementOfApplicability: this.generateSOA(controlDef.controlId!, implementationLevel),
      lastAssessed: new Date(),
      assessor: 'system',
      riskTreatment: implementationLevel === 'implemented' ? 'mitigate' : 'accept',
    };
  }

  /**
   * Get all ISO 27001:2022 Annex A controls
   */
  private getAllControls(): Partial<ISO27001Control>[] {
    return [
      // Organizational Controls (5.x)
      { controlId: 'A.5.1', controlName: 'Policies for information security', category: 'Organizational' },
      { controlId: 'A.5.2', controlName: 'Information security roles and responsibilities', category: 'Organizational' },
      { controlId: 'A.5.3', controlName: 'Segregation of duties', category: 'Organizational' },
      { controlId: 'A.5.4', controlName: 'Management responsibilities', category: 'Organizational' },
      { controlId: 'A.5.5', controlName: 'Contact with authorities', category: 'Organizational' },
      { controlId: 'A.5.6', controlName: 'Contact with special interest groups', category: 'Organizational' },
      { controlId: 'A.5.7', controlName: 'Threat intelligence', category: 'Organizational' },
      { controlId: 'A.5.8', controlName: 'Information security in project management', category: 'Organizational' },
      { controlId: 'A.5.9', controlName: 'Inventory of information and other associated assets', category: 'Organizational' },
      { controlId: 'A.5.10', controlName: 'Acceptable use of information and other associated assets', category: 'Organizational' },
      { controlId: 'A.5.11', controlName: 'Return of assets', category: 'Organizational' },
      { controlId: 'A.5.12', controlName: 'Classification of information', category: 'Organizational' },
      { controlId: 'A.5.13', controlName: 'Labelling of information', category: 'Organizational' },
      { controlId: 'A.5.14', controlName: 'Information transfer', category: 'Organizational' },
      { controlId: 'A.5.15', controlName: 'Access control', category: 'Organizational' },
      { controlId: 'A.5.16', controlName: 'Identity management', category: 'Organizational' },
      { controlId: 'A.5.17', controlName: 'Authentication information', category: 'Organizational' },
      { controlId: 'A.5.18', controlName: 'Access rights', category: 'Organizational' },
      { controlId: 'A.5.19', controlName: 'Information security in supplier relationships', category: 'Organizational' },
      { controlId: 'A.5.20', controlName: 'Addressing information security within supplier agreements', category: 'Organizational' },
      { controlId: 'A.5.21', controlName: 'Managing information security in the ICT supply chain', category: 'Organizational' },
      { controlId: 'A.5.22', controlName: 'Monitoring, review and change management of supplier services', category: 'Organizational' },
      { controlId: 'A.5.23', controlName: 'Information security for use of cloud services', category: 'Organizational' },
      { controlId: 'A.5.24', controlName: 'Information security incident management planning and preparation', category: 'Organizational' },
      { controlId: 'A.5.25', controlName: 'Assessment and decision on information security events', category: 'Organizational' },
      { controlId: 'A.5.26', controlName: 'Response to information security incidents', category: 'Organizational' },
      { controlId: 'A.5.27', controlName: 'Learning from information security incidents', category: 'Organizational' },
      { controlId: 'A.5.28', controlName: 'Collection of evidence', category: 'Organizational' },
      { controlId: 'A.5.29', controlName: 'Information security during disruption', category: 'Organizational' },
      { controlId: 'A.5.30', controlName: 'ICT readiness for business continuity', category: 'Organizational' },
      { controlId: 'A.5.31', controlName: 'Legal, statutory, regulatory and contractual requirements', category: 'Organizational' },
      { controlId: 'A.5.32', controlName: 'Intellectual property rights', category: 'Organizational' },
      { controlId: 'A.5.33', controlName: 'Protection of records', category: 'Organizational' },
      { controlId: 'A.5.34', controlName: 'Privacy and protection of PII', category: 'Organizational' },
      { controlId: 'A.5.35', controlName: 'Independent review of information security', category: 'Organizational' },
      { controlId: 'A.5.36', controlName: 'Compliance with policies, rules and standards for information security', category: 'Organizational' },
      { controlId: 'A.5.37', controlName: 'Documented operating procedures', category: 'Organizational' },

      // People Controls (6.x)
      { controlId: 'A.6.1', controlName: 'Screening', category: 'People' },
      { controlId: 'A.6.2', controlName: 'Terms and conditions of employment', category: 'People' },
      { controlId: 'A.6.3', controlName: 'Information security awareness, education and training', category: 'People' },
      { controlId: 'A.6.4', controlName: 'Disciplinary process', category: 'People' },
      { controlId: 'A.6.5', controlName: 'Responsibilities after termination or change of employment', category: 'People' },
      { controlId: 'A.6.6', controlName: 'Confidentiality or non-disclosure agreements', category: 'People' },
      { controlId: 'A.6.7', controlName: 'Remote working', category: 'People' },
      { controlId: 'A.6.8', controlName: 'Information security event reporting', category: 'People' },

      // Physical Controls (7.x)
      { controlId: 'A.7.1', controlName: 'Physical security perimeters', category: 'Physical' },
      { controlId: 'A.7.2', controlName: 'Physical entry', category: 'Physical' },
      { controlId: 'A.7.3', controlName: 'Securing offices, rooms and facilities', category: 'Physical' },
      { controlId: 'A.7.4', controlName: 'Physical security monitoring', category: 'Physical' },
      { controlId: 'A.7.5', controlName: 'Protecting against physical and environmental threats', category: 'Physical' },
      { controlId: 'A.7.6', controlName: 'Working in secure areas', category: 'Physical' },
      { controlId: 'A.7.7', controlName: 'Clear desk and clear screen', category: 'Physical' },
      { controlId: 'A.7.8', controlName: 'Equipment siting and protection', category: 'Physical' },
      { controlId: 'A.7.9', controlName: 'Security of assets off-premises', category: 'Physical' },
      { controlId: 'A.7.10', controlName: 'Storage media', category: 'Physical' },
      { controlId: 'A.7.11', controlName: 'Supporting utilities', category: 'Physical' },
      { controlId: 'A.7.12', controlName: 'Cabling security', category: 'Physical' },
      { controlId: 'A.7.13', controlName: 'Equipment maintenance', category: 'Physical' },
      { controlId: 'A.7.14', controlName: 'Secure disposal or re-use of equipment', category: 'Physical' },

      // Technological Controls (8.x)
      { controlId: 'A.8.1', controlName: 'User endpoint devices', category: 'Technological' },
      { controlId: 'A.8.2', controlName: 'Privileged access rights', category: 'Technological' },
      { controlId: 'A.8.3', controlName: 'Information access restriction', category: 'Technological' },
      { controlId: 'A.8.4', controlName: 'Access to source code', category: 'Technological' },
      { controlId: 'A.8.5', controlName: 'Secure authentication', category: 'Technological' },
      { controlId: 'A.8.6', controlName: 'Capacity management', category: 'Technological' },
      { controlId: 'A.8.7', controlName: 'Protection against malware', category: 'Technological' },
      { controlId: 'A.8.8', controlName: 'Management of technical vulnerabilities', category: 'Technological' },
      { controlId: 'A.8.9', controlName: 'Configuration management', category: 'Technological' },
      { controlId: 'A.8.10', controlName: 'Information deletion', category: 'Technological' },
      { controlId: 'A.8.11', controlName: 'Data masking', category: 'Technological' },
      { controlId: 'A.8.12', controlName: 'Data leakage prevention', category: 'Technological' },
      { controlId: 'A.8.13', controlName: 'Information backup', category: 'Technological' },
      { controlId: 'A.8.14', controlName: 'Redundancy of information processing facilities', category: 'Technological' },
      { controlId: 'A.8.15', controlName: 'Logging', category: 'Technological' },
      { controlId: 'A.8.16', controlName: 'Monitoring activities', category: 'Technological' },
      { controlId: 'A.8.17', controlName: 'Clock synchronization', category: 'Technological' },
      { controlId: 'A.8.18', controlName: 'Use of privileged utility programs', category: 'Technological' },
      { controlId: 'A.8.19', controlName: 'Installation of software on operational systems', category: 'Technological' },
      { controlId: 'A.8.20', controlName: 'Networks security', category: 'Technological' },
      { controlId: 'A.8.21', controlName: 'Security of network services', category: 'Technological' },
      { controlId: 'A.8.22', controlName: 'Segregation of networks', category: 'Technological' },
      { controlId: 'A.8.23', controlName: 'Web filtering', category: 'Technological' },
      { controlId: 'A.8.24', controlName: 'Use of cryptography', category: 'Technological' },
      { controlId: 'A.8.25', controlName: 'Secure development life cycle', category: 'Technological' },
      { controlId: 'A.8.26', controlName: 'Application security requirements', category: 'Technological' },
      { controlId: 'A.8.27', controlName: 'Secure system architecture and engineering principles', category: 'Technological' },
      { controlId: 'A.8.28', controlName: 'Secure coding', category: 'Technological' },
      { controlId: 'A.8.29', controlName: 'Security testing in development and acceptance', category: 'Technological' },
      { controlId: 'A.8.30', controlName: 'Outsourced development', category: 'Technological' },
      { controlId: 'A.8.31', controlName: 'Separation of development, test and production environments', category: 'Technological' },
      { controlId: 'A.8.32', controlName: 'Change management', category: 'Technological' },
      { controlId: 'A.8.33', controlName: 'Test information', category: 'Technological' },
      { controlId: 'A.8.34', controlName: 'Protection of information systems during audit testing', category: 'Technological' },
    ];
  }

  /**
   * Collect evidence for control
   */
  private async collectEvidence(organizationId: string, controlId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      const category = controlId.split('.')[1];

      if (category === '5') {
        // Organizational controls
        const orgLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['policy_updated', 'risk_assessment', 'asset_inventory', 'supplier_review'] },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...orgLogs.map(log => log.id));
      } else if (category === '6') {
        // People controls
        const peopleLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['training_completed', 'user_onboarded', 'user_offboarded', 'background_check'] },
            timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          take: 50,
        });
        evidenceIds.push(...peopleLogs.map(log => log.id));
      } else if (category === '8') {
        // Technological controls
        const techLogs = await prisma.auditLog.findMany({
          where: {
            organizationId,
            event: { in: ['access_control', 'encryption', 'vulnerability_scan', 'backup_completed', 'change_deployed'] },
            timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          take: 100,
        });
        evidenceIds.push(...techLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect ISO 27001 evidence', {
        controlId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return evidenceIds;
  }

  /**
   * Determine implementation level
   */
  private determineImplementationLevel(evidence: string[]): 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable' {
    if (evidence.length === 0) {
      return 'not_implemented';
    } else if (evidence.length < 10) {
      return 'partially_implemented';
    } else {
      return 'implemented';
    }
  }

  /**
   * Generate Statement of Applicability
   */
  private generateSOA(controlId: string, implementationLevel: string): string {
    if (implementationLevel === 'implemented') {
      return `Control ${controlId} is applicable and implemented. Evidence collected demonstrates effective implementation.`;
    } else if (implementationLevel === 'partially_implemented') {
      return `Control ${controlId} is applicable and partially implemented. Additional implementation required.`;
    } else if (implementationLevel === 'not_applicable') {
      return `Control ${controlId} is not applicable to this organization's scope.`;
    } else {
      return `Control ${controlId} is applicable but not yet implemented. Implementation required.`;
    }
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(controls: ISO27001Control[]): {
    overall: number;
    organizational: number;
    people: number;
    physical: number;
    technological: number;
  } {
    const orgControls = controls.filter(c => c.category === 'Organizational');
    const peopleControls = controls.filter(c => c.category === 'People');
    const physicalControls = controls.filter(c => c.category === 'Physical');
    const techControls = controls.filter(c => c.category === 'Technological');

    const calculateScore = (controlSet: ISO27001Control[]) => {
      if (controlSet.length === 0) return 100;
      const implemented = controlSet.filter(c => c.implementationLevel === 'implemented').length;
      return (implemented / controlSet.length) * 100;
    };

    return {
      overall: calculateScore(controls),
      organizational: calculateScore(orgControls),
      people: calculateScore(peopleControls),
      physical: calculateScore(physicalControls),
      technological: calculateScore(techControls),
    };
  }

  /**
   * Check ISMS requirements
   */
  private checkISMSRequirements(controls: ISO27001Control[]): boolean {
    // Key requirements for ISMS
    const keyControls = ['A.5.1', 'A.5.2', 'A.5.24', 'A.8.15', 'A.8.16'];
    const keyControlsImplemented = controls.filter(c => 
      keyControls.includes(c.controlId) && c.implementationLevel === 'implemented'
    ).length;

    return keyControlsImplemented === keyControls.length;
  }

  /**
   * Check risk assessment
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
  private async persistAssessment(assessment: ISO27001Assessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'iso27001',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist ISO 27001 assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get latest assessment
   */
  async getLatestAssessment(organizationId: string): Promise<ISO27001Assessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: {
          organizationId,
          framework: 'iso27001',
          status: 'completed',
        },
        orderBy: { generatedAt: 'desc' },
      });

      if (!report || !report.data) {
        return null;
      }

      return JSON.parse(report.data) as ISO27001Assessment;
    } catch (error) {
      logger.error('Failed to get latest ISO 27001 assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const iso27001Service = new ISO27001Service();
