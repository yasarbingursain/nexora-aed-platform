/**
 * PCI DSS 4.0 Compliance Service
 * Payment Card Industry Data Security Standard Implementation
 * 
 * Standards: PCI DSS v4.0
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { auditLoggingService } from '@/services/audit-logging.service';

export interface PCIDSSRequirement {
  requirementId: string;
  requirement: string;
  subRequirements: string[];
  implemented: boolean;
  testingProcedure: string;
  evidenceCollected: string[];
  compensatingControls?: string[];
  lastTested: Date;
  testResult: 'pass' | 'fail' | 'not_tested';
}

export interface PCIDSSAssessment {
  organizationId: string;
  version: '4.0';
  requirements: PCIDSSRequirement[];
  overallCompliance: number;
  inScope: boolean;
  cardholderDataEnvironment: string[];
  assessmentDate: Date;
  nextAssessmentDue: Date;
  aoaRequired: boolean;
}

export class PCIDSSService {
  /**
   * Assess PCI DSS 4.0 compliance
   */
  async assessCompliance(organizationId: string): Promise<PCIDSSAssessment> {
    logger.info('Starting PCI DSS 4.0 compliance assessment', { organizationId });

    const requirements = this.getAllRequirements();
    const assessedRequirements: PCIDSSRequirement[] = [];

    for (const requirement of requirements) {
      const assessment = await this.testRequirement(organizationId, requirement);
      assessedRequirements.push(assessment);
    }

    const passedCount = assessedRequirements.filter(r => r.testResult === 'pass').length;
    const overallCompliance = (passedCount / assessedRequirements.length) * 100;

    const assessment: PCIDSSAssessment = {
      organizationId,
      version: '4.0',
      requirements: assessedRequirements,
      overallCompliance,
      inScope: true,
      cardholderDataEnvironment: ['application', 'database', 'api'],
      assessmentDate: new Date(),
      nextAssessmentDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      aoaRequired: overallCompliance === 100,
    };

    await this.persistAssessment(assessment);

    await auditLoggingService.log({
      event: 'pci_dss_assessment',
      entityType: 'organization',
      entityId: organizationId,
      action: 'execute',
      organizationId,
      metadata: { overallCompliance, requirementsTested: assessedRequirements.length },
      severity: 'critical',
    });

    return assessment;
  }

  /**
   * Test individual PCI DSS requirement
   */
  private async testRequirement(
    organizationId: string,
    requirementDef: Partial<PCIDSSRequirement>
  ): Promise<PCIDSSRequirement> {
    const evidence = await this.collectEvidence(organizationId, requirementDef.requirementId!);
    const testResult = this.evaluateRequirement(requirementDef.requirementId!, evidence);

    return {
      requirementId: requirementDef.requirementId!,
      requirement: requirementDef.requirement!,
      subRequirements: requirementDef.subRequirements!,
      implemented: testResult === 'pass',
      testingProcedure: requirementDef.testingProcedure!,
      evidenceCollected: evidence,
      lastTested: new Date(),
      testResult,
    };
  }

  /**
   * Get all PCI DSS 4.0 requirements
   */
  private getAllRequirements(): Partial<PCIDSSRequirement>[] {
    return [
      {
        requirementId: '1',
        requirement: 'Install and Maintain Network Security Controls',
        subRequirements: [
          '1.1 Processes and mechanisms for installing and maintaining network security controls',
          '1.2 Network security controls (NSCs) are configured and maintained',
          '1.3 Network access to and from the cardholder data environment is restricted',
          '1.4 Network connections between trusted and untrusted networks are controlled',
          '1.5 Risks to the CDE from computing devices are mitigated',
        ],
        testingProcedure: 'Review firewall configurations, network diagrams, and access control lists',
      },
      {
        requirementId: '2',
        requirement: 'Apply Secure Configurations to All System Components',
        subRequirements: [
          '2.1 Processes and mechanisms for applying secure configurations',
          '2.2 System components are configured and managed securely',
          '2.3 Wireless environments are configured and managed securely',
        ],
        testingProcedure: 'Review system hardening standards and configuration baselines',
      },
      {
        requirementId: '3',
        requirement: 'Protect Stored Account Data',
        subRequirements: [
          '3.1 Processes and mechanisms for protecting stored account data',
          '3.2 Storage of account data is kept to a minimum',
          '3.3 Sensitive authentication data (SAD) is not stored after authorization',
          '3.4 Access to displays of full PAN and ability to copy PAN is restricted',
          '3.5 Primary account number (PAN) is secured wherever it is stored',
          '3.6 Cryptographic keys used to protect stored account data are secured',
          '3.7 Where cryptography is used to protect stored account data, key management processes are defined',
        ],
        testingProcedure: 'Review data retention policies, encryption implementation, and key management',
      },
      {
        requirementId: '4',
        requirement: 'Protect Cardholder Data with Strong Cryptography During Transmission',
        subRequirements: [
          '4.1 Processes and mechanisms for protecting cardholder data with strong cryptography',
          '4.2 PAN is protected with strong cryptography whenever it is transmitted',
        ],
        testingProcedure: 'Test TLS/SSL implementation and verify encryption in transit',
      },
      {
        requirementId: '5',
        requirement: 'Protect All Systems and Networks from Malicious Software',
        subRequirements: [
          '5.1 Processes and mechanisms for protecting all systems and networks from malicious software',
          '5.2 Malicious software is prevented or detected and addressed',
          '5.3 Anti-malware mechanisms and processes are active, maintained, and monitored',
          '5.4 Anti-phishing mechanisms protect users against phishing attacks',
        ],
        testingProcedure: 'Review anti-malware solutions, update procedures, and detection logs',
      },
      {
        requirementId: '6',
        requirement: 'Develop and Maintain Secure Systems and Software',
        subRequirements: [
          '6.1 Processes and mechanisms for developing and maintaining secure systems and software',
          '6.2 Bespoke and custom software are developed securely',
          '6.3 Security vulnerabilities are identified and addressed',
          '6.4 Public-facing web applications are protected against attacks',
          '6.5 Changes to all system components are managed securely',
        ],
        testingProcedure: 'Review SDLC, vulnerability management, and change control processes',
      },
      {
        requirementId: '7',
        requirement: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
        subRequirements: [
          '7.1 Processes and mechanisms for restricting access to system components and cardholder data',
          '7.2 Access to system components and data is appropriately defined and assigned',
          '7.3 Access to system components and data is managed via an access control system(s)',
        ],
        testingProcedure: 'Review access control policies, role definitions, and access logs',
      },
      {
        requirementId: '8',
        requirement: 'Identify Users and Authenticate Access to System Components',
        subRequirements: [
          '8.1 Processes and mechanisms for identifying users and authenticating access',
          '8.2 User identification and related accounts are strictly managed',
          '8.3 Strong authentication for users and administrators is established and managed',
          '8.4 Multi-factor authentication (MFA) is implemented',
          '8.5 MFA systems are configured to prevent misuse',
          '8.6 Use of application and system accounts and associated authentication factors is strictly managed',
        ],
        testingProcedure: 'Test authentication mechanisms, MFA implementation, and password policies',
      },
      {
        requirementId: '9',
        requirement: 'Restrict Physical Access to Cardholder Data',
        subRequirements: [
          '9.1 Processes and mechanisms for restricting physical access to cardholder data',
          '9.2 Physical access controls manage entry into facilities and systems containing cardholder data',
          '9.3 Physical access for personnel and visitors is authorized and managed',
          '9.4 Media with cardholder data is securely stored, accessed, distributed, and destroyed',
          '9.5 Point of interaction (POI) devices are protected from tampering and unauthorized substitution',
        ],
        testingProcedure: 'Review physical security controls, visitor logs, and media handling procedures',
      },
      {
        requirementId: '10',
        requirement: 'Log and Monitor All Access to System Components and Cardholder Data',
        subRequirements: [
          '10.1 Processes and mechanisms for logging and monitoring all access',
          '10.2 Audit logs are implemented to support the detection of anomalies and suspicious activity',
          '10.3 Audit logs are protected from destruction and unauthorized modifications',
          '10.4 Audit logs are reviewed to identify anomalies or suspicious activity',
          '10.5 Audit log history is retained and available for analysis',
          '10.6 Time-synchronization mechanisms support consistent time settings across all systems',
          '10.7 Failures of critical security control systems are detected, reported, and responded to',
        ],
        testingProcedure: 'Review audit logging implementation, log retention, and monitoring procedures',
      },
      {
        requirementId: '11',
        requirement: 'Test Security of Systems and Networks Regularly',
        subRequirements: [
          '11.1 Processes and mechanisms for regularly testing security of systems and networks',
          '11.2 Wireless access points are identified and monitored',
          '11.3 External and internal vulnerabilities are regularly identified, prioritized, and addressed',
          '11.4 External and internal penetration testing is regularly performed',
          '11.5 Network intrusions and unexpected file changes are detected and responded to',
          '11.6 Unauthorized changes on payment pages are detected and responded to',
        ],
        testingProcedure: 'Review vulnerability scans, penetration test reports, and IDS/IPS logs',
      },
      {
        requirementId: '12',
        requirement: 'Support Information Security with Organizational Policies and Programs',
        subRequirements: [
          '12.1 A comprehensive information security policy is established and published',
          '12.2 Acceptable use policies for end-user technologies are defined and implemented',
          '12.3 Risks to the cardholder data environment are formally identified, evaluated, and managed',
          '12.4 PCI DSS compliance is managed',
          '12.5 PCI DSS scope is documented and validated',
          '12.6 Security awareness education is an ongoing activity',
          '12.7 Personnel are screened to reduce risks from insider threats',
          '12.8 Risk to information assets associated with third-party service providers is managed',
          '12.9 Third-party service providers support their customers PCI DSS compliance',
          '12.10 Suspected and confirmed security incidents are responded to immediately',
        ],
        testingProcedure: 'Review security policies, risk assessments, training records, and incident response plans',
      },
    ];
  }

  /**
   * Collect evidence for requirement
   */
  private async collectEvidence(organizationId: string, requirementId: string): Promise<string[]> {
    const evidenceIds: string[] = [];

    try {
      switch (requirementId) {
        case '1': // Network security
        case '2': // Secure configurations
          const configLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              event: { contains: 'config' },
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...configLogs.map(log => log.id));
          break;

        case '3': // Stored data protection
        case '4': // Transmission protection
          const encryptionLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              event: { in: ['data_encrypted', 'key_rotation', 'encryption_verified'] },
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...encryptionLogs.map(log => log.id));
          break;

        case '7': // Access control
        case '8': // Authentication
          const accessLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              event: { in: ['user_login', 'access_granted', 'access_denied', 'mfa_verified'] },
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...accessLogs.map(log => log.id));
          break;

        case '10': // Logging and monitoring
          const auditLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 100,
          });
          evidenceIds.push(...auditLogs.map(log => log.id));
          break;

        case '11': // Security testing
          const securityEvents = await prisma.securityEvent.findMany({
            where: {
              organizationId,
              type: { in: ['vulnerability_scan', 'penetration_test', 'security_assessment'] },
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...securityEvents.map(event => event.id));
          break;

        case '12': // Policies and programs
          const policyLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              event: { in: ['policy_updated', 'training_completed', 'risk_assessment'] },
              timestamp: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...policyLogs.map(log => log.id));
          break;

        default:
          const genericLogs = await prisma.auditLog.findMany({
            where: {
              organizationId,
              timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
            take: 50,
          });
          evidenceIds.push(...genericLogs.map(log => log.id));
      }
    } catch (error) {
      logger.error('Failed to collect PCI DSS evidence', {
        requirementId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return evidenceIds;
  }

  /**
   * Evaluate requirement compliance
   */
  private evaluateRequirement(requirementId: string, evidence: string[]): 'pass' | 'fail' | 'not_tested' {
    if (evidence.length === 0) {
      return 'not_tested';
    }

    // Simple heuristic: require minimum evidence threshold
    const requiredEvidence = 10;
    return evidence.length >= requiredEvidence ? 'pass' : 'fail';
  }

  /**
   * Persist assessment
   */
  private async persistAssessment(assessment: PCIDSSAssessment): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          framework: 'pci_dss',
          reportType: 'assessment',
          status: 'completed',
          data: JSON.stringify(assessment),
          generatedAt: assessment.assessmentDate,
          organizationId: assessment.organizationId,
        },
      });
    } catch (error) {
      logger.error('Failed to persist PCI DSS assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get latest assessment
   */
  async getLatestAssessment(organizationId: string): Promise<PCIDSSAssessment | null> {
    try {
      const report = await prisma.complianceReport.findFirst({
        where: {
          organizationId,
          framework: 'pci_dss',
          status: 'completed',
        },
        orderBy: { generatedAt: 'desc' },
      });

      if (!report || !report.data) {
        return null;
      }

      return JSON.parse(report.data) as PCIDSSAssessment;
    } catch (error) {
      logger.error('Failed to get latest PCI DSS assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const pciDSSService = new PCIDSSService();
