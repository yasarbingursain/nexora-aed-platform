'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users as UsersIcon } from 'lucide-react';
import { PermissionPicker } from '@/components/iam/PermissionPicker';
import { PermissionBadge } from '@/components/iam/PermissionBadge';

interface Team {
  id: string;
  name: string;
  description?: string;
  members: Array<{
    user: {
      id: string;
      email: string;
      fullName: string;
    };
  }>;
  permissions: Array<{
    permission: {
      id: string;
      key: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }>;
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
    permissionIds: [] as string[],
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/org/admin/teams', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setTeams(data.teams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/org/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', memberIds: [], permissionIds: [] });
        fetchTeams();
      }
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await fetch(`/api/org/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Organize users into teams with shared permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading teams...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <div
                key={team.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UsersIcon className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-600">{team.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-600 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-1 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UsersIcon className="w-4 h-4" />
                    <span>{team.members.length} member(s)</span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2">Members</div>
                    <div className="space-y-1">
                      {team.members.slice(0, 3).map(member => (
                        <div key={member.user.id} className="text-xs text-gray-600">
                          {member.user.fullName}
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{team.members.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Permissions ({team.permissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {team.permissions.slice(0, 4).map(tp => (
                        <PermissionBadge
                          key={tp.permission.id}
                          permission={tp.permission.key}
                          riskLevel={tp.permission.riskLevel}
                          size="sm"
                        />
                      ))}
                      {team.permissions.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{team.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Team</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., SOC Team"
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
                    placeholder="Describe the team's purpose"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Permissions
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
                      setFormData({ name: '', description: '', memberIds: [], permissionIds: [] });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTeam}
                    disabled={!formData.name}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Team
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
