"use client";

import React from 'react';
import { useOsintThreats } from '@/hooks/use-osint';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Globe, Shield, Clock } from 'lucide-react';

const severityColors = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const sourceIcons: Record<string, string> = {
  otx: '🔍',
  censys: '🌐',
  manual: '✍️',
};

export function OsintThreatFeed() {
  const { threats, loading, error } = useOsintThreats(20);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64 text-red-500">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>Failed to load OSINT threats</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold">Live OSINT Threat Feed</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {threats.length} Active
        </Badge>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {threats.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No threats detected
          </div>
        ) : (
          threats.map((threat) => (
            <div
              key={threat.id}
              className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                severityColors[threat.severity as keyof typeof severityColors] || severityColors.low
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sourceIcons[threat.source] || '📡'}</span>
                  <span className="font-mono text-sm font-semibold">{threat.value}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {threat.indicator_type.toUpperCase()}
                </Badge>
              </div>

              {threat.description && (
                <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                  {threat.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Risk: {Number(threat.risk_score).toFixed(0)}
                  </span>
                  {threat.country_code && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {threat.country_code}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(threat.last_seen).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-gray-500 uppercase">{threat.source}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
