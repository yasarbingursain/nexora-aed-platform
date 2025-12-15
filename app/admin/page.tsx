"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/ui/DataTable';
import { NHITIFeed } from '@/components/admin/NHITIFeed';
import { BillingDashboard } from '@/components/admin/BillingDashboard';
import { OrganizationDetail } from '@/components/admin/OrganizationDetail';
import { SystemHealth } from '@/components/admin/SystemHealth';
import Link from 'next/link';
import { 
  Shield, 
  Users, 
  Building, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  Server,
  BarChart3,
  UserPlus,
  CreditCard,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Bell,
  Home,
  Cpu,
  HardDrive,
  Network,
  Monitor
} from 'lucide-react';
import { fetchOrganizations } from '@/lib/api/organizations';
import type { Organization } from '@/lib/api/organizations';

type ViewMode = 'dashboard' | 'nhiti' | 'billing' | 'organization';
export default function CompanyAdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOrganizations(page, 25);
      setOrganizations(data.organizations);
      setTotalOrgs(data.total);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'trial': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'suspended': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-green-400';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-2xl font-bold text-foreground">Nexora Admin</span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/admin" className="flex items-center gap-2 text-foreground font-medium">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link href="/admin/customers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Building className="h-4 w-4" />
                  Customers
                </Link>
                <Link href="/admin/users" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link href="/admin/system" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Server className="h-4 w-4" />
                  System
                </Link>
                <Link href="/admin/billing" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
                <Link href="/admin/analytics" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {currentTime.toLocaleString()}
              </div>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SA</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* View Selector */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant={viewMode === 'dashboard' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('dashboard')}
          >
            Dashboard
          </Button>
          <Button 
            variant={viewMode === 'nhiti' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('nhiti')}
          >
            NHITI Feed
          </Button>
          <Button 
            variant={viewMode === 'billing' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('billing')}
          >
            Billing
          </Button>
        </div>

        {viewMode === 'organization' && selectedOrgId ? (
          <OrganizationDetail 
            organizationId={selectedOrgId} 
            onBack={() => {
              setViewMode('dashboard');
              setSelectedOrgId(null);
            }}
          />
        ) : viewMode === 'nhiti' ? (
          <NHITIFeed />
        ) : viewMode === 'billing' ? (
          <BillingDashboard />
        ) : (
          <>
            {/* Top Controls */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">Company Dashboard</h1>
                  <LiveIndicator active label="Live" />
                </div>
                <p className="text-muted-foreground">Monitor platform performance and customer metrics</p>
              </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadOrganizations()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert('Export functionality coming soon')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Organizations"
                value={totalOrgs}
                change={23.5}
                trend="up"
                icon={<Building className="h-6 w-6" />}
                live
              />
              <MetricCard
                title="Monthly Revenue"
                value="$2.8M"
                change={15.2}
                trend="up"
                icon={<DollarSign className="h-6 w-6" />}
                live
              />
              <MetricCard
                title="Active Users"
                value="12.8K"
                change={8.7}
                trend="up"
                icon={<Users className="h-6 w-6" />}
                live
              />
              <MetricCard
                title="Threats Blocked"
                value="284K"
                subtitle="99.99% uptime"
                icon={<Shield className="h-6 w-6" />}
                live
              />
            </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Customer Overview */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Organizations</h2>
              <DataTable
                data={organizations}
                columns={[
                  {
                    key: 'name',
                    label: 'Organization',
                    sortable: true,
                    render: (value, row) => (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{value}</span>
                        <StatusBadge status={row.status === 'active' ? 'active' : row.status === 'trial' ? 'pending' : 'inactive'} />
                      </div>
                    )
                  },
                  {
                    key: 'plan',
                    label: 'Plan',
                    render: (value) => <Badge variant="outline">{value}</Badge>
                  },
                  {
                    key: 'users',
                    label: 'Users',
                    sortable: true,
                    render: (value) => value.toLocaleString()
                  },
                  {
                    key: 'entities',
                    label: 'Entities',
                    sortable: true,
                    render: (value) => value.toLocaleString()
                  },
                  {
                    key: 'revenue',
                    label: 'Revenue',
                    sortable: true,
                    render: (value) => <span className="text-nexora-ai">${value.toLocaleString()}/mo</span>
                  },
                  {
                    key: 'riskScore',
                    label: 'Risk',
                    sortable: true,
                    render: (value) => (
                      <Badge className={
                        value >= 80 ? 'bg-nexora-threat/10 text-nexora-threat' :
                        value >= 60 ? 'bg-nexora-warning/10 text-nexora-warning' :
                        'bg-nexora-ai/10 text-nexora-ai'
                      }>
                        {value}
                      </Badge>
                    )
                  }
                ]}
                loading={loading}
                pagination={{
                  page,
                  pageSize: 25,
                  total: totalOrgs,
                  onPageChange: setPage,
                  onPageSizeChange: () => {}
                }}
                sorting={{
                  column: sortColumn,
                  direction: sortDirection,
                  onSort: (col) => {
                    if (sortColumn === col) {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn(col);
                      setSortDirection('asc');
                    }
                  }
                }}
                selection={{
                  selectedRows: selectedRows,
                  onSelectRow: (id) => {
                    const newSet = new Set(selectedRows);
                    if (newSet.has(id)) newSet.delete(id);
                    else newSet.add(id);
                    setSelectedRows(newSet);
                  },
                  onSelectAll: () => {
                    if (selectedRows.size === organizations.length) {
                      setSelectedRows(new Set());
                    } else {
                      setSelectedRows(new Set(organizations.map(o => o.id)));
                    }
                  },
                  getRowId: (row) => row.id
                }}
                onRowClick={(row) => {
                  setSelectedOrgId(row.id);
                  setViewMode('organization');
                }}
                actions={
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                }
              />
            </Card>
          </div>

          {/* System Health */}
          <div className="lg:col-span-1">
            <SystemHealth />
          </div>
        </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => alert('Add Customer functionality coming soon')}>
                  <UserPlus className="h-6 w-6" />
                  <span className="text-sm">Add Customer</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setViewMode('nhiti')}>
                  <Shield className="h-6 w-6" />
                  <span className="text-sm">NHITI Feed</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = '/admin/analytics'}>
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Analytics</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setViewMode('billing')}>
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm">Billing</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = '/admin/settings'}>
                  <Settings className="h-6 w-6" />
                  <span className="text-sm">Settings</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => alert('Export Data functionality coming soon')}>
                  <Download className="h-6 w-6" />
                  <span className="text-sm">Export Data</span>
                </Button>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
