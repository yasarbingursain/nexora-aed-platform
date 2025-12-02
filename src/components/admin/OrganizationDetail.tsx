"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  Building,
  Users,
  Shield,
  DollarSign,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  Ban,
  Play,
  Trash2,
  MoreVertical
} from 'lucide-react';
import type { OrganizationDetailResponse } from './OrganizationDetail.types';
import { fetchOrganizationDetail, updateOrganizationSettings, suspendOrganization, reactivateOrganization } from '@/lib/api/organizations';

interface OrganizationDetailProps {
  organizationId: string;
  onBack?: () => void;
}

type TabType = 'overview' | 'identities' | 'threats' | 'billing' | 'settings';

export function OrganizationDetail({ organizationId, onBack }: OrganizationDetailProps) {
  const [data, setData] = useState<OrganizationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const orgData = await fetchOrganizationDetail(organizationId);
      setData(orgData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      console.error('Organization Detail Error:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this organization?')) return;
    try {
      await suspendOrganization(organizationId, 'Admin action');
      await loadData();
    } catch (err) {
      console.error('Failed to suspend:', err);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateOrganization(organizationId);
      await loadData();
    } catch (err) {
      console.error('Failed to reactivate:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-nexora-ai bg-nexora-ai/10 border-nexora-ai/20',
      trial: 'text-nexora-primary bg-nexora-primary/10 border-nexora-primary/20',
      suspended: 'text-nexora-threat bg-nexora-threat/10 border-nexora-threat/20',
      cancelled: 'text-muted-foreground bg-muted/10 border-muted/20'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-nexora-threat';
    if (score >= 60) return 'text-nexora-warning';
    if (score >= 40) return 'text-security-high';
    return 'text-nexora-ai';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-nexora-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization details...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-nexora-threat mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Organization</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const { organization, metrics, entityBreakdown, recentThreats, billing, settings } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
              <Badge className={getStatusColor(organization.status)}>
                {organization.status.toUpperCase()}
              </Badge>
              <Badge variant="outline">{organization.plan}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{organization.industry}</span>
              <span>•</span>
              <span>{organization.region}</span>
              <span>•</span>
              <span>Created {organization.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {organization.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={handleSuspend}>
              <Ban className="h-4 w-4 mr-2" />
              Suspend
            </Button>
          ) : organization.status === 'suspended' ? (
            <Button variant="outline" size="sm" onClick={handleReactivate}>
              <Play className="h-4 w-4 mr-2" />
              Reactivate
            </Button>
          ) : null}
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-nexora-primary" />
            <span className={`text-xs ${organization.growthRate >= 0 ? 'text-nexora-ai' : 'text-nexora-threat'}`}>
              {organization.growthRate >= 0 ? '+' : ''}{organization.growthRate}%
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.activeUsers}</div>
          <div className="text-sm text-muted-foreground">Active Users</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-nexora-ai" />
            <span className={`text-xs ${metrics.entitiesGrowth >= 0 ? 'text-nexora-ai' : 'text-nexora-threat'}`}>
              {metrics.entitiesGrowth >= 0 ? '+' : ''}{metrics.entitiesGrowth}%
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.totalEntities.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Entities</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-nexora-threat" />
            <span className={getRiskScoreColor(organization.riskScore)}>
              Risk: {organization.riskScore}
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.threatsDetected}</div>
          <div className="text-sm text-muted-foreground">Threats Detected</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-nexora-warning" />
            <CheckCircle className="h-4 w-4 text-nexora-ai" />
          </div>
          <div className="text-2xl font-bold text-foreground">${organization.revenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Monthly Revenue</div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border">
          <div className="flex items-center gap-1 p-2">
            {(['overview', 'identities', 'threats', 'billing', 'settings'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-nexora-primary/10 text-nexora-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-bg-elevated'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab
              organization={organization}
              metrics={metrics}
              entityBreakdown={entityBreakdown}
              recentThreats={recentThreats}
            />
          )}
          {activeTab === 'identities' && (
            <IdentitiesTab organizationId={organizationId} entityBreakdown={entityBreakdown} />
          )}
          {activeTab === 'threats' && (
            <ThreatsTab organizationId={organizationId} recentThreats={recentThreats} />
          )}
          {activeTab === 'billing' && (
            <BillingTab organizationId={organizationId} billing={billing} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab organizationId={organizationId} settings={settings} onUpdate={loadData} />
          )}
        </div>
      </Card>
    </div>
  );
}

// Tab Components
function OverviewTab({ organization, metrics, entityBreakdown, recentThreats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Entity Breakdown</h3>
          <div className="space-y-3">
            {entityBreakdown.map((item: any, index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{item.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.count.toLocaleString()}</span>
                    {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-nexora-ai" />}
                    {item.trend === 'down' && <TrendingDown className="h-3 w-3 text-nexora-threat" />}
                  </div>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2">
                  <div
                    className="bg-nexora-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentThreats.slice(0, 5).map((threat: any) => (
              <div key={threat.id} className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  threat.severity === 'critical' ? 'bg-nexora-threat' :
                  threat.severity === 'high' ? 'bg-security-high' :
                  threat.severity === 'medium' ? 'bg-nexora-warning' :
                  'bg-nexora-ai'
                }`} />
                <div className="flex-1">
                  <div className="text-foreground font-medium">{threat.type}</div>
                  <div className="text-muted-foreground text-xs">{threat.entityName}</div>
                  <div className="text-muted-foreground text-xs">{threat.timestamp.toLocaleString()}</div>
                </div>
                <Badge className={
                  threat.status === 'resolved' ? 'bg-nexora-ai/10 text-nexora-ai' :
                  threat.status === 'investigating' ? 'bg-nexora-warning/10 text-nexora-warning' :
                  'bg-nexora-threat/10 text-nexora-threat'
                } size="sm">
                  {threat.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Organization Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Contact</div>
            <div className="text-foreground">{organization.contactEmail}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Industry</div>
            <div className="text-foreground">{organization.industry}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Region</div>
            <div className="text-foreground">{organization.region}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Compliance</div>
            <div className="text-foreground">{organization.complianceFrameworks.join(', ')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function IdentitiesTab({ organizationId, entityBreakdown }: any) {
  return (
    <div className="text-center py-8">
      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Identities Management</h3>
      <p className="text-muted-foreground mb-4">
        Detailed identity management view coming soon
      </p>
      <div className="text-sm text-muted-foreground">
        Total Entities: {entityBreakdown.reduce((sum: number, item: any) => sum + item.count, 0).toLocaleString()}
      </div>
    </div>
  );
}

function ThreatsTab({ organizationId, recentThreats }: any) {
  return (
    <div className="space-y-4">
      {recentThreats.map((threat: any) => (
        <Card key={threat.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-foreground">{threat.type}</span>
                <Badge className={
                  threat.severity === 'critical' ? 'bg-nexora-threat/10 text-nexora-threat' :
                  threat.severity === 'high' ? 'bg-security-high/10 text-security-high' :
                  threat.severity === 'medium' ? 'bg-nexora-warning/10 text-nexora-warning' :
                  'bg-nexora-ai/10 text-nexora-ai'
                } size="sm">
                  {threat.severity.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">{threat.description}</div>
              <div className="text-xs text-muted-foreground">
                Entity: {threat.entityName} • {threat.timestamp.toLocaleString()}
              </div>
            </div>
            <Badge className={
              threat.status === 'resolved' ? 'bg-nexora-ai/10 text-nexora-ai' :
              threat.status === 'investigating' ? 'bg-nexora-warning/10 text-nexora-warning' :
              'bg-nexora-threat/10 text-nexora-threat'
            }>
              {threat.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BillingTab({ organizationId, billing }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
          <div className="text-2xl font-bold text-foreground">{billing.plan}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Monthly Revenue</div>
          <div className="text-2xl font-bold text-foreground">${billing.monthlyRevenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Annual Revenue</div>
          <div className="text-2xl font-bold text-foreground">${billing.annualRevenue.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Billing History</h3>
        <div className="space-y-2">
          {billing.billingHistory.map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-sm font-medium text-foreground">{tx.description}</div>
                <div className="text-xs text-muted-foreground">{tx.date.toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">${tx.amount.toLocaleString()}</span>
                <Badge className={
                  tx.status === 'paid' ? 'bg-nexora-ai/10 text-nexora-ai' :
                  tx.status === 'pending' ? 'bg-nexora-warning/10 text-nexora-warning' :
                  'bg-nexora-threat/10 text-nexora-threat'
                } size="sm">
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab({ organizationId, settings, onUpdate }: any) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganizationSettings(organizationId, localSettings);
      await onUpdate();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Auto Remediation</div>
              <div className="text-xs text-muted-foreground">Automatically remediate detected threats</div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoRemediation}
              onChange={(e) => setLocalSettings({ ...localSettings, autoRemediation: e.target.checked })}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Compliance Mode</div>
              <div className="text-xs text-muted-foreground">Enable strict compliance monitoring</div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.complianceMode}
              onChange={(e) => setLocalSettings({ ...localSettings, complianceMode: e.target.checked })}
              className="w-4 h-4"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Notification Email</label>
            <input
              type="email"
              value={localSettings.notificationEmail}
              onChange={(e) => setLocalSettings({ ...localSettings, notificationEmail: e.target.value })}
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Slack Webhook (Optional)</label>
            <input
              type="url"
              value={localSettings.slackWebhook || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, slackWebhook: e.target.value })}
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              placeholder="https://hooks.slack.com/..."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setLocalSettings(settings)}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
