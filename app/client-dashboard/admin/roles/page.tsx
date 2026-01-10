'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';
import { PermissionPicker } from '@/components/iam/PermissionPicker';
import { PermissionBadge } from '@/components/iam/PermissionBadge';

interface Role {
  id: string;
  name: string;
  description?: string;
  scope: 'PLATFORM' | 'ORG';
  isSystem: boolean;
  rolePermissions: Array<{
    permission: {
      id: string;
      key: string;
      description: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }>;
  _count: {
    userRoles: number;
  };
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/org/admin/roles', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/org/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', permissionIds: [] });
        fetchRoles();
      }
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const response = await fetch(`/api/org/admin/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingRole(null);
        setFormData({ name: '', description: '', permissionIds: [] });
        fetchRoles();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      await fetch(`/api/org/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.rolePermissions.map(rp => rp.permission.id),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600 mt-1">Create and manage custom roles with specific permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading roles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map(role => (
              <div
                key={role.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600">{role.description}</p>
                    )}
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(role)}
                        className="p-1 text-gray-600 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{role._count.userRoles} user(s) assigned</span>
                  </div>

                  {role.isSystem && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      System Role
                    </span>
                  )}

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Permissions ({role.rolePermissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {role.rolePermissions.slice(0, 5).map(rp => (
                        <PermissionBadge
                          key={rp.permission.id}
                          permission={rp.permission.key}
                          riskLevel={rp.permission.riskLevel}
                          size="sm"
                        />
                      ))}
                      {role.rolePermissions.length > 5 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{role.rolePermissions.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showCreateModal || editingRole) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Security Analyst"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role's purpose and responsibilities"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
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
                      setEditingRole(null);
                      setFormData({ name: '', description: '', permissionIds: [] });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingRole ? handleUpdateRole : handleCreateRole}
                    disabled={!formData.name || formData.permissionIds.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
