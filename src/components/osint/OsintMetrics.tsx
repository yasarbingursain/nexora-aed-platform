"use client";

import React from 'react';
import { useOsintStats } from '@/hooks/use-osint';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, Shield, TrendingUp, Database } from 'lucide-react';

export function OsintMetrics() {
  const { stats, loading, error } = useOsintStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-gray-800 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const metrics = [
    {
      label: 'Total Threats',
      value: Number(stats.total || 0).toLocaleString(),
      icon: Shield,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Critical',
      value: Number(stats.critical || 0).toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Avg Risk Score',
      value: stats.avg_risk_score ? Number(stats.avg_risk_score).toFixed(1) : '0',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Active Sources',
      value: Number(stats.sources || 0).toString(),
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                <p className="text-3xl font-bold">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
