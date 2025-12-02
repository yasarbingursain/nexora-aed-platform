"use client";

import React, { useState } from 'react';
import { useBlocklist } from '@/hooks/use-osint';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, Download, Copy, Check } from 'lucide-react';

export function BlocklistPanel() {
  const { blocklist, loading, error } = useBlocklist(60, 500);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ips' | 'domains' | 'urls'>('ips');

  const handleCopy = () => {
    if (!blocklist) return;
    
    const data = blocklist[activeTab].join('\n');
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!blocklist) return;
    
    const data = blocklist[activeTab].join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora-blocklist-${activeTab}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </Card>
    );
  }

  if (error || !blocklist) {
    return (
      <Card className="p-6">
        <div className="text-center py-12 text-gray-500">
          Blocklist unavailable
        </div>
      </Card>
    );
  }

  const tabs = [
    { key: 'ips' as const, label: 'IP Addresses', count: blocklist.ips.length },
    { key: 'domains' as const, label: 'Domains', count: blocklist.domains.length },
    { key: 'urls' as const, label: 'URLs', count: blocklist.urls.length },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold">SOAR Blocklist</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {blocklist.total_items} Total
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-y-auto">
        <div className="font-mono text-xs space-y-1">
          {blocklist[activeTab].length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} in blocklist
            </div>
          ) : (
            blocklist[activeTab].map((item, index) => (
              <div
                key={index}
                className="py-1 px-2 hover:bg-gray-800 rounded transition-colors"
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Generated: {new Date(blocklist.generated_at).toLocaleString()}</p>
        <p>Expires: {new Date(blocklist.expires_at).toLocaleString()}</p>
        <p>Min Risk Score: {blocklist.metadata.min_risk_score}</p>
        <p>Sources: {blocklist.metadata.sources.join(', ').toUpperCase()}</p>
      </div>
    </Card>
  );
}
