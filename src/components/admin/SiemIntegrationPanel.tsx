"use client";

/**
 * SIEM Integration Configuration Panel
 * Nexora AED Platform - Enterprise SIEM Compatibility
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSiem, SiemStatus, SiemTestResult, SiemFormat, SiemProvider } from '@/hooks/useSiem';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Server,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Send,
  Settings,
  AlertTriangle,
  Zap,
  Shield,
  Database,
  Cloud,
  Terminal,
} from 'lucide-react';

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    icon: React.ReactNode;
    configured: boolean;
    description: string;
  };
  testResult?: { connected: boolean; error?: string };
  onTest: () => void;
  testing: boolean;
}

function ProviderCard({ provider, testResult, onTest, testing }: ProviderCardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${provider.configured ? 'bg-cyan-500/20' : 'bg-gray-700'}`}>
            {provider.icon}
          </div>
          <div>
            <h4 className="font-medium text-white">{provider.name}</h4>
            <p className="text-xs text-gray-400">{provider.description}</p>
          </div>
        </div>
        <Badge variant={provider.configured ? 'default' : 'secondary'} className="text-xs">
          {provider.configured ? 'Configured' : 'Not Configured'}
        </Badge>
      </div>

      {provider.configured && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            {testResult ? (
              testResult.connected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-500" title={testResult.error}>
                    Failed
                  </span>
                </>
              )
            ) : (
              <span className="text-xs text-gray-500">Not tested</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={testing}
            className="text-xs"
          >
            {testing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              'Test'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function SiemIntegrationPanel() {
  const {
    loading,
    error,
    getStatus,
    testConnectivity,
    getFormats,
    exportEvents,
  } = useSiem();

  const [status, setStatus] = useState<SiemStatus | null>(null);
  const [testResults, setTestResults] = useState<SiemTestResult | null>(null);
  const [formats, setFormats] = useState<{
    formats: SiemFormat[];
    providers: SiemProvider[];
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'cef' | 'leef' | 'syslog' | 'json'>('cef');

  const loadData = useCallback(async () => {
    const [statusData, formatsData] = await Promise.all([
      getStatus(),
      getFormats(),
    ]);
    setStatus(statusData);
    if (formatsData) {
      setFormats({
        formats: formatsData.formats,
        providers: formatsData.providers,
      });
    }
  }, [getStatus, getFormats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTestAll = async () => {
    setTesting(true);
    const results = await testConnectivity();
    setTestResults(results);
    setTesting(false);
  };

  const handleExport = async () => {
    setExporting(true);
    const data = await exportEvents({
      format: selectedFormat,
      limit: 100,
    });
    
    if (data) {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-siem-export-${new Date().toISOString().split('T')[0]}.${selectedFormat === 'json' ? 'json' : 'log'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const providers = [
    {
      id: 'syslog',
      name: 'Syslog (CEF/LEEF)',
      icon: <Terminal className="w-5 h-5 text-cyan-500" />,
      configured: status?.environmentVariables?.syslog?.configured || false,
      description: 'Generic syslog for any SIEM',
    },
    {
      id: 'splunk',
      name: 'Splunk',
      icon: <Zap className="w-5 h-5 text-green-500" />,
      configured: status?.environmentVariables?.splunk?.configured || false,
      description: 'HTTP Event Collector (HEC)',
    },
    {
      id: 'sentinel',
      name: 'Microsoft Sentinel',
      icon: <Cloud className="w-5 h-5 text-blue-500" />,
      configured: status?.environmentVariables?.sentinel?.configured || false,
      description: 'Azure Log Analytics API',
    },
    {
      id: 'elastic',
      name: 'Elastic SIEM',
      icon: <Database className="w-5 h-5 text-yellow-500" />,
      configured: status?.environmentVariables?.elastic?.configured || false,
      description: 'Elasticsearch bulk API',
    },
  ];

  const configuredCount = providers.filter(p => p.configured).length;

  if (loading && !status) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Server className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">SIEM Integration</h2>
              <p className="text-sm text-gray-400">
                Connect Nexora to your enterprise SIEM platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={configuredCount > 0 ? 'default' : 'secondary'}>
              {configuredCount} of {providers.length} Configured
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAll}
              disabled={testing || configuredCount === 0}
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Test All
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-500">{error}</span>
          </div>
        )}

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              testResult={testResults?.results?.[provider.id]}
              onTest={handleTestAll}
              testing={testing}
            />
          ))}
        </div>
      </Card>

      {/* Supported Formats */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-white">Supported Formats</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {formats?.formats.map((format) => (
            <div
              key={format.id}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            >
              <h4 className="font-medium text-white mb-1">{format.name}</h4>
              <p className="text-xs text-gray-400 mb-2">{format.description}</p>
              <div className="flex flex-wrap gap-1">
                {format.supportedBy.slice(0, 3).map((siem) => (
                  <Badge key={siem} variant="outline" className="text-xs">
                    {siem}
                  </Badge>
                ))}
                {format.supportedBy.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{format.supportedBy.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-semibold text-white">Export Events</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="cef">CEF (Common Event Format)</option>
              <option value="leef">LEEF (IBM QRadar)</option>
              <option value="syslog">Syslog (RFC 5424)</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="flex-1" />

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export Last 100 Events
          </Button>
        </div>

        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Tip:</strong> Export events in your SIEM's native format for easy import.
            CEF is widely supported by most SIEMs including Splunk, QRadar, and ArcSight.
            LEEF is optimized for IBM QRadar.
          </p>
        </div>
      </Card>

      {/* Configuration Guide */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-white">Configuration Guide</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Syslog Configuration</h4>
            <pre className="text-xs text-gray-400 overflow-x-auto">
{`# Environment Variables
SYSLOG_HOST=your-siem.example.com
SYSLOG_PORT=514
SYSLOG_PROTOCOL=tcp  # udp, tcp, or tls
SYSLOG_FORMAT=cef    # cef, leef, or syslog`}
            </pre>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Splunk HEC Configuration</h4>
            <pre className="text-xs text-gray-400 overflow-x-auto">
{`# Environment Variables
SPLUNK_HEC_URL=https://splunk.example.com:8088
SPLUNK_HEC_TOKEN=your-hec-token
SPLUNK_INDEX=nexora_security
SPLUNK_SOURCETYPE=nexora:security:events`}
            </pre>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Microsoft Sentinel Configuration</h4>
            <pre className="text-xs text-gray-400 overflow-x-auto">
{`# Environment Variables
SENTINEL_WORKSPACE_ID=your-workspace-id
SENTINEL_SHARED_KEY=your-shared-key
SENTINEL_LOG_TYPE=NexoraSecurityEvents`}
            </pre>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Elastic SIEM Configuration</h4>
            <pre className="text-xs text-gray-400 overflow-x-auto">
{`# Environment Variables
ELASTIC_URL=https://elastic.example.com:9200
ELASTIC_API_KEY=your-api-key
ELASTIC_INDEX=nexora-security-events`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SiemIntegrationPanel;
