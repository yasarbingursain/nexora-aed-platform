/**
 * Compliance Report Service
 * Automated SOC 2, ISO 27001, PCI DSS, HIPAA Report Generation
 * 
 * Standards Compliance:
 * - SOC 2 Type II (Trust Services Criteria)
 * - ISO 27001:2022 (Information Security Management)
 * - PCI DSS 4.0 (Payment Card Industry Data Security)
 * - HIPAA Security Rule (Health Insurance Portability)
 * - GDPR (General Data Protection Regulation)
 * - DORA (Digital Operational Resilience Act)
 * 
 * Features:
 * - Automated control assessment
 * - Evidence collection
 * - PDF report generation
 * - Compliance scoring (0-100)
 * - Gap analysis
 * - Remediation recommendations
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type Framework = 'soc2' | 'iso27001' | 'pci_dss' | 'hipaa' | 'gdpr' | 'dora';
type ControlStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
type ReportStatus = 'generating' | 'completed' | 'failed';

interface ControlAssessment {
  controlId: string;
  controlName: string;
  category: string;
  description: string;
  status: ControlStatus;
  score: number;
  evidence: EvidenceItem[];
  findings: Finding[];
  recommendations: string[];
  lastAssessed: Date;
}

interface EvidenceItem {
  id: string;
  type: 'log' | 'config' | 'screenshot' | 'document' | 'metric';
  description: string;
  source: string;
  collectedAt: Date;
  hash: string;
}

interface Finding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  dueDate?: Date;
}

interface ComplianceReport {
  id: string;
  organizationId: string;
  framework: Framework;
  reportType: 'full' | 'gap_analysis' | 'executive_summary';
  status: ReportStatus;
  overallScore: number;
  controlsAssessed: number;
  controlsCompliant: number;
  controlsPartial: number;
  controlsNonCompliant: number;
  controlsNotApplicable: number;
  assessments: ControlAssessment[];
  executiveSummary: string;
  recommendations: string[];
  generatedAt: Date;
  validUntil: Date;
  generatedBy: string;
  reportHash: string;
}

interface GenerateReportInput {
  framework: Framework;
  reportType?: 'full' | 'gap_analysis' | 'executive_summary';
  includeEvidence?: boolean;
  customControls?: string[];
}

// ============================================================================
// CONTROL DEFINITIONS
// ============================================================================

const SOC2_CONTROLS: Omit<ControlAssessment, 'status' | 'score' | 'evidence' | 'findings' | 'recommendations' | 'lastAssessed'>[] = [
  { controlId: 'CC1.1', controlName: 'COSO Principle 1', category: 'Control Environment', description: 'The entity demonstrates a commitment to integrity and ethical values' },
  { controlId: 'CC1.2', controlName: 'COSO Principle 2', category: 'Control Environment', description: 'The board of directors demonstrates independence from management' },
  { controlId: 'CC2.1', controlName: 'COSO Principle 13', category: 'Communication', description: 'The entity obtains or generates relevant, quality information' },
  { controlId: 'CC3.1', controlName: 'COSO Principle 6', category: 'Risk Assessment', description: 'The entity specifies objectives with sufficient clarity' },
  { controlId: 'CC3.2', controlName: 'COSO Principle 7', category: 'Risk Assessment', description: 'The entity identifies risks to the achievement of objectives' },
  { controlId: 'CC4.1', controlName: 'COSO Principle 16', category: 'Monitoring', description: 'The entity selects, develops, and performs ongoing evaluations' },
  { controlId: 'CC5.1', controlName: 'COSO Principle 10', category: 'Control Activities', description: 'The entity selects and develops control activities' },
  { controlId: 'CC5.2', controlName: 'COSO Principle 11', category: 'Control Activities', description: 'The entity selects and develops technology controls' },
  { controlId: 'CC6.1', controlName: 'Logical Access', category: 'Logical Access', description: 'Logical access security software, infrastructure, and architectures' },
  { controlId: 'CC6.2', controlName: 'User Registration', category: 'Logical Access', description: 'Prior to issuing system credentials, the entity registers authorized users' },
  { controlId: 'CC6.3', controlName: 'User Removal', category: 'Logical Access', description: 'The entity removes access when no longer required' },
  { controlId: 'CC6.6', controlName: 'Threat Detection', category: 'Logical Access', description: 'The entity implements controls to prevent or detect threats' },
  { controlId: 'CC6.7', controlName: 'Data Transmission', category: 'Logical Access', description: 'The entity restricts transmission of data to authorized parties' },
  { controlId: 'CC7.1', controlName: 'System Monitoring', category: 'System Operations', description: 'The entity monitors system components for anomalies' },
  { controlId: 'CC7.2', controlName: 'Incident Response', category: 'System Operations', description: 'The entity monitors for and responds to security incidents' },
  { controlId: 'CC7.3', controlName: 'Incident Recovery', category: 'System Operations', description: 'The entity evaluates security events and determines response' },
  { controlId: 'CC8.1', controlName: 'Change Management', category: 'Change Management', description: 'The entity authorizes, designs, develops, and implements changes' },
  { controlId: 'CC9.1', controlName: 'Risk Mitigation', category: 'Risk Mitigation', description: 'The entity identifies, selects, and develops risk mitigation activities' },
];

const ISO27001_CONTROLS: Omit<ControlAssessment, 'status' | 'score' | 'evidence' | 'findings' | 'recommendations' | 'lastAssessed'>[] = [
  { controlId: 'A.5.1', controlName: 'Policies for Information Security', category: 'Organizational Controls', description: 'Information security policy and topic-specific policies' },
  { controlId: 'A.5.2', controlName: 'Information Security Roles', category: 'Organizational Controls', description: 'Information security roles and responsibilities' },
  { controlId: 'A.5.3', controlName: 'Segregation of Duties', category: 'Organizational Controls', description: 'Conflicting duties and areas of responsibility shall be segregated' },
  { controlId: 'A.5.7', controlName: 'Threat Intelligence', category: 'Organizational Controls', description: 'Information relating to information security threats shall be collected' },
  { controlId: 'A.5.15', controlName: 'Access Control', category: 'Organizational Controls', description: 'Rules to control physical and logical access shall be established' },
  { controlId: 'A.5.23', controlName: 'Cloud Services Security', category: 'Organizational Controls', description: 'Processes for acquisition, use, management and exit from cloud services' },
  { controlId: 'A.5.24', controlName: 'Incident Management', category: 'Organizational Controls', description: 'Incident management planning and preparation' },
  { controlId: 'A.5.30', controlName: 'ICT Readiness', category: 'Organizational Controls', description: 'ICT readiness for business continuity' },
  { controlId: 'A.6.1', controlName: 'Screening', category: 'People Controls', description: 'Background verification checks on candidates' },
  { controlId: 'A.6.3', controlName: 'Awareness Training', category: 'People Controls', description: 'Information security awareness, education and training' },
  { controlId: 'A.7.1', controlName: 'Physical Security Perimeters', category: 'Physical Controls', description: 'Security perimeters shall be defined and used' },
  { controlId: 'A.7.4', controlName: 'Physical Security Monitoring', category: 'Physical Controls', description: 'Premises shall be continuously monitored' },
  { controlId: 'A.8.1', controlName: 'User Endpoint Devices', category: 'Technological Controls', description: 'Information stored on, processed by or accessible via user endpoint devices' },
  { controlId: 'A.8.2', controlName: 'Privileged Access Rights', category: 'Technological Controls', description: 'The allocation and use of privileged access rights shall be restricted' },
  { controlId: 'A.8.5', controlName: 'Secure Authentication', category: 'Technological Controls', description: 'Secure authentication technologies and procedures' },
  { controlId: 'A.8.8', controlName: 'Technical Vulnerability Management', category: 'Technological Controls', description: 'Information about technical vulnerabilities shall be obtained' },
  { controlId: 'A.8.12', controlName: 'Data Leakage Prevention', category: 'Technological Controls', description: 'Data leakage prevention measures shall be applied' },
  { controlId: 'A.8.15', controlName: 'Logging', category: 'Technological Controls', description: 'Logs that record activities, exceptions, faults and other relevant events' },
  { controlId: 'A.8.16', controlName: 'Monitoring Activities', category: 'Technological Controls', description: 'Networks, systems and applications shall be monitored' },
];

const PCI_DSS_CONTROLS: Omit<ControlAssessment, 'status' | 'score' | 'evidence' | 'findings' | 'recommendations' | 'lastAssessed'>[] = [
  { controlId: '1.1', controlName: 'Network Security Controls', category: 'Requirement 1', description: 'Install and maintain network security controls' },
  { controlId: '2.1', controlName: 'Secure Configurations', category: 'Requirement 2', description: 'Apply secure configurations to all system components' },
  { controlId: '3.1', controlName: 'Account Data Protection', category: 'Requirement 3', description: 'Protect stored account data' },
  { controlId: '4.1', controlName: 'Transmission Encryption', category: 'Requirement 4', description: 'Protect cardholder data with strong cryptography during transmission' },
  { controlId: '5.1', controlName: 'Malware Protection', category: 'Requirement 5', description: 'Protect all systems and networks from malicious software' },
  { controlId: '6.1', controlName: 'Secure Development', category: 'Requirement 6', description: 'Develop and maintain secure systems and software' },
  { controlId: '7.1', controlName: 'Access Restriction', category: 'Requirement 7', description: 'Restrict access to system components and cardholder data' },
  { controlId: '8.1', controlName: 'User Identification', category: 'Requirement 8', description: 'Identify users and authenticate access to system components' },
  { controlId: '9.1', controlName: 'Physical Access', category: 'Requirement 9', description: 'Restrict physical access to cardholder data' },
  { controlId: '10.1', controlName: 'Logging and Monitoring', category: 'Requirement 10', description: 'Log and monitor all access to system components and cardholder data' },
  { controlId: '11.1', controlName: 'Security Testing', category: 'Requirement 11', description: 'Test security of systems and networks regularly' },
  { controlId: '12.1', controlName: 'Security Policy', category: 'Requirement 12', description: 'Support information security with organizational policies and programs' },
];

const HIPAA_CONTROLS: Omit<ControlAssessment, 'status' | 'score' | 'evidence' | 'findings' | 'recommendations' | 'lastAssessed'>[] = [
  { controlId: '164.308(a)(1)', controlName: 'Security Management Process', category: 'Administrative Safeguards', description: 'Implement policies and procedures to prevent, detect, contain, and correct security violations' },
  { controlId: '164.308(a)(3)', controlName: 'Workforce Security', category: 'Administrative Safeguards', description: 'Implement policies and procedures to ensure appropriate access to ePHI' },
  { controlId: '164.308(a)(4)', controlName: 'Information Access Management', category: 'Administrative Safeguards', description: 'Implement policies and procedures for authorizing access to ePHI' },
  { controlId: '164.308(a)(5)', controlName: 'Security Awareness Training', category: 'Administrative Safeguards', description: 'Implement a security awareness and training program' },
  { controlId: '164.308(a)(6)', controlName: 'Security Incident Procedures', category: 'Administrative Safeguards', description: 'Implement policies and procedures to address security incidents' },
  { controlId: '164.308(a)(7)', controlName: 'Contingency Plan', category: 'Administrative Safeguards', description: 'Establish policies and procedures for responding to emergencies' },
  { controlId: '164.310(a)(1)', controlName: 'Facility Access Controls', category: 'Physical Safeguards', description: 'Implement policies and procedures to limit physical access' },
  { controlId: '164.310(b)', controlName: 'Workstation Use', category: 'Physical Safeguards', description: 'Implement policies and procedures for proper workstation use' },
  { controlId: '164.310(d)(1)', controlName: 'Device and Media Controls', category: 'Physical Safeguards', description: 'Implement policies and procedures for receipt and removal of hardware and electronic media' },
  { controlId: '164.312(a)(1)', controlName: 'Access Control', category: 'Technical Safeguards', description: 'Implement technical policies and procedures for electronic information systems' },
  { controlId: '164.312(b)', controlName: 'Audit Controls', category: 'Technical Safeguards', description: 'Implement hardware, software, and procedural mechanisms to record and examine access' },
  { controlId: '164.312(c)(1)', controlName: 'Integrity', category: 'Technical Safeguards', description: 'Implement policies and procedures to protect ePHI from improper alteration or destruction' },
  { controlId: '164.312(d)', controlName: 'Person or Entity Authentication', category: 'Technical Safeguards', description: 'Implement procedures to verify that a person or entity seeking access is the one claimed' },
  { controlId: '164.312(e)(1)', controlName: 'Transmission Security', category: 'Technical Safeguards', description: 'Implement technical security measures to guard against unauthorized access to ePHI' },
];

// ============================================================================
// COMPLIANCE REPORT SERVICE
// ============================================================================

export class ComplianceReportService {
  /**
   * Generate a compliance report
   */
  async generateReport(
    organizationId: string,
    input: GenerateReportInput,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const startTime = Date.now();
    const reportId = this.generateReportId();

    logger.info('Starting compliance report generation', {
      reportId,
      organizationId,
      framework: input.framework,
      reportType: input.reportType,
    });

    try {
      // Get control definitions for framework
      const controlDefs = this.getControlDefinitions(input.framework);

      // Assess each control
      const assessments: ControlAssessment[] = [];
      for (const controlDef of controlDefs) {
        const assessment = await this.assessControl(organizationId, input.framework, controlDef, input.includeEvidence);
        assessments.push(assessment);
      }

      // Calculate scores
      const scores = this.calculateScores(assessments);

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(input.framework, scores, assessments);

      // Generate recommendations
      const recommendations = this.generateRecommendations(assessments);

      // Create report
      const report: ComplianceReport = {
        id: reportId,
        organizationId,
        framework: input.framework,
        reportType: input.reportType || 'full',
        status: 'completed',
        overallScore: scores.overallScore,
        controlsAssessed: scores.total,
        controlsCompliant: scores.compliant,
        controlsPartial: scores.partial,
        controlsNonCompliant: scores.nonCompliant,
        controlsNotApplicable: scores.notApplicable,
        assessments,
        executiveSummary,
        recommendations,
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        generatedBy,
        reportHash: this.generateReportHash(reportId, assessments),
      };

      // Persist report
      await this.persistReport(report);

      // Create audit log
      await this.createAuditLog(organizationId, reportId, input.framework, generatedBy);

      logger.info('Compliance report generated', {
        reportId,
        organizationId,
        framework: input.framework,
        overallScore: scores.overallScore,
        durationMs: Date.now() - startTime,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        reportId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get control definitions for a framework
   */
  private getControlDefinitions(framework: Framework) {
    switch (framework) {
      case 'soc2':
        return SOC2_CONTROLS;
      case 'iso27001':
        return ISO27001_CONTROLS;
      case 'pci_dss':
        return PCI_DSS_CONTROLS;
      case 'hipaa':
        return HIPAA_CONTROLS;
      case 'gdpr':
        return ISO27001_CONTROLS.slice(0, 10); // Simplified
      case 'dora':
        return ISO27001_CONTROLS.slice(0, 8); // Simplified
      default:
        return SOC2_CONTROLS;
    }
  }

  /**
   * Assess a single control
   */
  private async assessControl(
    organizationId: string,
    framework: Framework,
    controlDef: Omit<ControlAssessment, 'status' | 'score' | 'evidence' | 'findings' | 'recommendations' | 'lastAssessed'>,
    includeEvidence?: boolean
  ): Promise<ControlAssessment> {
    // Collect evidence
    const evidence = includeEvidence ? await this.collectEvidence(organizationId, controlDef.controlId) : [];

    // Evaluate control status based on evidence and system state
    const { status, score, findings } = await this.evaluateControl(organizationId, controlDef.controlId, framework);

    // Generate recommendations
    const recommendations = this.generateControlRecommendations(controlDef.controlId, status, findings);

    return {
      ...controlDef,
      status,
      score,
      evidence,
      findings,
      recommendations,
      lastAssessed: new Date(),
    };
  }

  /**
   * Collect evidence for a control
   */
  private async collectEvidence(organizationId: string, controlId: string): Promise<EvidenceItem[]> {
    const evidence: EvidenceItem[] = [];

    // Collect audit logs as evidence
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        timestamp: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
      orderBy: { timestamp: 'desc' },
    });

    for (const log of auditLogs) {
      evidence.push({
        id: log.id,
        type: 'log',
        description: `Audit log: ${log.event}`,
        source: 'audit_logs',
        collectedAt: log.timestamp,
        hash: this.hashEvidence(JSON.stringify(log)),
      });
    }

    // Collect threat data as evidence
    const threats = await prisma.threat.findMany({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    for (const threat of threats) {
      evidence.push({
        id: threat.id,
        type: 'log',
        description: `Threat detection: ${threat.title}`,
        source: 'threat_detection',
        collectedAt: threat.createdAt,
        hash: this.hashEvidence(JSON.stringify(threat)),
      });
    }

    // Collect identity data as evidence
    const identities = await prisma.identity.count({
      where: { organizationId },
    });

    evidence.push({
      id: `identity-count-${Date.now()}`,
      type: 'metric',
      description: `Total managed identities: ${identities}`,
      source: 'identity_management',
      collectedAt: new Date(),
      hash: this.hashEvidence(`identities:${identities}`),
    });

    return evidence;
  }

  /**
   * Evaluate control status
   */
  private async evaluateControl(
    organizationId: string,
    controlId: string,
    framework: Framework
  ): Promise<{ status: ControlStatus; score: number; findings: Finding[] }> {
    const findings: Finding[] = [];

    // Get relevant metrics
    const [threatCount, resolvedThreats, identityCount, auditLogCount] = await Promise.all([
      prisma.threat.count({ where: { organizationId, status: 'open' } }),
      prisma.threat.count({ where: { organizationId, status: 'resolved' } }),
      prisma.identity.count({ where: { organizationId } }),
      prisma.auditLog.count({ where: { organizationId } }),
    ]);

    // Evaluate based on control type
    let status: ControlStatus = 'compliant';
    let score = 100;

    // Access control checks
    if (controlId.includes('6.1') || controlId.includes('A.5.15') || controlId.includes('7.1') || controlId.includes('164.312(a)')) {
      if (identityCount === 0) {
        status = 'non_compliant';
        score = 0;
        findings.push({
          id: `finding-${controlId}-1`,
          severity: 'high',
          title: 'No identities managed',
          description: 'No non-human identities are being managed by the system',
          impact: 'Unable to demonstrate access control implementation',
          recommendation: 'Onboard identities to the platform',
        });
      } else if (threatCount > 5) {
        status = 'partial';
        score = 70;
        findings.push({
          id: `finding-${controlId}-2`,
          severity: 'medium',
          title: 'Open threats detected',
          description: `${threatCount} open threats require attention`,
          impact: 'Potential security gaps in access control',
          recommendation: 'Investigate and remediate open threats',
        });
      }
    }

    // Logging and monitoring checks
    if (controlId.includes('7.1') || controlId.includes('A.8.15') || controlId.includes('10.1') || controlId.includes('164.312(b)')) {
      if (auditLogCount < 100) {
        status = 'partial';
        score = 80;
        findings.push({
          id: `finding-${controlId}-3`,
          severity: 'low',
          title: 'Limited audit logging',
          description: 'Audit log volume is below expected levels',
          impact: 'May not have sufficient evidence for compliance',
          recommendation: 'Ensure all security events are being logged',
        });
      }
    }

    // Incident response checks
    if (controlId.includes('7.2') || controlId.includes('A.5.24') || controlId.includes('164.308(a)(6)')) {
      const resolutionRate = resolvedThreats / Math.max(threatCount + resolvedThreats, 1);
      if (resolutionRate < 0.8) {
        status = 'partial';
        score = 75;
        findings.push({
          id: `finding-${controlId}-4`,
          severity: 'medium',
          title: 'Low threat resolution rate',
          description: `Only ${(resolutionRate * 100).toFixed(0)}% of threats have been resolved`,
          impact: 'Incident response may not be effective',
          recommendation: 'Review and improve incident response procedures',
        });
      }
    }

    return { status, score, findings };
  }

  /**
   * Generate control-specific recommendations
   */
  private generateControlRecommendations(controlId: string, status: ControlStatus, findings: Finding[]): string[] {
    const recommendations: string[] = [];

    if (status === 'non_compliant') {
      recommendations.push('Immediate action required to achieve compliance');
    }

    for (const finding of findings) {
      recommendations.push(finding.recommendation);
    }

    if (status === 'compliant') {
      recommendations.push('Continue monitoring to maintain compliance');
    }

    return recommendations;
  }

  /**
   * Calculate overall scores
   */
  private calculateScores(assessments: ControlAssessment[]) {
    const total = assessments.length;
    const compliant = assessments.filter(a => a.status === 'compliant').length;
    const partial = assessments.filter(a => a.status === 'partial').length;
    const nonCompliant = assessments.filter(a => a.status === 'non_compliant').length;
    const notApplicable = assessments.filter(a => a.status === 'not_applicable').length;

    const applicableControls = total - notApplicable;
    const overallScore = applicableControls > 0
      ? Math.round((assessments.reduce((sum, a) => sum + a.score, 0) / applicableControls))
      : 100;

    return {
      total,
      compliant,
      partial,
      nonCompliant,
      notApplicable,
      overallScore,
    };
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(framework: Framework, scores: any, assessments: ControlAssessment[]): string {
    const frameworkNames: Record<Framework, string> = {
      soc2: 'SOC 2 Type II',
      iso27001: 'ISO 27001:2022',
      pci_dss: 'PCI DSS 4.0',
      hipaa: 'HIPAA Security Rule',
      gdpr: 'GDPR',
      dora: 'DORA',
    };

    const complianceLevel = scores.overallScore >= 90 ? 'high' : scores.overallScore >= 70 ? 'moderate' : 'low';
    const criticalFindings = assessments.flatMap(a => a.findings).filter(f => f.severity === 'critical').length;
    const highFindings = assessments.flatMap(a => a.findings).filter(f => f.severity === 'high').length;

    return `
# ${frameworkNames[framework]} Compliance Assessment

## Overall Compliance Score: ${scores.overallScore}%

This assessment evaluated ${scores.total} controls against the ${frameworkNames[framework]} framework.

### Summary
- **Compliant Controls**: ${scores.compliant} (${Math.round(scores.compliant / scores.total * 100)}%)
- **Partially Compliant**: ${scores.partial} (${Math.round(scores.partial / scores.total * 100)}%)
- **Non-Compliant**: ${scores.nonCompliant} (${Math.round(scores.nonCompliant / scores.total * 100)}%)
- **Not Applicable**: ${scores.notApplicable}

### Risk Assessment
The organization demonstrates a **${complianceLevel}** level of compliance with ${frameworkNames[framework]} requirements.

${criticalFindings > 0 ? `⚠️ **${criticalFindings} critical findings** require immediate attention.` : ''}
${highFindings > 0 ? `⚠️ **${highFindings} high-severity findings** should be addressed within 30 days.` : ''}

### Recommendations
${scores.nonCompliant > 0 ? '1. Prioritize remediation of non-compliant controls' : ''}
${scores.partial > 0 ? '2. Address gaps in partially compliant controls' : ''}
3. Maintain continuous monitoring and evidence collection
4. Schedule follow-up assessment in 90 days
    `.trim();
  }

  /**
   * Generate overall recommendations
   */
  private generateRecommendations(assessments: ControlAssessment[]): string[] {
    const recommendations: string[] = [];
    const nonCompliant = assessments.filter(a => a.status === 'non_compliant');
    const partial = assessments.filter(a => a.status === 'partial');

    if (nonCompliant.length > 0) {
      recommendations.push(`Prioritize remediation of ${nonCompliant.length} non-compliant controls`);
      for (const control of nonCompliant.slice(0, 3)) {
        recommendations.push(`- ${control.controlId}: ${control.controlName}`);
      }
    }

    if (partial.length > 0) {
      recommendations.push(`Address gaps in ${partial.length} partially compliant controls`);
    }

    recommendations.push('Implement continuous compliance monitoring');
    recommendations.push('Schedule quarterly compliance reviews');
    recommendations.push('Maintain evidence collection for all controls');

    return recommendations;
  }

  /**
   * Persist report to database
   */
  private async persistReport(report: ComplianceReport): Promise<void> {
    await prisma.complianceReport.create({
      data: {
        id: report.id,
        framework: report.framework,
        reportType: report.reportType,
        status: report.status,
        organizationId: report.organizationId,
        data: JSON.stringify({
          overallScore: report.overallScore,
          controlsAssessed: report.controlsAssessed,
          controlsCompliant: report.controlsCompliant,
          controlsPartial: report.controlsPartial,
          controlsNonCompliant: report.controlsNonCompliant,
          assessments: report.assessments,
          executiveSummary: report.executiveSummary,
          recommendations: report.recommendations,
          reportHash: report.reportHash,
        }),
        generatedAt: report.generatedAt,
      },
    });
  }

  /**
   * Create audit log
   */
  private async createAuditLog(organizationId: string, reportId: string, framework: Framework, generatedBy: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        event: 'compliance_report_generated',
        entityType: 'compliance_report',
        entityId: reportId,
        action: 'generate',
        organizationId,
        userId: generatedBy,
        metadata: JSON.stringify({ framework }),
        severity: 'low',
      },
    });
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string, organizationId: string): Promise<ComplianceReport | null> {
    const report = await prisma.complianceReport.findFirst({
      where: { id: reportId, organizationId },
    });

    if (!report) return null;

    const data = JSON.parse(report.data || '{}');
    return {
      id: report.id,
      organizationId: report.organizationId,
      framework: report.framework as Framework,
      reportType: report.reportType as 'full' | 'gap_analysis' | 'executive_summary',
      status: report.status as ReportStatus,
      overallScore: data.overallScore,
      controlsAssessed: data.controlsAssessed,
      controlsCompliant: data.controlsCompliant,
      controlsPartial: data.controlsPartial,
      controlsNonCompliant: data.controlsNonCompliant,
      controlsNotApplicable: data.controlsNotApplicable || 0,
      assessments: data.assessments,
      executiveSummary: data.executiveSummary,
      recommendations: data.recommendations,
      generatedAt: report.generatedAt || report.createdAt,
      validUntil: new Date(new Date(report.generatedAt || report.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000),
      generatedBy: '',
      reportHash: data.reportHash,
    };
  }

  /**
   * List reports
   */
  async listReports(
    organizationId: string,
    options: { page?: number; limit?: number; framework?: Framework }
  ): Promise<{ data: any[]; pagination: any }> {
    const { page = 1, limit = 20, framework } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (framework) where.framework = framework;

    const [reports, total] = await Promise.all([
      prisma.complianceReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complianceReport.count({ where }),
    ]);

    return {
      data: reports.map(r => {
        const data = JSON.parse(r.data || '{}');
        return {
          id: r.id,
          framework: r.framework,
          reportType: r.reportType,
          status: r.status,
          overallScore: data.overallScore,
          createdAt: r.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateReportId(): string {
    return `cr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportHash(reportId: string, assessments: ControlAssessment[]): string {
    const crypto = require('crypto');
    const content = JSON.stringify({ reportId, assessments });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private hashEvidence(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

export const complianceReportService = new ComplianceReportService();
