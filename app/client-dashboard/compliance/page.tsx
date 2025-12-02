"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Shield,
  Lock,
  Eye
} from 'lucide-react';

const complianceFrameworks = [
  {
    name: 'SOC 2 Type II',
    status: 'compliant',
    score: 98,
    lastAudit: '2024-10-15',
    nextAudit: '2025-04-15',
    controls: 156,
    passed: 154,
    failed: 2
  },
  {
    name: 'GDPR',
    status: 'compliant',
    score: 96,
    lastAudit: '2024-09-20',
    nextAudit: '2025-03-20',
    controls: 89,
    passed: 86,
    failed: 3
  },
  {
    name: 'HIPAA',
    status: 'compliant',
    score: 94,
    lastAudit: '2024-10-01',
    nextAudit: '2025-04-01',
    controls: 124,
    passed: 117,
    failed: 7
  },
  {
    name: 'PCI DSS',
    status: 'review',
    score: 88,
    lastAudit: '2024-08-15',
    nextAudit: '2025-02-15',
    controls: 267,
    passed: 235,
    failed: 32
  },
];

const recentFindings = [
  {
    id: '1',
    framework: 'SOC 2',
    finding: 'Access logs retention period below requirement',
    severity: 'medium',
    status: 'remediated',
    dueDate: '2024-11-01'
  },
  {
    id: '2',
    framework: 'GDPR',
    finding: 'Data subject access request process needs documentation',
    severity: 'low',
    status: 'in-progress',
    dueDate: '2024-11-15'
  },
  {
    id: '3',
    framework: 'HIPAA',
    finding: 'Encryption at rest not enabled for all databases',
    severity: 'high',
    status: 'open',
    dueDate: '2024-10-30'
  },
];

export default function CompliancePage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge variant="default">Compliant</Badge>;
      case 'review':
        return <Badge variant="high">Under Review</Badge>;
      case 'non-compliant':
        return <Badge variant="critical">Non-Compliant</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="critical">High</Badge>;
      case 'medium':
        return <Badge variant="high">Medium</Badge>;
      case 'low':
        return <Badge variant="medium">Low</Badge>;
      default:
        return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor compliance status across security frameworks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => alert('Export Report functionality coming soon')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => alert('Run Audit functionality coming soon')}>
            <Shield className="h-4 w-4 mr-2" />
            Run Audit
          </Button>
        </div>
      </div>

      {/* Overall Compliance Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Compliance Score</h3>
            <p className="text-muted-foreground text-sm">
              Across all active frameworks
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-400">94%</div>
            <p className="text-sm text-muted-foreground mt-2">4 frameworks monitored</p>
          </div>
        </div>
      </Card>

      {/* Compliance Frameworks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {complianceFrameworks.map((framework) => (
          <Card key={framework.name} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{framework.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Last audit: {new Date(framework.lastAudit).toLocaleDateString()}
                </p>
              </div>
              {getStatusBadge(framework.status)}
            </div>

            <div className="space-y-4">
              {/* Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Compliance Score</span>
                  <span className="text-2xl font-bold">{framework.score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      framework.score >= 95 ? 'bg-green-500' :
                      framework.score >= 90 ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${framework.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total Controls</p>
                  <p className="text-xl font-semibold">{framework.controls}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-xl font-semibold text-green-400">{framework.passed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-xl font-semibold text-red-400">{framework.failed}</p>
                </div>
              </div>

              {/* Next Audit */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">Next audit scheduled</p>
                <p className="text-sm font-medium mt-1">
                  {new Date(framework.nextAudit).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Findings */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Recent Findings</h3>
        </div>
        <div className="divide-y divide-border">
          {recentFindings.map((finding) => (
            <div key={finding.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="neutral">{finding.framework}</Badge>
                    {getSeverityBadge(finding.severity)}
                  </div>
                  <p className="font-medium">{finding.finding}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due: {new Date(finding.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => alert('View Details functionality coming soon')}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
