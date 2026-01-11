"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Shield, 
  AlertTriangle, 
  BarChart3, 
  FileText, 
  Settings,
  Bell,
  User,
  LogOut,
  Link2,
  Flame,
  GitBranch,
  Activity,
  Brain,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';

const navigation = [
  { name: 'Dashboard', href: '/client-dashboard', icon: Home },
  { name: 'Entities', href: '/client-dashboard/entities', icon: Shield },
  { name: 'Threats', href: '/client-dashboard/threats', icon: AlertTriangle },
  { name: 'Analytics', href: '/client-dashboard/reports', icon: BarChart3 },
  { name: 'Compliance', href: '/client-dashboard/compliance', icon: FileText },
  { name: 'Integrations', href: '/client-dashboard/integrations', icon: Link2 },
  { name: 'Honey Tokens', href: '/client-dashboard/honey-tokens', icon: Flame },
  { name: 'Lineage', href: '/client-dashboard/lineage', icon: GitBranch },
  { name: 'Forensics', href: '/client-dashboard/forensics', icon: Activity },
  { name: 'ML Anomalies', href: '/client-dashboard/ml', icon: Brain },
];

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-6">
          <Link href="/" className="flex items-center mr-8">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg ml-2">Nexora</span>
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
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
                  <h3 className="font-semibold mb-2">Notifications</h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 hover:bg-muted rounded">
                      <p className="font-medium">New threat detected</p>
                      <p className="text-muted-foreground text-xs">2 minutes ago</p>
                    </div>
                    <div className="p-2 hover:bg-muted rounded">
                      <p className="font-medium">OSINT ingestion complete</p>
                      <p className="text-muted-foreground text-xs">5 minutes ago</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                  <Link 
                    href="/client-dashboard/settings" 
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted transition-colors w-full text-left text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
