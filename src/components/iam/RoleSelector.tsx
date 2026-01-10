import React, { useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description?: string;
  scope: 'PLATFORM' | 'ORG';
  isSystem: boolean;
}

interface RoleSelectorProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  organizationId?: string;
  multiple?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRoleIds,
  onChange,
  organizationId,
  multiple = true,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, [organizationId]);

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

  const toggleRole = (roleId: string) => {
    if (multiple) {
      if (selectedRoleIds.includes(roleId)) {
        onChange(selectedRoleIds.filter(id => id !== roleId));
      } else {
        onChange([...selectedRoleIds, roleId]);
      }
    } else {
      onChange([roleId]);
      setIsOpen(false);
    }
  };

  const selectedRoles = roles.filter(r => selectedRoleIds.includes(r.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-sm text-gray-700">
          {selectedRoles.length === 0
            ? 'Select roles...'
            : selectedRoles.map(r => r.name).join(', ')}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No roles available</div>
          ) : (
            roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center ${
                    selectedRoleIds.includes(role.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedRoleIds.includes(role.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                    {role.isSystem && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
