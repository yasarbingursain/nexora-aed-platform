import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

interface PermissionBadgeProps {
  permission: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  size?: 'sm' | 'md';
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  riskLevel = 'LOW',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  const riskColors = {
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${riskColors[riskLevel]}`}
    >
      {riskLevel === 'HIGH' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Shield className="w-3 h-3" />
      )}
      {permission}
    </span>
  );
};
