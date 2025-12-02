'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useMalgenx } from '@/hooks/useMalgenx';

interface ThreatFeedItem {
  sampleId: string;
  submissionType: string;
  malwareFamily?: string;
  riskScore?: number;
  riskLevel?: string;
  isMalicious?: boolean;
  createdAt: string;
}

export function MalgenxThreatsFeed() {
  const [threats, setThreats] = useState<ThreatFeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { loading, error, getThreatsFeed } = useMalgenx();

  const loadThreats = async () => {
    setRefreshing(true);
    const result = await getThreatsFeed({ limit: 10, sinceMinutes: 1440 }); // Last 24 hours
    if (result) {
      setThreats(result.threats);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadThreats();
    const interval = setInterval(loadThreats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/50';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/50';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/50';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-500" />
          Live Malware Threats
        </h3>
        <button
          onClick={loadThreats}
          disabled={refreshing}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && threats.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : threats.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No malware threats detected in the last 24 hours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threats.map((threat) => (
            <div
              key={threat.sampleId}
              className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(threat.riskLevel)}`}>
                      {threat.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    {threat.malwareFamily && (
                      <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/50 text-purple-400 rounded text-xs font-medium">
                        {threat.malwareFamily}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium mb-1">
                    {threat.submissionType === 'url' ? 'Malicious URL' : 'Malicious File'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {threat.riskScore !== undefined && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Risk: {threat.riskScore.toFixed(0)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(threat.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
