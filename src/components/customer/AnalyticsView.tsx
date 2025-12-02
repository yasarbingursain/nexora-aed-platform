"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { Download, Calendar, TrendingDown, TrendingUp, DollarSign, Shield } from 'lucide-react';
import { fetchAnalytics, exportReport } from '@/lib/api/analytics';
import type { AnalyticsResponse } from '@/lib/api/analytics';

export function AnalyticsView() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAnalytics(dateRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const blob = await exportReport(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading && !analyticsData) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  if (!analyticsData) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Security Analytics</h1>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Executive Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Threats Detected"
            value={analyticsData.metrics.threatsDetected}
            change={analyticsData.metrics.threatsChange}
            trend={analyticsData.metrics.threatsChange < 0 ? 'down' : 'up'}
            icon={<Shield className="h-6 w-6" />}
          />
          <MetricCard
            title="Auto-Resolved"
            value={`${analyticsData.metrics.autoResolved}%`}
            change={analyticsData.metrics.autoResolvedChange}
            trend="up"
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Median TTR"
            value={`${analyticsData.metrics.medianTTR}s`}
            change={analyticsData.metrics.ttrChange}
            trend={analyticsData.metrics.ttrChange < 0 ? 'down' : 'up'}
            icon={<TrendingDown className="h-6 w-6" />}
          />
          <MetricCard
            title="Cost per 1K Reqs"
            value={`$${analyticsData.metrics.costPerRequest.toFixed(2)}`}
            icon={<DollarSign className="h-6 w-6" />}
          />
        </div>
      </Card>

      {/* Threat Volume Trend */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Threat Volume Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {analyticsData.threatTrends.map((trend, index) => {
            const total = trend.critical + trend.high + trend.medium + trend.low;
            const maxHeight = 200;
            const height = total > 0 ? (total / 100) * maxHeight : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end" style={{ height: maxHeight }}>
                  {trend.critical > 0 && (
                    <div
                      className="w-full bg-nexora-threat rounded-t"
                      style={{ height: `${(trend.critical / total) * height}px` }}
                      title={`Critical: ${trend.critical}`}
                    />
                  )}
                  {trend.high > 0 && (
                    <div
                      className="w-full bg-nexora-warning"
                      style={{ height: `${(trend.high / total) * height}px` }}
                      title={`High: ${trend.high}`}
                    />
                  )}
                  {trend.medium > 0 && (
                    <div
                      className="w-full bg-nexora-ai"
                      style={{ height: `${(trend.medium / total) * height}px` }}
                      title={`Medium: ${trend.medium}`}
                    />
                  )}
                  {trend.low > 0 && (
                    <div
                      className="w-full bg-nexora-primary rounded-b"
                      style={{ height: `${(trend.low / total) * height}px` }}
                      title={`Low: ${trend.low}`}
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{trend.date}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-nexora-threat" />
            <span className="text-muted-foreground">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-nexora-warning" />
            <span className="text-muted-foreground">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-nexora-ai" />
            <span className="text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-nexora-primary" />
            <span className="text-muted-foreground">Low</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Attack Vectors */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Top Attack Vectors</h2>
          <div className="space-y-4">
            {analyticsData.attackVectors.map((vector, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-foreground">{vector.name}</span>
                  <span className="text-muted-foreground">{vector.percentage}%</span>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2">
                  <div
                    className="bg-nexora-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${vector.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ROI Calculator */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">ROI Calculator</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nexora Cost (Annual):</span>
              <span className="text-foreground font-semibold">${analyticsData.roi.nexoraCostAnnual.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Threats Auto-Remediated (30d):</span>
              <span className="text-foreground font-semibold">{analyticsData.roi.threatsAutoRemediated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avoided Labor Cost (30d):</span>
              <span className="text-nexora-ai font-semibold">${analyticsData.roi.avoidedLaborCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Risk Reduction:</span>
              <span className="text-nexora-ai font-semibold">${analyticsData.roi.estimatedRiskReduction.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-foreground font-semibold">Total Value (Annual):</span>
                <span className="text-nexora-ai font-bold text-lg">${analyticsData.roi.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground font-semibold">ROI:</span>
                <span className="text-nexora-ai font-bold text-2xl">{analyticsData.roi.roi}x</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={() => handleExport('pdf')}>
          <Download className="h-4 w-4 mr-2" />
          Export Executive Report
        </Button>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Weekly Email
        </Button>
      </div>
    </div>
  );
}
