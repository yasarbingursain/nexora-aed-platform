"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { MetricCard } from '@/components/ui/MetricCard';
import { Cpu, HardDrive, Network, Monitor, AlertTriangle } from 'lucide-react';
import { fetchSystemHealth } from '@/lib/api/system';
import type { SystemHealthResponse } from '@/lib/api/system';

export function SystemHealth() {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const health = await fetchSystemHealth();
      setData(health);
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          System Health
          <LiveIndicator active size="sm" />
          <Badge className={
            data.status === 'healthy' ? 'bg-nexora-ai/10 text-nexora-ai' :
            data.status === 'degraded' ? 'bg-nexora-warning/10 text-nexora-warning' :
            'bg-nexora-threat/10 text-nexora-threat'
          }>
            {data.status.toUpperCase()}
          </Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CPU Usage"
            value={`${data.metrics.cpu}%`}
            icon={<Cpu className="h-5 w-5" />}
            trend={data.metrics.cpu > 80 ? 'up' : data.metrics.cpu < 50 ? 'down' : 'neutral'}
            live
          />
          <MetricCard
            title="Memory"
            value={`${data.metrics.memory}%`}
            icon={<HardDrive className="h-5 w-5" />}
            trend={data.metrics.memory > 80 ? 'up' : data.metrics.memory < 50 ? 'down' : 'neutral'}
            live
          />
          <MetricCard
            title="Network I/O"
            value={`${data.metrics.network} MB/s`}
            icon={<Network className="h-5 w-5" />}
            live
          />
          <MetricCard
            title="Connections"
            value={data.metrics.connections.toLocaleString()}
            icon={<Monitor className="h-5 w-5" />}
            subtitle={`${data.metrics.uptime}% uptime`}
            live
          />
        </div>
      </Card>

      {data.alerts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  alert.severity === 'critical' ? 'bg-nexora-threat animate-pulse-critical' :
                  alert.severity === 'warning' ? 'bg-nexora-warning' :
                  'bg-nexora-primary'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{alert.title}</span>
                    <Badge className={
                      alert.severity === 'critical' ? 'bg-nexora-threat/10 text-nexora-threat' :
                      alert.severity === 'warning' ? 'bg-nexora-warning/10 text-nexora-warning' :
                      'bg-nexora-primary/10 text-nexora-primary'
                    } size="sm">
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">{alert.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {alert.customer && `${alert.customer} • `}{alert.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
