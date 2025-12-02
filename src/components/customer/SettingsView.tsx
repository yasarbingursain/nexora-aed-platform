"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Building, Shield, Bell, Users, Key, Slack, Mail } from 'lucide-react';

type SettingsTab = 'organization' | 'detection' | 'integrations' | 'notifications' | 'team';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden mb-6">
        <div className="border-b border-border">
          <div className="flex items-center gap-1 p-2">
            {(['organization', 'detection', 'integrations', 'notifications', 'team'] as SettingsTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-nexora-primary/10 text-nexora-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-bg-elevated'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'organization' && <OrganizationTab />}
      {activeTab === 'detection' && <DetectionTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'team' && <TeamTab />}
    </div>
  );
}

function OrganizationTab() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Organization Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Name</div>
            <div className="text-foreground">Acme Corporation</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Industry</div>
            <div className="text-foreground">Financial Services</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Region</div>
            <div className="text-foreground">North America</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Tier</div>
            <Badge className="bg-nexora-primary/10 text-nexora-primary">Enterprise</Badge>
          </div>
        </div>
        <Button variant="outline" className="mt-4">Edit Organization Details</Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Subscription & Usage</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan:</span>
            <span className="text-foreground font-semibold">Enterprise (Annual)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing Cycle:</span>
            <span className="text-foreground">Renews Jan 15, 2026</span>
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <div className="font-semibold text-foreground mb-2">Usage This Month:</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Identities:</span>
                <span className="text-foreground">12,347 / Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• Events Analyzed:</span>
                <span className="text-foreground">2.4M / Unlimited</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">• API Calls:</span>
                <span className="text-foreground">847K / Unlimited</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">View Detailed Usage</Button>
          <Button variant="outline" size="sm">Billing History</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Compliance Settings</h2>
        <div className="space-y-2">
          {['SOC 2 Type II', 'ISO 27001:2022', 'PCI DSS 4.0', 'NIST 800-53', 'GDPR', 'DORA'].map((framework) => (
            <label key={framework} className="flex items-center gap-3 p-2 hover:bg-bg-elevated rounded-md cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-foreground">{framework}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-sm font-semibold text-foreground mb-2">Data Retention:</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• Audit Logs: 7 years (regulatory requirement)</div>
            <div>• Threat Events: 1 year</div>
            <div>• Entity Metadata: Indefinite</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">Generate Compliance Report</Button>
          <Button variant="outline" size="sm">Export Audit Logs</Button>
        </div>
      </Card>
    </div>
  );
}

function DetectionTab() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Detection Configuration</h2>
      <div className="text-muted-foreground">Detection settings - Full implementation</div>
    </Card>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Connected Services</h2>
          <Button size="sm">+ Add New</Button>
        </div>
        
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Slack className="h-8 w-8 text-[#4A154B]" />
                <div>
                  <div className="font-semibold text-foreground">Slack</div>
                  <Badge className="bg-nexora-ai/10 text-nexora-ai mt-1">Connected</Badge>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Real-time threat alerts to #security-ops<br />
              Configured: 3 channels<br />
              Last alert: 2 minutes ago
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Configure</Button>
              <Button variant="outline" size="sm">Test Connection</Button>
              <Button variant="ghost" size="sm" className="text-nexora-threat">Disconnect</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">API Access</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <div className="font-medium text-foreground">prod-integration</div>
              <code className="text-xs text-muted-foreground">nex_prod_a3f8b...</code>
              <div className="text-xs text-muted-foreground mt-1">Created: Feb 3, 2025 • Last used: 5 sec ago</div>
            </div>
            <Badge variant="outline">Read/Write</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-4">+ Generate New API Key</Button>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Notification Preferences</h2>
      <div className="text-muted-foreground">Notification settings - Full implementation</div>
    </Card>
  );
}

function TeamTab() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
        <Button size="sm">+ Invite User</Button>
      </div>
      <div className="text-muted-foreground">Team management - Full implementation</div>
    </Card>
  );
}
