import React, { useState, useEffect } from 'react';
import { Search, Shield, AlertTriangle } from 'lucide-react';
import { PermissionBadge } from './PermissionBadge';

interface Permission {
  id: string;
  key: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PermissionPickerProps {
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
}

export const PermissionPicker: React.FC<PermissionPickerProps> = ({
  selectedPermissionIds,
  onChange,
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/org/admin/permissions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (selectedPermissionIds.includes(permissionId)) {
      onChange(selectedPermissionIds.filter(id => id !== permissionId));
    } else {
      onChange([...selectedPermissionIds, permissionId]);
    }
  };

  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || p.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const category = perm.key.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
        </select>
      </div>

      <div className="text-sm text-gray-600">
        {selectedPermissionIds.length} permission(s) selected
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading permissions...</div>
      ) : (
        <div className="space-y-6 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 capitalize">
                {category} Permissions
              </h3>
              <div className="space-y-2">
                {perms.map(permission => (
                  <label
                    key={permission.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissionIds.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {permission.key}
                        </span>
                        {permission.riskLevel === 'HIGH' && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            High Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
