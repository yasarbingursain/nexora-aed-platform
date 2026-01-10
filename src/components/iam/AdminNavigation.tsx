"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, UserCog, Key, Activity, Building2, UserCheck } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const customerAdminNav: NavItem[] = [
  {
    name: 'Users',
    href: '/customer-dashboard/admin/users',
    icon: Users,
    description: 'Manage organization users',
  },
  {
    name: 'Roles',
    href: '/customer-dashboard/admin/roles',
    icon: Shield,
    description: 'Configure roles and permissions',
  },
  {
    name: 'Teams',
    href: '/customer-dashboard/admin/teams',
    icon: UserCog,
    description: 'Organize users into teams',
  },
  {
    name: 'API Keys',
    href: '/customer-dashboard/admin/api-keys',
    icon: Key,
    description: 'Manage API access',
  },
  {
    name: 'Audit Logs',
    href: '/customer-dashboard/admin/audit',
    icon: Activity,
    description: 'View IAM activity',
  },
];

const platformAdminNav: NavItem[] = [
  {
    name: 'Organizations',
    href: '/admin/organizations',
    icon: Building2,
    description: 'Manage all organizations',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Platform-wide user management',
  },
  {
    name: 'Impersonation',
    href: '/admin/impersonation',
    icon: UserCheck,
    description: 'Support impersonation sessions',
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: Activity,
    description: 'Platform audit trail',
  },
];

interface AdminNavigationProps {
  type: 'customer' | 'platform';
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({ type }) => {
  const pathname = usePathname();
  const navItems = type === 'customer' ? customerAdminNav : platformAdminNav;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export const AdminSidebar: React.FC<AdminNavigationProps> = ({ type }) => {
  const pathname = usePathname();
  const navItems = type === 'customer' ? customerAdminNav : platformAdminNav;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {type === 'customer' ? 'Organization Admin' : 'Platform Admin'}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {type === 'customer' ? 'Manage your organization' : 'System administration'}
        </p>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
