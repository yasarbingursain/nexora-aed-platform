import React from 'react';
import { AdminNavigation } from '@/components/iam/AdminNavigation';

export default function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation type="customer" />
      <main>{children}</main>
    </div>
  );
}
