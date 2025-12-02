"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  Filter
} from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            Security insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => alert('Date range selector coming soon')}>
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => alert('Export Report functionality coming soon')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Threat Detection Rate</span>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">98.5%</div>
          <p className="text-xs text-green-400 mt-2">+2.3% from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Response Time</span>
            <TrendingDown className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">1.2s</div>
          <p className="text-xs text-green-400 mt-2">-0.3s from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Auto-Remediation</span>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">847</div>
          <p className="text-xs text-green-400 mt-2">+124 from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">False Positives</span>
            <TrendingDown className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">0.8%</div>
          <p className="text-xs text-green-400 mt-2">-0.2% from last month</p>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Threat Trends</h3>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization coming soon</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Entity Risk Distribution</h3>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization coming soon</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Available Reports</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: 'Security Overview', date: 'Generated today', status: 'Ready' },
            { name: 'Compliance Report', date: 'Generated yesterday', status: 'Ready' },
            { name: 'Threat Analysis', date: 'Generated 2 days ago', status: 'Ready' },
          ].map((report, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">{report.name}</p>
                <p className="text-sm text-muted-foreground">{report.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default">{report.status}</Badge>
                <Button variant="outline" size="sm" onClick={() => alert('Download functionality coming soon')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
