/**
 * CSA STAR Certification Service
 * Cloud Security Alliance Security, Trust, Assurance and Risk Registry
 * 
 * Standards: CSA CCM v4.0, CSA STAR Level 1/2
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface CSACCMControl {
  controlId: string;
  controlTitle: string;
  domain: string;
  controlSpecification: string;
  implemented: boolean;
  implementationGuidance: string;
  evidenceIds: string[];
  lastAssessed: Date;
}

export interface CSASTARAssessment {
  organizationId: string;
  starLevel: 'self_assessment' | 'certification' | 'attestation' | 'continuous';
  controls: CSACCMControl[];
  overallCompliance: number;
  domainScores: Record<string, number>;
  certificationReady: boolean;
  assessmentDate: Date;
}

export class CSASTARService {
  async assessCompliance(organizationId: string): Promise<CSASTARAssessment> {
    logger.info('Starting CSA STAR compliance assessment', { organizationId });

    const controls = this.getCSACCMControls();
    const assessedControls: CSACCMControl[] = [];

    for (const control of controls) {
      const assessment = await this.assessControl(organizationId, control);
      assessedControls.push(assessment);
    }

    const domainScores = this.calculateDomainScores(assessedControls);
    const overallCompliance = Object.values(domainScores).reduce((sum, score) => sum + score, 0) / Object.keys(domainScores).length;

    const assessment: CSASTARAssessment = {
      organizationId,
      starLevel: 'self_assessment',
      controls: assessedControls,
      overallCompliance,
      domainScores,
      certificationReady: overallCompliance >= 95,
      assessmentDate: new Date(),
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'csa_star_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallCompliance, certificationReady: assessment.certificationReady },
      severity: 'high',
    });

    return assessment;
  }

  private getCSACCMControls(): Partial<CSACCMControl>[] {
    return [
      // Application & Interface Security (AIS)
      { controlId: 'AIS-01', controlTitle: 'Application Security', domain: 'AIS', controlSpecification: 'Applications are designed and developed with security controls', implementationGuidance: 'Implement secure SDLC' },
      { controlId: 'AIS-02', controlTitle: 'Customer Access Requirements', domain: 'AIS', controlSpecification: 'Customer access to data and applications is controlled', implementationGuidance: 'Implement access controls' },
      { controlId: 'AIS-03', controlTitle: 'Data Integrity', domain: 'AIS', controlSpecification: 'Data integrity is maintained', implementationGuidance: 'Implement data validation' },

      // Audit Assurance & Compliance (AAC)
      { controlId: 'AAC-01', controlTitle: 'Audit Planning', domain: 'AAC', controlSpecification: 'Audit activities are planned and executed', implementationGuidance: 'Establish audit program' },
      { controlId: 'AAC-02', controlTitle: 'Independent Audits', domain: 'AAC', controlSpecification: 'Independent audits are conducted', implementationGuidance: 'Engage third-party auditors' },
      { controlId: 'AAC-03', controlTitle: 'Information System Regulatory Mapping', domain: 'AAC', controlSpecification: 'Compliance requirements are mapped', implementationGuidance: 'Maintain compliance matrix' },

      // Business Continuity Management & Operational Resilience (BCR)
      { controlId: 'BCR-01', controlTitle: 'Business Continuity Planning', domain: 'BCR', controlSpecification: 'BCP is established and maintained', implementationGuidance: 'Develop and test BCP' },
      { controlId: 'BCR-02', controlTitle: 'Business Continuity Testing', domain: 'BCR', controlSpecification: 'BCP is tested regularly', implementationGuidance: 'Conduct annual tests' },
      { controlId: 'BCR-03', controlTitle: 'Datacenter Utilities', domain: 'BCR', controlSpecification: 'Datacenter utilities are redundant', implementationGuidance: 'Implement redundancy' },

      // Change Control & Configuration Management (CCC)
      { controlId: 'CCC-01', controlTitle: 'Change Management', domain: 'CCC', controlSpecification: 'Changes are managed and controlled', implementationGuidance: 'Implement change control process' },
      { controlId: 'CCC-02', controlTitle: 'Configuration Management', domain: 'CCC', controlSpecification: 'Configurations are managed', implementationGuidance: 'Maintain configuration baselines' },
      { controlId: 'CCC-03', controlTitle: 'Quality Testing', domain: 'CCC', controlSpecification: 'Changes are tested before deployment', implementationGuidance: 'Implement testing procedures' },

      // Cryptography, Encryption & Key Management (CEK)
      { controlId: 'CEK-01', controlTitle: 'Encryption', domain: 'CEK', controlSpecification: 'Data is encrypted at rest and in transit', implementationGuidance: 'Implement encryption' },
      { controlId: 'CEK-02', controlTitle: 'Key Management', domain: 'CEK', controlSpecification: 'Cryptographic keys are managed', implementationGuidance: 'Implement key management' },
      { controlId: 'CEK-03', controlTitle: 'Sensitive Data Protection', domain: 'CEK', controlSpecification: 'Sensitive data is protected', implementationGuidance: 'Classify and protect data' },

      // Datacenter Security (DCS)
      { controlId: 'DCS-01', controlTitle: 'Physical Security', domain: 'DCS', controlSpecification: 'Physical security controls are implemented', implementationGuidance: 'Implement physical controls' },
      { controlId: 'DCS-02', controlTitle: 'Environmental Controls', domain: 'DCS', controlSpecification: 'Environmental controls are in place', implementationGuidance: 'Monitor environment' },

      // Data Security & Privacy Lifecycle Management (DSP)
      { controlId: 'DSP-01', controlTitle: 'Data Inventory', domain: 'DSP', controlSpecification: 'Data inventory is maintained', implementationGuidance: 'Catalog all data' },
      { controlId: 'DSP-02', controlTitle: 'Data Classification', domain: 'DSP', controlSpecification: 'Data is classified', implementationGuidance: 'Implement classification scheme' },
      { controlId: 'DSP-03', controlTitle: 'Data Retention', domain: 'DSP', controlSpecification: 'Data retention policies are enforced', implementationGuidance: 'Define retention periods' },
      { controlId: 'DSP-04', controlTitle: 'Data Disposal', domain: 'DSP', controlSpecification: 'Data is securely disposed', implementationGuidance: 'Implement secure disposal' },

      // Governance, Risk & Compliance (GRC)
      { controlId: 'GRC-01', controlTitle: 'Governance Program', domain: 'GRC', controlSpecification: 'Governance program is established', implementationGuidance: 'Establish governance framework' },
      { controlId: 'GRC-02', controlTitle: 'Risk Management', domain: 'GRC', controlSpecification: 'Risk management program exists', implementationGuidance: 'Conduct risk assessments' },
      { controlId: 'GRC-03', controlTitle: 'Compliance Management', domain: 'GRC', controlSpecification: 'Compliance is monitored', implementationGuidance: 'Track compliance status' },

      // Human Resources (HRS)
      { controlId: 'HRS-01', controlTitle: 'Background Screening', domain: 'HRS', controlSpecification: 'Background checks are conducted', implementationGuidance: 'Screen all employees' },
      { controlId: 'HRS-02', controlTitle: 'Security Awareness Training', domain: 'HRS', controlSpecification: 'Security training is provided', implementationGuidance: 'Conduct annual training' },
      { controlId: 'HRS-03', controlTitle: 'Termination Procedures', domain: 'HRS', controlSpecification: 'Termination procedures exist', implementationGuidance: 'Revoke access promptly' },

      // Identity & Access Management (IAM)
      { controlId: 'IAM-01', controlTitle: 'Access Control', domain: 'IAM', controlSpecification: 'Access is controlled and monitored', implementationGuidance: 'Implement least privilege' },
      { controlId: 'IAM-02', controlTitle: 'User Access Provisioning', domain: 'IAM', controlSpecification: 'User access is provisioned', implementationGuidance: 'Automate provisioning' },
      { controlId: 'IAM-03', controlTitle: 'User Access Deprovisioning', domain: 'IAM', controlSpecification: 'User access is deprovisioned', implementationGuidance: 'Automate deprovisioning' },

      // Infrastructure & Virtualization Security (IVS)
      { controlId: 'IVS-01', controlTitle: 'Network Security', domain: 'IVS', controlSpecification: 'Network security controls are implemented', implementationGuidance: 'Implement firewalls and segmentation' },
      { controlId: 'IVS-02', controlTitle: 'Vulnerability Management', domain: 'IVS', controlSpecification: 'Vulnerabilities are managed', implementationGuidance: 'Conduct regular scans' },

      // Logging & Monitoring (LOG)
      { controlId: 'LOG-01', controlTitle: 'Audit Logging', domain: 'LOG', controlSpecification: 'Audit logs are generated and retained', implementationGuidance: 'Log all security events' },
      { controlId: 'LOG-02', controlTitle: 'Log Review', domain: 'LOG', controlSpecification: 'Logs are reviewed regularly', implementationGuidance: 'Implement SIEM' },

      // Security Incident Management (SIM)
      { controlId: 'SIM-01', controlTitle: 'Incident Response', domain: 'SIM', controlSpecification: 'Incident response plan exists', implementationGuidance: 'Develop IR plan' },
      { controlId: 'SIM-02', controlTitle: 'Incident Detection', domain: 'SIM', controlSpecification: 'Incidents are detected', implementationGuidance: 'Implement detection tools' },

      // Supply Chain Management (SCM)
      { controlId: 'SCM-01', controlTitle: 'Supplier Assessment', domain: 'SCM', controlSpecification: 'Suppliers are assessed', implementationGuidance: 'Conduct due diligence' },
      { controlId: 'SCM-02', controlTitle: 'Third-Party Agreements', domain: 'SCM', controlSpecification: 'Agreements include security requirements', implementationGuidance: 'Update contracts' },

      // Threat & Vulnerability Management (TVM)
      { controlId: 'TVM-01', controlTitle: 'Threat Intelligence', domain: 'TVM', controlSpecification: 'Threat intelligence is collected', implementationGuidance: 'Subscribe to threat feeds' },
      { controlId: 'TVM-02', controlTitle: 'Vulnerability Scanning', domain: 'TVM', controlSpecification: 'Vulnerability scans are conducted', implementationGuidance: 'Scan regularly' },
    ];
  }

  private async assessControl(organizationId: string, controlDef: Partial<CSACCMControl>): Promise<CSACCMControl> {
    const evidence = await this.collectEvidence(organizationId, controlDef.controlId!);
    const implemented = evidence.length > 0;

    return {
      controlId: controlDef.controlId!,
      controlTitle: controlDef.controlTitle!,
      domain: controlDef.domain!,
      controlSpecification: controlDef.controlSpecification!,
      implemented,
      implementationGuidance: controlDef.implementationGuidance!,
      evidenceIds: evidence,
      lastAssessed: new Date(),
    };
  }

  private async collectEvidence(organizationId: string, controlId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        take: 50,
      });
      evidenceIds.push(...logs.map(log => log.id));
    } catch (error) {
      logger.error('Failed to collect CSA STAR evidence', { controlId, error });
    }

    return evidenceIds;
  }

  private calculateDomainScores(controls: CSACCMControl[]): Record<string, number> {
    const domains = [...new Set(controls.map(c => c.domain))];
    const scores: Record<string, number> = {};

    for (const domain of domains) {
      const domainControls = controls.filter(c => c.domain === domain);
      const implemented = domainControls.filter(c => c.implemented).length;
      scores[domain] = (implemented / domainControls.length) * 100;
    }

    return scores;
  }

  private async persistAssessment(assessment: CSASTARAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'csa_star',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist CSA STAR assessment', { error });
    }
  }

  async getLatestAssessment(organizationId: string): Promise<CSASTARAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: { organizationId, framework: 'csa_star', status: 'completed' },
        orderBy: { generatedAt: 'desc' },
      });
      return report?.data ? JSON.parse(report.data) : null;
    } catch (error) {
      logger.error('Failed to get CSA STAR assessment', { error });
      return null;
    }
  }
}

export const csaSTARService = new CSASTARService();
