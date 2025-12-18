/**
 * Compliance Reports API Client
 * Automated SOC 2, ISO 27001, PCI DSS, HIPAA Report Generation
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export type Framework = 'soc2' | 'iso27001' | 'pci_dss' | 'hipaa' | 'gdpr' | 'dora';
export type ReportType = 'full' | 'gap_analysis' | 'executive_summary';
export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface GenerateReportRequest {
  framework: Framework;
  reportType?: ReportType;
  includeEvidence?: boolean;
}

export interface ComplianceReport {
  id: string;
  organizationId: string;
  framework: Framework;
  reportType: ReportType;
  status: ReportStatus;
  overallScore: number;
  controlsAssessed: number;
  controlsCompliant: number;
  controlsPartial: number;
  controlsNonCompliant: number;
  controlsNotApplicable: number;
  executiveSummary: string;
  recommendations: string[];
  generatedAt: string;
  validUntil: string;
}

export interface ControlAssessment {
  controlId: string;
  controlName: string;
  category: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  score: number;
  findings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

/**
 * Generate a compliance report
 */
export async function generateComplianceReport(
  request: GenerateReportRequest,
  token: string
): Promise<{ success: boolean; data: ComplianceReport }> {
  const response = await fetch(`${API_BASE}/compliance/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a compliance report by ID
 */
export async function getComplianceReport(
  reportId: string,
  token: string
): Promise<{ success: boolean; data: ComplianceReport }> {
  const response = await fetch(`${API_BASE}/compliance/reports/${reportId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get report: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List compliance reports
 */
export async function listComplianceReports(
  token: string,
  options?: { page?: number; limit?: number; framework?: Framework }
): Promise<{ success: boolean; data: ComplianceReport[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.framework) params.set('framework', options.framework);

  const response = await fetch(`${API_BASE}/compliance/reports?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list reports: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Download compliance report as PDF
 */
export async function downloadComplianceReport(
  reportId: string,
  token: string
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/compliance/reports/${reportId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Get compliance dashboard summary
 */
export async function getComplianceDashboard(
  token: string
): Promise<{ success: boolean; data: any }> {
  const response = await fetch(`${API_BASE}/compliance/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get dashboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get framework-specific status
 */
export async function getFrameworkStatus(
  framework: Framework,
  token: string
): Promise<{ success: boolean; data: any }> {
  const response = await fetch(`${API_BASE}/compliance/frameworks/${framework}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get framework status: ${response.statusText}`);
  }

  return response.json();
}
