"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  Server, 
  CreditCard, 
  Settings,
  Bell,
  User,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'System Health', href: '/admin/system', icon: Server },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-6">
          <Link href="/" className="flex items-center gap-2 mr-8">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg">Nexora Admin</span>
          </Link>

          <nav className="flex items-center gap-6 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="text-xs font-medium text-purple-400">Super Admin</span>
            </div>
            <button className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-6 py-8">
        {children}
      </main>
    </div>
  );
}
