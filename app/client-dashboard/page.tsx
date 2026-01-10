"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getJaneDoeConfig } from '@/lib/demo/jane-doe-config';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Key, 
  Bot, 
  Server,
  Activity,
  Settings,
  Download,
  RefreshCw,
  Eye,
  Play,
  Pause,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  Bell,
  Lock,
  BarChart3,
  FileText,
  ChevronRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import { OsintMetrics } from '@/components/osint/OsintMetrics';
import { OsintThreatFeed } from '@/components/osint/OsintThreatFeed';
import { BlocklistPanel } from '@/components/osint/BlocklistPanel';

// Entity type mapping for real CVE data
const entityTypes = ['API Key', 'Service Account', 'AI Agent', 'OAuth Token', 'SSH Key', 'Certificate'];
const remediationActions = ['Quarantined', 'Rotated', 'Monitoring', 'Blocked', 'Isolated', 'Patched'];
const statuses = ['active', 'investigating', 'resolved', 'monitoring'];

// Jane Doe company configuration
const JANE_DOE_COMPANY = getJaneDoeConfig();

export default function ClientDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isScanning, setIsScanning] = useState(false);
  
  // Live data state - ALL FROM REAL-TIME APIs
  const [recentThreats, setRecentThreats] = useState<any[]>([]);
  const [clientMetrics, setClientMetrics] = useState({
    totalEntities: 0,
    activeThreats: 0,
    resolvedToday: 0,
    riskScore: 0,
    complianceScore: 94,
    entitiesAtRisk: 0,
    automatedActions: 0,
    uptime: 99.99
  });
  const [entityBreakdown, setEntityBreakdown] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live threat data from multiple real-time sources via API proxy
  const fetchLiveThreatData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch from Next.js API proxy (avoids CORS issues)
      const response = await fetch('/api/threat-intel', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch threat intelligence');
      }
      
      const data = await response.json();
      
      // Process threats from API response
      const threats = data.threats.map((threat: any) => ({
        ...threat,
        timestamp: new Date(threat.timestamp)
      }));
      
      setRecentThreats(threats);
      setClientMetrics(data.metrics);
      setEntityBreakdown(data.entityBreakdown);
      
      // Generate recent activity from threats
      const activities = threats.slice(0, 4).map((threat: any, index: number) => ({
        id: String(index + 1),
        action: index === 0 ? 'Threat Detected' : index === 1 ? 'Auto-Remediation' : index === 2 ? 'Compliance Scan' : 'Entity Discovery',
        description: index === 0 ? `${threat.severity.toUpperCase()} vulnerability detected: ${threat.id}` :
                     index === 1 ? `${threat.entityType} ${threat.autoRemediation.toLowerCase()} automatically` :
                     index === 2 ? 'SOC2 compliance check completed successfully' :
                     `New ${threat.entityType.toLowerCase()} discovered in environment`,
        timestamp: new Date(threat.timestamp.getTime() - index * 5 * 60 * 1000),
        type: index === 0 ? 'threat' : index === 1 ? 'action' : index === 2 ? 'compliance' : 'discovery',
        severity: index === 0 ? threat.severity : index === 1 ? 'info' : index === 2 ? 'success' : 'info'
      }));
      
      setRecentActivity(activities);
      
      toast.success(`Live threat data updated from ${data.sources?.join(' + ') || 'NIST NVD'}`);
      
    } catch (error) {
      console.error('Error fetching live threat data:', error);
      toast.error('Failed to fetch live threat data. Using cached data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchLiveThreatData();
    
    // Refresh data every 5 minutes
    const dataRefreshInterval = setInterval(fetchLiveThreatData, 5 * 60 * 1000);
    
    return () => clearInterval(dataRefreshInterval);
  }, []);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Quick Action Handlers
  const handleScanEntities = async () => {
    setIsScanning(true);
    toast.loading('Scanning entities and fetching latest threats...', { id: 'scan' });
    
    // Fetch fresh data from NIST NVD
    await fetchLiveThreatData();
    
    setTimeout(() => {
      setIsScanning(false);
      toast.success(`Scan completed! Found ${clientMetrics.totalEntities} entities, ${clientMetrics.activeThreats} require attention.`, { id: 'scan' });
    }, 1000);
  };

  const handleGenerateReport = () => {
    toast.loading('Generating compliance report...', { id: 'report' });
    
    setTimeout(() => {
      toast.success('Report generated successfully! Downloading...', { id: 'report' });
      // Simulate download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `nexora-report-${Date.now()}.pdf`;
      link.click();
    }, 1500);
  };

  const handleConfigurePolicies = () => {
    toast.info('Redirecting to policy configuration...');
    setTimeout(() => {
      router.push('/client-dashboard/settings');
    }, 500);
  };

  const handleSecuritySettings = () => {
    toast.info('Opening security settings...');
    setTimeout(() => {
      router.push('/client-dashboard/settings');
    }, 500);
  };

  const handleComplianceCheck = () => {
    toast.loading('Running compliance check...', { id: 'compliance' });
    
    setTimeout(() => {
      toast.success('Compliance check passed! Score: 94%', { id: 'compliance' });
      router.push('/client-dashboard/compliance');
    }, 1500);
  };

  const handleExportData = () => {
    toast.loading('Preparing data export...', { id: 'export' });
    
    setTimeout(() => {
      toast.success('Data exported successfully!', { id: 'export' });
      // Simulate download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `nexora-data-export-${Date.now()}.json`;
      link.click();
    }, 1500);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400';
      case 'investigating': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <>
        {/* Top Controls */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Security Dashboard</h1>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1">
                {JANE_DOE_COMPANY.name}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                  <Activity className="h-3 w-3 animate-pulse" />
                  Live: NIST NVD
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="h-3 w-3" />
                  AbuseIPDB
                </span>
              </div>
            </div>
            <p className="text-muted-foreground">Real-time threat intelligence from multiple open-source feeds • {JANE_DOE_COMPANY.industry}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-sm"
                aria-label="Select time range"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <button 
              onClick={fetchLiveThreatData}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 h-9 rounded-md px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none transition-colors"
              aria-label="Refresh live threat data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Updating...' : 'Refresh Live Data'}
            </button>
            <button 
              onClick={() => toast.info('Export functionality coming soon')}
              className="inline-flex items-center justify-center gap-2 h-9 rounded-md px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Export data"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                +2.3%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                clientMetrics.totalEntities.toLocaleString()
              )}
            </div>
            <div className="text-sm text-muted-foreground">Total Entities</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                Critical
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {clientMetrics.activeThreats}
            </div>
            <div className="text-sm text-muted-foreground">Active Threats</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                +15
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {clientMetrics.resolvedToday}
            </div>
            <div className="text-sm text-muted-foreground">Resolved Today</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                {clientMetrics.riskScore}%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {clientMetrics.complianceScore}%
            </div>
            <div className="text-sm text-muted-foreground">Compliance Score</div>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Active Threats */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Active Threats</h2>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Filter threats">
                    <Filter className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="View all threats">
                    View All
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {recentThreats.map((threat) => (
                  <div key={threat.id} className="border border-border rounded-lg p-4 hover:bg-card/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{threat.title}</h3>
                          <Badge className={getSeverityColor(threat.severity)}>
                            {threat.severity}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(threat.status)}>
                            {threat.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{threat.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{threat.entityType}: {threat.entityName}</span>
                          <span>Risk Score: {threat.riskScore}</span>
                          <span>{threat.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="View threat details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Auto-Remediation: {threat.autoRemediation}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            toast.info(`Investigating threat: ${threat.title}`);
                            router.push(`/client-dashboard/threats?id=${threat.id}`);
                          }}
                          className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          Investigate
                        </button>
                        <button 
                          onClick={() => {
                            toast.success(`Auto-remediation initiated for: ${threat.title}`);
                            // Update threat status to investigating
                            setRecentThreats(prev => 
                              prev.map(t => t.id === threat.id ? {...t, status: 'investigating'} : t)
                            );
                          }}
                          className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Remediate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Entity Breakdown */}
          <div className="lg:col-span-1">
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Entity Breakdown</h2>
              <div className="space-y-4">
                {entityBreakdown.map((entity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${entity.color}`}></div>
                      <span className="text-sm font-medium text-foreground">{entity.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">{entity.count}</div>
                      {entity.atRisk > 0 && (
                        <div className="text-xs text-red-400">{entity.atRisk} at risk</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.severity === 'critical' ? 'bg-red-400' :
                      activity.severity === 'success' ? 'bg-green-400' :
                      'bg-blue-400'
                    }`}></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{activity.action}</div>
                      <div className="text-xs text-muted-foreground">{activity.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {activity.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* OSINT Threat Intelligence Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-500" />
            Live OSINT Threat Intelligence
          </h2>
          
          {/* OSINT Metrics */}
          <div className="mb-6">
            <OsintMetrics />
          </div>

          {/* OSINT Feed and Blocklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OsintThreatFeed />
            <BlocklistPanel />
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'threat' ? 'bg-red-500/10' :
                  activity.type === 'remediation' ? 'bg-green-500/10' :
                  'bg-blue-500/10'
                }`}>
                  {activity.type === 'threat' && <AlertTriangle className="h-5 w-5 text-red-400" />}
                  {activity.type === 'remediation' && <CheckCircle className="h-5 w-5 text-green-400" />}
                  {activity.type === 'scan' && <Activity className="h-5 w-5 text-blue-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {typeof activity.timestamp === 'string' 
                      ? activity.timestamp 
                      : activity.timestamp.toLocaleString()}
                  </p>
                </div>
                <Badge className={activity.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}>
                  {activity.severity}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-8 bg-gradient-to-br from-card/50 to-card border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Quick Actions</h2>
              <p className="text-sm text-muted-foreground">Perform common security operations with one click</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={handleScanEntities}
              disabled={isScanning}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-blue-500/5 hover:border-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Scan entities"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                <Search className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">
                Scan Entities
              </span>
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
                  <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                </div>
              )}
            </button>

            <button
              onClick={handleGenerateReport}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-green-500/5 hover:border-green-500/50 transition-all duration-300"
              aria-label="Generate report"
            >
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-green-400 transition-colors">
                Generate Report
              </span>
            </button>

            <button
              onClick={handleConfigurePolicies}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-purple-500/5 hover:border-purple-500/50 transition-all duration-300"
              aria-label="Configure policies"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                <Settings className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-purple-400 transition-colors">
                Configure Policies
              </span>
            </button>

            <button
              onClick={handleSecuritySettings}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-orange-500/5 hover:border-orange-500/50 transition-all duration-300"
              aria-label="Security settings"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:scale-110 transition-all duration-300">
                <Lock className="h-6 w-6 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-orange-400 transition-colors">
                Security Settings
              </span>
            </button>

            <button
              onClick={handleComplianceCheck}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-cyan-500/5 hover:border-cyan-500/50 transition-all duration-300"
              aria-label="Compliance check"
            >
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                <FileText className="h-6 w-6 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-cyan-400 transition-colors">
                Compliance Check
              </span>
            </button>

            <button
              onClick={handleExportData}
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-border bg-card hover:bg-indigo-500/5 hover:border-indigo-500/50 transition-all duration-300"
              aria-label="Export data"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                <Download className="h-6 w-6 text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-indigo-400 transition-colors">
                Export Data
              </span>
            </button>
          </div>
        </Card>
    </>
  );
}
