"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Shield, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Eye,
  Ban,
  Share2,
  Globe,
  Activity
} from 'lucide-react';
import type { ThreatIndicator, ThreatSeverity, ThreatType, NHITIFeedResponse } from './NHITIFeed.types';
import { fetchNHITIFeed, blockThreatIndicator, shareThreatIndicator, exportNHITIFeed } from '@/lib/api/nhiti';

export function NHITIFeed() {
  const [feedData, setFeedData] = useState<NHITIFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedSeverity, setSelectedSeverity] = useState<ThreatSeverity | 'all'>('all');

  // Fetch live data from API
  const loadFeedData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNHITIFeed(100);
      setFeedData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NHITI feed');
      console.error('NHITI Feed Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadFeedData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadFeedData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleBlock = async (indicatorId: string) => {
    try {
      await blockThreatIndicator(indicatorId);
      await loadFeedData();
    } catch (err) {
      console.error('Failed to block indicator:', err);
    }
  };

  const handleShare = async (indicatorId: string) => {
    try {
      await shareThreatIndicator(indicatorId);
      await loadFeedData();
    } catch (err) {
      console.error('Failed to share indicator:', err);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'stix') => {
    try {
      const blob = await exportNHITIFeed(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhiti-feed-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export feed:', err);
    }
  };

  const getSeverityColor = (severity: ThreatSeverity) => {
    const colors = {
      critical: 'text-nexora-threat bg-nexora-threat/10 border-nexora-threat/20',
      high: 'text-security-high bg-security-high/10 border-security-high/20',
      medium: 'text-nexora-warning bg-nexora-warning/10 border-nexora-warning/20',
      low: 'text-nexora-ai bg-nexora-ai/10 border-nexora-ai/20'
    };
    return colors[severity];
  };

  const getTypeIcon = (type: ThreatType) => {
    const icons = {
      'agent-fingerprint': Shield,
      'token-abuse': AlertTriangle,
      'bot-signature': Activity,
      'malicious-ip': Globe
    };
    return icons[type];
  };

  const filteredIndicators = feedData?.indicators.filter(indicator => 
    selectedSeverity === 'all' || indicator.severity === selectedSeverity
  ) || [];

  if (loading && !feedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-nexora-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading live threat intelligence...</p>
        </div>
      </div>
    );
  }

  if (error && !feedData) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-nexora-threat mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load NHITI Feed</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadFeedData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">NHITI - Threat Intelligence Feed</h2>
          <p className="text-muted-foreground">Global Non-Human Identity Threat Intelligence Network</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${
              autoRefresh ? 'bg-nexora-ai animate-pulse' : 'bg-muted-foreground'
            }`} />
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {feedData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-3xl font-bold text-nexora-primary mb-1">
              {feedData.stats.totalShared.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">IOCs Shared (24h)</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-nexora-threat mb-1">
              {feedData.stats.detectedGlobally.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Detected Globally</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-nexora-warning mb-1">
              {(feedData.stats.avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-nexora-ai mb-1">
              {feedData.stats.blockRate}%
            </div>
            <div className="text-sm text-muted-foreground">Block Rate</div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Live Feed ({filteredIndicators.length} Indicators)
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as ThreatSeverity | 'all')}
              className="bg-card border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredIndicators.map((indicator) => {
            const TypeIcon = getTypeIcon(indicator.type);
            return (
              <div
                key={indicator.id}
                className="border border-border/50 rounded-lg p-4 hover:bg-bg-elevated/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      indicator.severity === 'critical' ? 'bg-nexora-threat animate-pulse-critical' :
                      indicator.severity === 'high' ? 'bg-security-high' :
                      indicator.severity === 'medium' ? 'bg-nexora-warning' :
                      'bg-nexora-ai'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{indicator.title}</span>
                        <Badge className={getSeverityColor(indicator.severity)} size="sm">
                          {indicator.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {indicator.industry}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {indicator.description}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {indicator.details}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Confidence: {(indicator.confidence * 100).toFixed(0)}%</span>
                        <span>Affected: {indicator.affectedOrgs} orgs</span>
                        <span>{indicator.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleShare(indicator.id)} title="Share with customers">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleBlock(indicator.id)} title="Block globally">
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="View details">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
