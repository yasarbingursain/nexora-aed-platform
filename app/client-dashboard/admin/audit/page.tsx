'use client';

import React, { useState, useEffect } from 'react';
import { Download, Filter, Calendar, User, Activity } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  before: any;
  after: any;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    fullName: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [filters, page]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        limit: '50',
        offset: (page * 50).toString(),
      });

      const response = await fetch(`/api/org/admin/audit/iam?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      const response = await fetch(`/api/org/admin/audit/export?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('SUSPEND')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('CREATE') || action.includes('INVITE')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IAM Audit Logs</h1>
            <p className="text-gray-600 mt-1">Track all identity and access management changes</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="USER_ROLE_CHANGED">Role Changed</option>
                <option value="USER_TEAM_CHANGED">Team Changed</option>
                <option value="ROLE_CREATED">Role Created</option>
                <option value="ROLE_UPDATED">Role Updated</option>
                <option value="API_KEY_CREATED">API Key Created</option>
                <option value="IMPERSONATION_STARTED">Impersonation Started</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
              <select
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="user">User</option>
                <option value="role">Role</option>
                <option value="team">Team</option>
                <option value="apiKey">API Key</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading audit logs...</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-200">
                {logs.map(log => (
                  <div key={log.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-gray-400" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-gray-600">
                          on <span className="font-medium">{log.targetType}</span>
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{log.actor.fullName}</span>
                      <span className="text-gray-500">({log.actor.email})</span>
                    </div>
                    {(log.before || log.after) && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        {log.before && (
                          <div className="bg-red-50 rounded p-3">
                            <div className="font-medium text-red-900 mb-1">Before</div>
                            <pre className="text-red-700 overflow-x-auto">
                              {JSON.stringify(log.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.after && (
                          <div className="bg-green-50 rounded p-3">
                            <div className="font-medium text-green-900 mb-1">After</div>
                            <pre className="text-green-700 overflow-x-auto">
                              {JSON.stringify(log.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {page * 50 + 1} - {Math.min((page + 1) * 50, total)} of {total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * 50 >= total}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
