'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Users, UserCog, Key, Activity, ArrowRight } from 'lucide-react';

const adminCards = [
  {
    title: 'User Management',
    description: 'Invite, manage, and control user access across your organization',
    icon: Users,
    href: '/customer-dashboard/admin/users',
    color: 'bg-blue-500',
  },
  {
    title: 'Roles & Permissions',
    description: 'Create custom roles and assign granular permissions',
    icon: Shield,
    href: '/customer-dashboard/admin/roles',
    color: 'bg-purple-500',
  },
  {
    title: 'Teams',
    description: 'Organize users into teams with shared permissions',
    icon: UserCog,
    href: '/customer-dashboard/admin/teams',
    color: 'bg-green-500',
  },
  {
    title: 'API Keys',
    description: 'Generate and manage API keys with scoped permissions',
    icon: Key,
    href: '/customer-dashboard/admin/api-keys',
    color: 'bg-orange-500',
  },
  {
    title: 'Audit Logs',
    description: 'Track all IAM changes and security events',
    icon: Activity,
    href: '/customer-dashboard/admin/audit',
    color: 'bg-red-500',
  },
];

export default function CustomerAdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Administration</h1>
          <p className="text-gray-600 mt-2">
            Manage users, roles, teams, and access control for your organization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Enterprise IAM System</h3>
          <p className="text-sm text-blue-800">
            Your organization is using an enterprise-grade Identity and Access Management system with:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              Role-based access control (RBAC) with custom roles
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              Team-based permissions for cross-functional collaboration
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              API key scoping with granular permission control
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              Complete audit trail for compliance and security
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
