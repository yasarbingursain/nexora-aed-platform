'use client';

import { useLiveThreatFeed } from '@/hooks/useLiveThreatFeed';
import { formatDistanceToNow } from 'date-fns';

export function LiveThreatFeed() {
  const { threats, connected, statistics } = useLiveThreatFeed();

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Connection Status */}
      <div className="col-span-12 bg-slate-900 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            🌍 Live Global Threat Intelligence
          </h2>
          <div className="flex items-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-slate-400">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="col-span-4 space-y-4">
        {/* Total Today */}
        <div className="bg-red-950 border border-red-800 rounded-lg p-4">
          <div className="text-sm text-red-300">Threats Detected Today</div>
          <div className="text-4xl font-bold text-red-400 tabular-nums mt-2">
            {statistics.threats_today.toLocaleString()}
          </div>
          <div className="text-xs text-red-400 mt-2 flex items-center">
            <span className="animate-pulse mr-2">🔴</span>
            Updating in real-time
          </div>
        </div>

        {/* By Category */}
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-sm font-bold mb-3 text-white">Threat Categories</h3>
          {statistics.by_category.map((cat) => (
            <div key={cat.name} className="flex justify-between mb-2">
              <span className="text-slate-300">
                {cat.icon} {cat.name}
              </span>
              <span className="font-mono text-amber-400">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Feed */}
      <div className="col-span-8 bg-slate-900 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-4 text-white">
          ⚡ Real-Time Threat Stream
        </h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {threats.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              Waiting for threats...
            </div>
          ) : (
            threats.map((threat) => (
              <div
                key={threat.id}
                className="bg-slate-800 rounded-lg p-3 border-l-4 border-red-500 animate-slide-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getIconForType(threat.ioc_type)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {threat.count} new {threat.ioc_type}
                      </div>
                      <div className="text-xs text-slate-400">
                        Source: {threat.source}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(threat.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    url: '🔗',
    malware_sample: '🦠',
    ip: '🌐',
    domain: '🏠',
    mixed: '⚠️',
  };
  return icons[type] || '⚠️';
}
