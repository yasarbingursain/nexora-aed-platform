"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { MetricCard } from '@/components/ui/MetricCard';
import { Search, Filter, Plus, Key, Server, Bot, Lock } from 'lucide-react';
import { fetchIdentities } from '@/lib/api/identities';
import type { IdentitiesResponse } from '@/lib/api/identities';

export function IdentitiesView() {
  const [identitiesData, setIdentitiesData] = useState<IdentitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadIdentities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchIdentities(page, 25);
      setIdentitiesData(data);
    } catch (error) {
      console.error('Failed to load identities:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-nexora-threat';
    if (score >= 60) return 'text-nexora-warning';
    if (score >= 40) return 'text-security-high';
    return 'text-nexora-ai';
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Identity Inventory</h1>
          <p className="text-muted-foreground">
            {identitiesData?.total.toLocaleString() || 0} identities protected
          </p>
        </div>
        <Button className="bg-nexora-primary hover:bg-nexora-primary/80">
          <Plus className="h-4 w-4 mr-2" />
          Add Identity
        </Button>
      </div>

      {/* Summary Cards */}
      {identitiesData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="API Keys"
            value={identitiesData.summary.apiKeys.toLocaleString()}
            icon={<Key className="h-5 w-5" />}
          />
          <MetricCard
            title="Service Accounts"
            value={identitiesData.summary.serviceAccounts.toLocaleString()}
            icon={<Server className="h-5 w-5" />}
          />
          <MetricCard
            title="AI Agents"
            value={identitiesData.summary.aiAgents.toLocaleString()}
            icon={<Bot className="h-5 w-5" />}
          />
          <MetricCard
            title="SSH Keys"
            value={identitiesData.summary.sshKeys.toLocaleString()}
            icon={<Lock className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, type, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <select className="bg-card border border-border rounded-md px-3 py-2 text-sm">
          <option>Group by: Type</option>
          <option>Group by: Owner</option>
          <option>Group by: Risk</option>
        </select>
      </div>

      {/* Identities Table */}
      {identitiesData && (
        <DataTable
          data={identitiesData.identities}
          columns={[
            {
              key: 'name',
              label: 'Name',
              sortable: true,
              render: (value, row) => (
                <div>
                  <div className="font-medium text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">Owner: {row.owner}</div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(row.createdAt).toLocaleDateString()}
                  </div>
                  {row.lastRotation ? (
                    <div className="text-xs text-muted-foreground">
                      Last rotation: {getTimeAgo(row.lastRotation)}
                    </div>
                  ) : (
                    <div className="text-xs text-nexora-warning">⚠️ Never rotated (Overdue)</div>
                  )}
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              render: (value) => (
                <Badge variant="outline">
                  {value === 'ai_agent' ? 'AI Agent' :
                   value === 'api_key' ? 'API Key' :
                   value === 'service_account' ? 'Service Account' :
                   value === 'ssh_key' ? 'SSH Key' :
                   'OAuth Token'}
                </Badge>
              ),
            },
            {
              key: 'riskScore',
              label: 'Risk',
              sortable: true,
              render: (value) => (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    value >= 80 ? 'bg-nexora-threat' :
                    value >= 60 ? 'bg-nexora-warning' :
                    value >= 40 ? 'bg-security-high' :
                    'bg-nexora-ai'
                  }`} />
                  <span className={getRiskColor(value)}>{value}</span>
                </div>
              ),
            },
            {
              key: 'lastSeen',
              label: 'Last Seen',
              sortable: true,
              render: (value) => getTimeAgo(value),
            },
          ]}
          loading={loading}
          pagination={{
            page,
            pageSize: 25,
            total: identitiesData.total,
            onPageChange: setPage,
            onPageSizeChange: () => {},
          }}
          onRowClick={(row) => console.log('View identity:', row.id)}
        />
      )}
    </div>
  );
}
