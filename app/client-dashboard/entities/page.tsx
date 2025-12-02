"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Shield, 
  Key, 
  Bot, 
  Server, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const entities = [
  {
    id: '1',
    name: 'prod-api-key-7829',
    type: 'API Key',
    status: 'active',
    riskScore: 95,
    lastUsed: '2 minutes ago',
    environment: 'Production',
    permissions: ['read', 'write', 'delete'],
    threats: 1
  },
  {
    id: '2',
    name: 'data-processor-svc',
    type: 'Service Account',
    status: 'active',
    riskScore: 45,
    lastUsed: '15 minutes ago',
    environment: 'Production',
    permissions: ['read', 'write'],
    threats: 0
  },
  {
    id: '3',
    name: 'customer-support-bot',
    type: 'AI Agent',
    status: 'active',
    riskScore: 28,
    lastUsed: '1 hour ago',
    environment: 'Production',
    permissions: ['read'],
    threats: 0
  },
  {
    id: '4',
    name: 'oauth-token-user-456',
    type: 'OAuth Token',
    status: 'expiring',
    riskScore: 62,
    lastUsed: '3 hours ago',
    environment: 'Production',
    permissions: ['read', 'write'],
    threats: 0
  },
];

const entityTypes = [
  { name: 'All', count: 1247, icon: Shield },
  { name: 'API Keys', count: 456, icon: Key },
  { name: 'Service Accounts', count: 234, icon: Server },
  { name: 'AI Agents', count: 189, icon: Bot },
  { name: 'OAuth Tokens', count: 368, icon: Key },
];

export default function EntitiesPage() {
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'expiring':
        return <Badge variant="high">Expiring</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entity Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all non-human identities
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
          <Button size="sm" onClick={() => alert('Add Entity functionality coming soon')}>
            <Shield className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
        </div>
      </div>

      {/* Entity Type Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {entityTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.name;
          
          return (
            <Card
              key={type.name}
              className={`p-4 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedType(type.name)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{type.count}</span>
              </div>
              <p className="text-sm text-muted-foreground">{type.name}</p>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entities..."
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

      {/* Entities Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entity</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk Score</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Used</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Environment</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{entity.name}</p>
                        {entity.threats > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {entity.threats} active threat{entity.threats > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{entity.type}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(entity.status)}
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${getRiskColor(entity.riskScore)}`}>
                      {entity.riskScore}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {entity.lastUsed}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="neutral">{entity.environment}</Badge>
                  </td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
