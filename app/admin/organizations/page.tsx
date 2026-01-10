'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Users, Shield, AlertTriangle, Search } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  domain: string;
  status: string;
  subscriptionTier: string;
  createdAt: string;
  _count: {
    users: number;
    identities: number;
    threats: number;
  };
}

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchOrganizations();
  }, [searchQuery, statusFilter]);

  const fetchOrganizations = async () => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        status: statusFilter,
        limit: '50',
      });

      const response = await fetch(`/api/platform/admin/organizations?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setOrganizations(data.organizations);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendOrg = async (orgId: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      await fetch(`/api/platform/admin/organizations/${orgId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason }),
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to suspend organization:', error);
    }
  };

  const handleReactivateOrg = async (orgId: string) => {
    try {
      await fetch(`/api/platform/admin/organizations/${orgId}/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to reactivate organization:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Platform Organizations</h1>
          <p className="text-gray-600 mt-1">Manage all organizations across the platform</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TRIAL">Trial</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading organizations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => (
              <div
                key={org.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-500">{org.domain}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        org.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : org.status === 'SUSPENDED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {org.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Subscription</span>
                    <span className="text-sm font-medium text-gray-900">
                      {org.subscriptionTier}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{org._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span>{org._count.identities} identities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{org._count.threats} threats</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    {org.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleSuspendOrg(org.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Suspend Organization
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivateOrg(org.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Reactivate Organization
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
