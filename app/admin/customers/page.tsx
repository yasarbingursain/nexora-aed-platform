"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Users, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  MoreVertical,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield
} from 'lucide-react';

const customers = [
  {
    id: '1',
    name: 'TechCorp Industries',
    plan: 'Enterprise',
    users: 1247,
    entities: 15420,
    threats: 23,
    revenue: 25000,
    status: 'active',
    riskScore: 73,
    joinedDate: '2024-01-15'
  },
  {
    id: '2',
    name: 'SecureBank Ltd',
    plan: 'Premium',
    users: 856,
    entities: 8934,
    threats: 12,
    revenue: 15000,
    status: 'active',
    riskScore: 45,
    joinedDate: '2024-02-20'
  },
  {
    id: '3',
    name: 'CloudStart Inc',
    plan: 'Professional',
    users: 234,
    entities: 2847,
    threats: 5,
    revenue: 5000,
    status: 'trial',
    riskScore: 28,
    joinedDate: '2024-10-01'
  },
  {
    id: '4',
    name: 'DataFlow Systems',
    plan: 'Enterprise',
    users: 1892,
    entities: 23847,
    threats: 45,
    revenue: 35000,
    status: 'active',
    riskScore: 89,
    joinedDate: '2024-03-10'
  },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trial':
        return <Badge variant="medium">Trial</Badge>;
      case 'suspended':
        return <Badge variant="critical">Suspended</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all platform customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Users className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-2xl font-bold">150</span>
          </div>
          <p className="text-sm text-muted-foreground">Total Customers</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-bold">$2.8M</span>
          </div>
          <p className="text-sm text-muted-foreground">Monthly Revenue</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span className="text-2xl font-bold">12</span>
          </div>
          <p className="text-sm text-muted-foreground">High Risk</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-2xl font-bold">138</span>
          </div>
          <p className="text-sm text-muted-foreground">Active</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Users</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entities</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Threats</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Revenue</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(customer.joinedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="neutral">{customer.plan}</Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{customer.users.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{customer.entities.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {customer.threats > 20 && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      <span className="text-sm">{customer.threats}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium">{customer.revenue.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${getRiskColor(customer.riskScore)}`}>
                      {customer.riskScore}
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(customer.status)}
                  </td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
