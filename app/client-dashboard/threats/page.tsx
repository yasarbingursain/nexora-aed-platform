"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ThreatCard } from '@/components/ui/ThreatCard';
import { toast } from 'sonner';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';

const initialThreats = [
  {
    id: '1',
    title: 'Suspicious API Key Usage',
    description: 'API key accessed from unusual geographic location (Russia)',
    severity: 'critical' as const,
    status: 'active' as const,
    entityName: 'prod-api-key-7829',
    entityType: 'API Key',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    riskScore: 95,
    detectedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    affectedEntities: ['prod-api-key-7829', 'payments-service']
  },
  {
    id: '2',
    title: 'Service Account Privilege Escalation',
    description: 'Service account attempted to access admin-level resources',
    severity: 'high' as const,
    status: 'investigating' as const,
    entityName: 'data-processor-svc',
    entityType: 'Service Account',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    riskScore: 78,
    detectedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    affectedEntities: ['data-processor-svc']
  },
  {
    id: '3',
    title: 'AI Agent Anomalous Behavior',
    description: 'AI agent exhibiting unusual conversation patterns',
    severity: 'medium' as const,
    status: 'resolved' as const,
    entityName: 'customer-support-bot',
    entityType: 'AI Agent',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    riskScore: 45,
    detectedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    affectedEntities: ['customer-support-bot']
  },
];

const severityFilters = [
  { name: 'All', count: 23, color: 'bg-gray-500' },
  { name: 'Critical', count: 3, color: 'bg-red-500' },
  { name: 'High', count: 8, color: 'bg-orange-500' },
  { name: 'Medium', count: 7, color: 'bg-yellow-500' },
  { name: 'Low', count: 5, color: 'bg-green-500' },
];

export default function ThreatsPage() {
  const [threats, setThreats] = useState(initialThreats);
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Threat Detection</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and respond to security threats in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => alert('Export functionality coming soon')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-2xl font-bold">23</span>
          </div>
          <p className="text-sm text-muted-foreground">Active Threats</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-5 w-5 text-yellow-400" />
            <span className="text-2xl font-bold">8</span>
          </div>
          <p className="text-sm text-muted-foreground">Investigating</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-bold">12</span>
          </div>
          <p className="text-sm text-muted-foreground">Resolved Today</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="text-2xl font-bold">847</span>
          </div>
          <p className="text-sm text-muted-foreground">Auto-Remediated</p>
        </Card>
      </div>

      {/* Severity Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {severityFilters.map((filter) => (
          <button
            key={filter.name}
            onClick={() => setSelectedSeverity(filter.name)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
              selectedSeverity === filter.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            data-testid={`filter-severity-${filter.name.toLowerCase()}`}
          >
            <div className={`w-3 h-3 rounded-full ${filter.color}`}></div>
            <span className="text-sm font-medium">{filter.name}</span>
            <span className="text-sm text-muted-foreground">({filter.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => alert('Filter functionality coming soon')}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Threats List */}
      <div className="space-y-4" data-testid="threats-skeleton">
        {threats.map((threat) => (
          <ThreatCard
            key={threat.id}
            {...threat}
            onInvestigate={() => {
              toast.info(`Opening detailed investigation for: ${threat.title}`);
              // In production, this would open a modal or navigate to detail page
              console.log('Investigate threat:', threat.id, threat);
            }}
            onRemediate={() => {
              toast.success(`Auto-remediation initiated for: ${threat.title}`);
              toast.info('Rotating credentials and quarantining entity...');
              // Update threat status
              setThreats(prev => 
                prev.map(t => t.id === threat.id ? {...t, status: 'investigating' as any} : t)
              );
              // Simulate remediation completion
              setTimeout(() => {
                toast.success('Remediation completed successfully');
                setThreats(prev => 
                  prev.map(t => t.id === threat.id ? {...t, status: 'resolved' as any} : t)
                );
              }, 3000);
            }}
            onDismiss={() => {
              toast.info(`Dismissing threat: ${threat.title}`);
              // Update threat status
              setThreats(prev => 
                prev.map(t => t.id === threat.id ? {...t, status: 'dismissed' as any} : t)
              );
            }}
          />
        ))}
      </div>

      {/* Empty State (hidden when threats exist) */}
      {threats.length === 0 && (
        <Card className="p-12 text-center" data-testid="threats-empty-state">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No threats detected</h3>
          <p className="text-muted-foreground">
            Your environment is secure. We&apos;ll notify you if any threats are detected.
          </p>
        </Card>
      )}
    </div>
  );
}
