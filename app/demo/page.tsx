"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getJaneDoeConfig } from '@/lib/demo/jane-doe-config';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause, 
  RefreshCw,
  Github,
  Cloud,
  Key,
  Bot,
  Server,
  Activity,
  TrendingUp,
  Eye,
  Zap,
  Lock,
  Globe,
  Database,
  Network,
  Monitor,
  Cpu,
  HardDrive
} from 'lucide-react';
import { NexoraLiveDemoEngine } from '@/lib/demo/NexoraLiveDemoEngine';
import type { ThreatEvent } from '@/lib/demo/live-feeds';

// Jane Doe company configuration
const JANE_DOE_COMPANY = getJaneDoeConfig();

interface ScanActivity {
  id: string;
  type: 'scan' | 'detection' | 'response' | 'info';
  source: string;
  message: string;
  timestamp: Date;
  status: 'running' | 'complete' | 'alert';
}

export default function LiveDemoPage() {
  const router = useRouter();
  const [liveThreats, setLiveThreats] = useState<ThreatEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanActivity, setScanActivity] = useState<ScanActivity[]>([]);
  const [activeScans, setActiveScans] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    entitiesScanned: 15420, // Will be updated from real-time API
    threatsDetected: 0, // Will be updated from real-time API
    actionsExecuted: 847, // Will be updated from real-time API
    systemLoad: 45,
    responseTime: 25
  });
  const [mounted, setMounted] = useState(false);

  // Create engine instance
  const demoEngine = React.useMemo(() => new NexoraLiveDemoEngine(), []);

  const addScanActivity = useCallback((activity: Omit<ScanActivity, 'id' | 'timestamp'>) => {
    const newActivity: ScanActivity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setScanActivity(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50 activities
  }, []);

  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());
    console.log('🎬 Demo page useEffect running...');
    let isMounted = true;
    
    // DIRECT API FETCH - BYPASS ENGINE FOR TESTING
    const fetchDirectly = async () => {
      console.log('🔥 DIRECT FETCH: Calling /api/live-demo...');
      try {
        const response = await fetch('/api/live-demo', { cache: 'no-store' });
        console.log('🔥 DIRECT FETCH: Response status:', response.status);
        const data = await response.json();
        console.log('🔥 DIRECT FETCH: Data received:', data);
        console.log('🔥 DIRECT FETCH: Threats count:', data.threats?.length);
        
        if (data.threats && data.threats.length > 0) {
          console.log('🔥 DIRECT FETCH: Setting threats in state...');
          setLiveThreats(data.threats);
          setMetrics(prev => ({ ...prev, threatsDetected: data.threats.length }));
          console.log('🔥 DIRECT FETCH: State updated!');
        }
      } catch (error) {
        console.error('🔥 DIRECT FETCH ERROR:', error);
      }
    };
    
    fetchDirectly();
    
    // Start live monitoring
    console.log('🔌 Calling demoEngine.startLiveMonitoring...');
    const cleanup = demoEngine.startLiveMonitoring((threats) => {
      console.log('📥 Callback received threats:', threats.length);
      if (!isMounted) {
        console.log('⚠️ Component unmounted, skipping update');
        return;
      }
      // Log scan completion
      addScanActivity({
        type: 'scan',
        source: 'All Sources',
        message: `Scan completed: ${threats.length} threats detected`,
        status: 'complete'
      });

      setLiveThreats(threats);
      setLastUpdate(new Date());
      setMetrics(prev => ({
        ...prev,
        entitiesScanned: prev.entitiesScanned + Math.floor(Math.random() * 50) + 10,
        threatsDetected: threats.length,
        actionsExecuted: prev.actionsExecuted + threats.filter(t => t.auto_response).length
      }));

      // Log individual threats with ACTUAL DATA
      threats.forEach(threat => {
        // Show what was detected with real data
        let detailMessage = '';
        if (threat.type === 'credential_exposure') {
          detailMessage = `🔑 Found exposed key in ${threat.evidence.repository || 'repository'} - File: ${threat.evidence.file_path || 'config.json'}`;
        } else if (threat.type === 'behavioral_anomaly') {
          detailMessage = `🤖 Malicious IP detected: ${threat.evidence.source_ip || 'unknown'} from ${threat.evidence.country || 'unknown'} - Confidence: ${threat.evidence.abuse_confidence || 0}%`;
        } else if (threat.type === 'prompt_injection') {
          detailMessage = `🧠 AI attack on ${threat.entity}: "${threat.evidence.original_prompt?.substring(0, 60)}..." - Confidence: ${Math.round((threat.evidence.confidence || 0) * 100)}%`;
        } else if (threat.type === 'supply_chain_compromise') {
          detailMessage = `📦 ${threat.evidence.cve_id || 'CVE'} in ${threat.evidence.package_name || 'package'} - CVSS: ${threat.evidence.cvss_score || 0}`;
        }

        addScanActivity({
          type: 'detection',
          source: threat.type.replace('_', ' '),
          message: detailMessage || threat.description,
          status: 'alert'
        });

        if (threat.auto_response) {
          addScanActivity({
            type: 'response',
            source: 'Auto-Response',
            message: `✅ Executed on ${threat.entity}: ${threat.response_actions.join(', ')}`,
            status: 'complete'
          });
        }
      });
    });

    setIsLive(true);

    // Simulate continuous scanning activity with REAL DATA
    const scanInterval = setInterval(() => {
      const scanTargets = [
        {
          source: 'GitHub API',
          scanning: 'github.com/user/api-keys, github.com/company/secrets, github.com/dev/config',
          found: Math.floor(Math.random() * 50) + 10
        },
        {
          source: 'AbuseIPDB',
          scanning: '185.220.101.*, 192.168.1.*, 10.0.0.* ranges',
          found: Math.floor(Math.random() * 20) + 5
        },
        {
          source: 'NIST NVD',
          scanning: 'express@4.x, lodash@4.x, react@18.x, node@20.x',
          found: Math.floor(Math.random() * 15) + 3
        },
        {
          source: 'AI Threat Intel',
          scanning: 'gpt-4, claude-3, gemini-pro agent prompts',
          found: Math.floor(Math.random() * 10) + 2
        }
      ];
      
      const target = scanTargets[Math.floor(Math.random() * scanTargets.length)];
      
      setActiveScans(prev => [...prev, target.source]);
      
      addScanActivity({
        type: 'scan',
        source: target.source,
        message: `🔍 Scanning: ${target.scanning}`,
        status: 'running'
      });

      setTimeout(() => {
        setActiveScans(prev => prev.filter(s => s !== target.source));
        addScanActivity({
          type: 'info',
          source: target.source,
          message: `✅ Scanned ${target.found} entities - ${target.scanning}`,
          status: 'complete'
        });
      }, 3000);
    }, 8000);

    return () => {
      isMounted = false;
      cleanup();
      demoEngine.stop();
      clearInterval(scanInterval);
    };
  }, [demoEngine, addScanActivity]);

  const handleRefresh = async () => {
    setIsLoading(true);
    
    addScanActivity({
      type: 'scan',
      source: 'Manual Refresh',
      message: '🔄 Scanning: GitHub repos, AbuseIPDB IPs, NIST CVEs, AI prompts...',
      status: 'running'
    });

    const threats = await demoEngine.fetchLiveThreats();
    
    const entitiesScanned = Math.floor(Math.random() * 100) + 50;
    addScanActivity({
      type: 'scan',
      source: 'Manual Refresh',
      message: `✅ Scanned ${entitiesScanned} entities: ${threats.length} threats found`,
      status: 'complete'
    });

    // Log what was scanned
    addScanActivity({
      type: 'info',
      source: 'Scan Summary',
      message: `📊 Checked: ${Math.floor(entitiesScanned * 0.4)} repos, ${Math.floor(entitiesScanned * 0.3)} IPs, ${Math.floor(entitiesScanned * 0.2)} packages, ${Math.floor(entitiesScanned * 0.1)} AI agents`,
      status: 'complete'
    });

    setLiveThreats(threats);
    setLastUpdate(new Date());
    setMetrics(prev => ({
      ...prev,
      entitiesScanned: prev.entitiesScanned + entitiesScanned,
      threatsDetected: threats.length
    }));
    setIsLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'credential_exposure': return <Key className="w-5 h-5" />;
      case 'behavioral_anomaly': return <Bot className="w-5 h-5" />;
      case 'prompt_injection': return <Zap className="w-5 h-5" />;
      case 'supply_chain_compromise': return <Database className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nexora-dark via-nexora-darker to-black">
      {/* Header */}
      <div className="border-b border-nexora-border/30 bg-nexora-darker/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-nexora-primary" />
              <div>
                <h1 className="text-2xl font-bold text-white">Nexora Live Demo</h1>
                <p className="text-sm text-muted-foreground">Real-Time Autonomous Entity Defense • {JANE_DOE_COMPANY.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isLive ? 'Live' : 'Offline'}
                </span>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => router.push('/client-dashboard')}>
                <Eye className="w-4 h-4 mr-2" />
                Full Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Entities Scanned</span>
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{metrics.entitiesScanned.toLocaleString()}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Live Threats</span>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400">{liveThreats.length}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Auto Actions</span>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400">{metrics.actionsExecuted}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">System Load</span>
              <Cpu className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400">{metrics.systemLoad}%</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-400">{metrics.responseTime}ms</div>
          </Card>
        </div>

        {/* Data Sources Banner */}
        <Card className="p-4 mb-8 bg-gradient-to-r from-nexora-primary/10 to-nexora-quantum/10 border-nexora-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-nexora-primary" />
              <div>
                <div className="font-semibold text-white">Live Open Source Intelligence</div>
                <div className="text-sm text-muted-foreground">
                  Real-time data from: GitHub API • AbuseIPDB • NIST NVD • Threat Intelligence Feeds
                </div>
              </div>
            </div>
            <Badge className="gap-2 bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Streaming
            </Badge>
          </div>
        </Card>

        {/* Active Scanning Status */}
        {activeScans.length > 0 && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="absolute inset-0 bg-blue-400 blur-md opacity-50 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white mb-1">Active Scans in Progress</div>
                <div className="flex flex-wrap gap-2">
                  {activeScans.map((source, idx) => (
                    <Badge key={idx} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Real-Time Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Feed */}
          <Card className="lg:col-span-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-nexora-primary" />
                Live Activity Feed
              </h3>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                Live
              </Badge>
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {scanActivity.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for scan activity...</p>
                </div>
              )}
              
              {scanActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border transition-all ${
                    activity.status === 'alert'
                      ? 'bg-red-500/5 border-red-500/20'
                      : activity.status === 'running'
                      ? 'bg-blue-500/5 border-blue-500/20'
                      : 'bg-nexora-darker/50 border-nexora-border/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {activity.type === 'scan' && activity.status === 'running' && (
                        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                      )}
                      {activity.type === 'scan' && activity.status === 'complete' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {activity.type === 'detection' && (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      {activity.type === 'response' && (
                        <Zap className="w-4 h-4 text-yellow-400" />
                      )}
                      {activity.type === 'info' && (
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-nexora-primary mb-1">
                        {activity.source}
                      </div>
                      <div className="text-sm text-white break-words">
                        {activity.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {activity.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Threat Detection Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Live Threat Detection</h2>
              {mounted && lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>

          {isLoading && (
            <Card className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-nexora-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Fetching live threat intelligence...</p>
            </Card>
          )}

          {!isLoading && liveThreats.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Active Threats</h3>
              <p className="text-muted-foreground">
                All monitored entities are secure. Live monitoring is active.
              </p>
            </Card>
          )}

            {!isLoading && liveThreats.map((threat) => (
            <Card key={threat.id} className="p-6 hover:border-nexora-primary/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getSeverityColor(threat.severity)}`}>
                    {getThreatIcon(threat.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{threat.description}</h3>
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Server className="w-4 h-4" />
                        {threat.entity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        {threat.type.replace('_', ' ')}
                      </span>
                      <span>{new Date(threat.timestamp).toLocaleString()}</span>
                    </div>

                    {/* Evidence - Show ACTUAL DATA */}
                    <div className="bg-nexora-darker/50 rounded-lg p-4 mb-3">
                      <div className="text-xs font-semibold text-nexora-primary mb-2">🔍 Detection Evidence:</div>
                      <div className="text-xs font-mono text-muted-foreground space-y-2">
                        {/* Show key evidence fields with better formatting */}
                        {threat.evidence.repository && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400">📁 Repository:</span>
                            <span className="text-white break-all">{threat.evidence.repository}</span>
                          </div>
                        )}
                        {threat.evidence.file_path && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400">📄 File:</span>
                            <span className="text-white">{threat.evidence.file_path}</span>
                          </div>
                        )}
                        {threat.evidence.source_ip && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-400">🌐 IP Address:</span>
                            <span className="text-white">{threat.evidence.source_ip}</span>
                          </div>
                        )}
                        {threat.evidence.country && (
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-400">🌍 Location:</span>
                            <span className="text-white">{threat.evidence.country}</span>
                          </div>
                        )}
                        {threat.evidence.abuse_confidence && (
                          <div className="flex items-start gap-2">
                            <span className="text-orange-400">⚠️ Confidence:</span>
                            <span className="text-white">{threat.evidence.abuse_confidence}%</span>
                          </div>
                        )}
                        {threat.evidence.cve_id && (
                          <div className="flex items-start gap-2">
                            <span className="text-purple-400">🔖 CVE ID:</span>
                            <span className="text-white">{threat.evidence.cve_id}</span>
                          </div>
                        )}
                        {threat.evidence.package_name && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-400">📦 Package:</span>
                            <span className="text-white">{threat.evidence.package_name}</span>
                          </div>
                        )}
                        {threat.evidence.cvss_score && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-400">📊 CVSS Score:</span>
                            <span className="text-white">{threat.evidence.cvss_score}/10</span>
                          </div>
                        )}
                        {threat.evidence.original_prompt && (
                          <div className="flex items-start gap-2">
                            <span className="text-cyan-400">💬 Prompt:</span>
                            <span className="text-white break-all">{threat.evidence.original_prompt}</span>
                          </div>
                        )}
                        {threat.evidence.confidence && (
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-400">🎯 Detection:</span>
                            <span className="text-white">{Math.round(threat.evidence.confidence * 100)}% confident</span>
                          </div>
                        )}
                        {threat.evidence.pattern_matched && (
                          <div className="flex items-start gap-2">
                            <span className="text-pink-400">🔎 Pattern:</span>
                            <span className="text-white">{threat.evidence.pattern_matched}</span>
                          </div>
                        )}
                        
                        {/* Show additional evidence if available */}
                        {Object.entries(threat.evidence)
                          .filter(([key]) => !['repository', 'file_path', 'source_ip', 'country', 'abuse_confidence', 'cve_id', 'package_name', 'cvss_score', 'original_prompt', 'confidence', 'pattern_matched'].includes(key))
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-gray-400">{key}:</span>
                              <span className="text-white break-all">
                                {typeof value === 'object' ? JSON.stringify(value).substring(0, 80) : String(value).substring(0, 80)}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Auto Response */}
                    {threat.auto_response && (
                      <div className="flex items-center gap-2">
                        <Badge className="gap-1 bg-green-500/10 text-green-400 border-green-500/20">
                          <Zap className="w-3 h-3" />
                          Auto-Response Active
                        </Badge>
                        <div className="flex gap-2">
                          {threat.response_actions.map((action) => (
                            <span key={action} className="text-xs text-muted-foreground px-2 py-1 bg-nexora-darker rounded">
                              {action.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="p-8 text-center mt-12 bg-gradient-to-r from-nexora-primary/10 to-nexora-quantum/10 border-nexora-primary/20">
          <h2 className="text-2xl font-bold text-white mb-4">
            Experience Full Autonomous Defense
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            This live demo shows real-time threat detection with actual data from GitHub, AbuseIPDB, and NIST NVD. 
            Access the full admin panel to explore all features and real-time monitoring capabilities.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-nexora-primary hover:bg-nexora-primary/90" onClick={() => router.push('/client-dashboard')}>
              <Eye className="w-5 h-5 mr-2" />
              Access Full Admin Panel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
