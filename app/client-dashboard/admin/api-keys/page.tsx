'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Key, Copy, RotateCw, XCircle, Eye, EyeOff } from 'lucide-react';
import { PermissionPicker } from '@/components/iam/PermissionPicker';
import { PermissionBadge } from '@/components/iam/PermissionBadge';

interface ApiKey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  scopes: Array<{
    permission: {
      id: string;
      key: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }>;
}

export default function ApiKeysManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permissionIds: [] as string[],
    expiresAt: '',
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/org/admin/api-keys', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const response = await fetch('/api/org/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setNewKey(data.apiKey.key);
        setFormData({ name: '', permissionIds: [], expiresAt: '' });
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will stop working immediately.')) return;

    try {
      const response = await fetch(`/api/org/admin/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNewKey(data.key);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await fetch(`/api/org/admin/api-keys/${keyId}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Key Management</h1>
            <p className="text-gray-600 mt-1">Create and manage API keys with scoped permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading API keys...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map(apiKey => (
              <div
                key={apiKey.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{apiKey.name}</h3>
                      {!apiKey.isActive && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                      {apiKey.lastUsedAt && (
                        <span>Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      {apiKey.expiresAt && (
                        <span>Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {apiKey.isActive && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRotateKey(apiKey.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Rotate key"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRevokeKey(apiKey.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Revoke key"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Scoped Permissions ({apiKey.scopes.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {apiKey.scopes.map(scope => (
                      <PermissionBadge
                        key={scope.permission.id}
                        permission={scope.permission.key}
                        riskLevel={scope.permission.riskLevel}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create API Key</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Production API Key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scoped Permissions
                  </label>
                  <PermissionPicker
                    selectedPermissionIds={formData.permissionIds}
                    onChange={(ids) => setFormData({ ...formData, permissionIds: ids })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', permissionIds: [], expiresAt: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateApiKey}
                    disabled={!formData.name || formData.permissionIds.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create API Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {newKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">API Key Created</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Save this key now - you won&apos;t be able to see it again!
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-gray-900 text-green-400 rounded font-mono text-sm break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewKey(null);
                  setShowCreateModal(false);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                I&apos;ve Saved the Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
