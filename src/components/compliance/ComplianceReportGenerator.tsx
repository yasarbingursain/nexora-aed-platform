'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Shield,
  Building,
  CreditCard,
  Heart,
  Globe,
  Landmark
} from 'lucide-react';

type Framework = 'soc2' | 'iso27001' | 'pci_dss' | 'hipaa' | 'gdpr' | 'dora';
type ReportType = 'full' | 'gap_analysis' | 'executive_summary';

interface ComplianceReport {
  id: string;
  framework: Framework;
  reportType: ReportType;
  status: 'generating' | 'completed' | 'failed';
  overallScore: number;
  controlsAssessed: number;
  controlsCompliant: number;
  controlsPartial: number;
  controlsNonCompliant: number;
  executiveSummary: string;
  recommendations: string[];
  generatedAt: string;
}

interface ComplianceReportGeneratorProps {
  onGenerateReport?: (framework: Framework, reportType: ReportType) => Promise<ComplianceReport>;
  onDownloadReport?: (reportId: string) => void;
  recentReports?: ComplianceReport[];
  loading?: boolean;
}

const frameworkConfig: Record<Framework, { name: string; icon: React.ReactNode; color: string }> = {
  soc2: { name: 'SOC 2 Type II', icon: <Shield className="h-5 w-5" />, color: 'text-blue-500' },
  iso27001: { name: 'ISO 27001:2022', icon: <Globe className="h-5 w-5" />, color: 'text-green-500' },
  pci_dss: { name: 'PCI DSS 4.0', icon: <CreditCard className="h-5 w-5" />, color: 'text-purple-500' },
  hipaa: { name: 'HIPAA Security', icon: <Heart className="h-5 w-5" />, color: 'text-red-500' },
  gdpr: { name: 'GDPR', icon: <Building className="h-5 w-5" />, color: 'text-yellow-500' },
  dora: { name: 'DORA', icon: <Landmark className="h-5 w-5" />, color: 'text-cyan-500' },
};

export function ComplianceReportGenerator({
  onGenerateReport,
  onDownloadReport,
  recentReports = [],
  loading = false,
}: ComplianceReportGeneratorProps) {
  const [selectedFramework, setSelectedFramework] = useState<Framework>('soc2');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('full');
  const [generating, setGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<ComplianceReport | null>(null);

  const handleGenerateReport = async () => {
    if (!onGenerateReport) return;
    
    setGenerating(true);
    try {
      const report = await onGenerateReport(selectedFramework, selectedReportType);
      setCurrentReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Compliant', color: 'bg-green-500/10 text-green-500' };
    if (score >= 70) return { label: 'Partial', color: 'bg-yellow-500/10 text-yellow-500' };
    return { label: 'Non-Compliant', color: 'bg-red-500/10 text-red-500' };
  };

  return (
    <div className="space-y-6">
      {/* Framework Selection */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Compliance Report
          </CardTitle>
          <CardDescription>
            Automated compliance assessment with evidence collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Framework Grid */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Framework</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(frameworkConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFramework(key as Framework)}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedFramework === key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`flex items-center gap-2 ${config.color}`}>
                    {config.icon}
                    <span className="font-medium text-sm">{config.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Report Type</label>
            <div className="flex gap-3">
              {[
                { value: 'full', label: 'Full Assessment', desc: 'Complete control evaluation' },
                { value: 'gap_analysis', label: 'Gap Analysis', desc: 'Focus on non-compliant areas' },
                { value: 'executive_summary', label: 'Executive Summary', desc: 'High-level overview' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedReportType(type.value as ReportType)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    selectedReportType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateReport} 
            disabled={generating || loading}
            className="w-full"
          >
            {generating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate {frameworkConfig[selectedFramework].name} Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Report Result */}
      {currentReport && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {frameworkConfig[currentReport.framework].icon}
                {frameworkConfig[currentReport.framework].name} Assessment
              </CardTitle>
              <Badge className={getScoreBadge(currentReport.overallScore).color}>
                {getScoreBadge(currentReport.overallScore).label}
              </Badge>
            </div>
            <CardDescription>
              Generated {new Date(currentReport.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center py-4">
              <div className={`text-5xl font-bold ${getScoreColor(currentReport.overallScore)}`}>
                {currentReport.overallScore}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Overall Compliance Score</div>
            </div>

            {/* Control Breakdown */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{currentReport.controlsAssessed}</div>
                <div className="text-xs text-muted-foreground">Total Controls</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{currentReport.controlsCompliant}</div>
                <div className="text-xs text-muted-foreground">Compliant</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-500">{currentReport.controlsPartial}</div>
                <div className="text-xs text-muted-foreground">Partial</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{currentReport.controlsNonCompliant}</div>
                <div className="text-xs text-muted-foreground">Non-Compliant</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Compliance Progress</span>
                <span>{currentReport.controlsCompliant} of {currentReport.controlsAssessed} controls</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 h-full"
                  style={{ width: `${(currentReport.controlsCompliant / currentReport.controlsAssessed) * 100}%` }}
                />
                <div 
                  className="bg-yellow-500 h-full"
                  style={{ width: `${(currentReport.controlsPartial / currentReport.controlsAssessed) * 100}%` }}
                />
                <div 
                  className="bg-red-500 h-full"
                  style={{ width: `${(currentReport.controlsNonCompliant / currentReport.controlsAssessed) * 100}%` }}
                />
              </div>
            </div>

            {/* Recommendations */}
            {currentReport.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Recommendations</h4>
                <ul className="space-y-2">
                  {currentReport.recommendations.slice(0, 5).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onDownloadReport?.(currentReport.id)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Full Report (PDF)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={frameworkConfig[report.framework].color}>
                      {frameworkConfig[report.framework].icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {frameworkConfig[report.framework].name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getScoreBadge(report.overallScore).color}>
                      {report.overallScore}%
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onDownloadReport?.(report.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ComplianceReportGenerator;
