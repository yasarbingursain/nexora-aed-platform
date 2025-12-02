"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { ThreatCard } from '@/components/customer/ThreatCard';
import { ThreatsView } from '@/components/customer/ThreatsView';
import { IdentitiesView } from '@/components/customer/IdentitiesView';
import { AnalyticsView } from '@/components/customer/AnalyticsView';
import { SettingsView } from '@/components/customer/SettingsView';
import Link from 'next/link';
import {
  Home,
  Shield,
  Search as SearchIcon,
  BarChart3,
  Settings,
  Bell,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { fetchThreats, quarantineThreat, rotateCredentials, dismissThreat } from '@/lib/api/threats';
import type { Threat, ThreatsResponse } from '@/lib/api/threats';

export default function CustomerDashboard() {
  const [navExpanded, setNavExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'threats' | 'identities' | 'analytics' | 'settings'>('home');
  const [threatsData, setThreatsData] = useState<ThreatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadThreats();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadThreats = async () => {
    try {
      setLoading(true);
      const data = await fetchThreats(1, 10);
      setThreatsData(data);
    } catch (error) {
      console.error('Failed to load threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuarantine = async (threatId: string) => {
    try {
      await quarantineThreat(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to quarantine:', error);
    }
  };

  const handleRotate = async (threatId: string) => {
    try {
      await rotateCredentials(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to rotate:', error);
    }
  };

  const handleDismiss = async (threatId: string) => {
    try {
      await dismissThreat(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-nexora-primary to-nexora-ai rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-2xl font-bold text-foreground">Nexora</span>
              </Link>
              
              <div className="relative hidden md:block">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search entities, threats..."
                  className="pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-nexora-primary"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                {currentTime.toLocaleString()}
              </div>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {threatsData && threatsData.stats.critical > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-nexora-threat rounded-full animate-pulse" />
                )}
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-nexora-primary to-nexora-ai rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav
          className={`
            fixed left-0 top-[73px] h-[calc(100vh-73px)]
            bg-bg-deepest/95 border-r border-border
            transition-all duration-200 ease-out z-40
            ${navExpanded ? 'w-60' : 'w-[72px]'}
          `}
          onMouseEnter={() => setNavExpanded(true)}
          onMouseLeave={() => setNavExpanded(false)}
        >
          <div className="p-2">
            <NavItem
              icon={<Home className="h-6 w-6" />}
              label="Home"
              active={activeView === 'home'}
              expanded={navExpanded}
              onClick={() => setActiveView('home')}
            />
            <NavItem
              icon={<Shield className="h-6 w-6" />}
              label="Threats"
              badge={threatsData?.stats.critical || 0}
              active={activeView === 'threats'}
              expanded={navExpanded}
              onClick={() => setActiveView('threats')}
            />
            <NavItem
              icon={<SearchIcon className="h-6 w-6" />}
              label="Identities"
              active={activeView === 'identities'}
              expanded={navExpanded}
              onClick={() => setActiveView('identities')}
            />
            <NavItem
              icon={<BarChart3 className="h-6 w-6" />}
              label="Analytics"
              active={activeView === 'analytics'}
              expanded={navExpanded}
              onClick={() => setActiveView('analytics')}
            />
            <NavItem
              icon={<Settings className="h-6 w-6" />}
              label="Settings"
              active={activeView === 'settings'}
              expanded={navExpanded}
              onClick={() => setActiveView('settings')}
            />
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 ml-[72px] p-8">
          {activeView === 'home' && (
            <>
              {/* Welcome */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Sarah Chen</h1>
                <p className="text-muted-foreground">Last login: 2 hours ago from 10.0.1.45</p>
              </div>

              {/* Risk Overview */}
              <Card className="p-6 mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-6">Risk Overview (Last 24 Hours)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Critical Threats"
                    value={threatsData?.stats.critical || 0}
                    change={2}
                    trend="up"
                    icon={<Shield className="h-6 w-6" />}
                    live
                  />
                  <MetricCard
                    title="Events Analyzed"
                    value="847"
                    change={3}
                    trend="up"
                    icon={<Activity className="h-6 w-6" />}
                    live
                  />
                  <MetricCard
                    title="Auto-Resolved"
                    value="99.2%"
                    icon={<TrendingUp className="h-6 w-6" />}
                    live
                  />
                  <MetricCard
                    title="Protected Entities"
                    value="12.3K"
                    change={127}
                    trend="up"
                    icon={<Shield className="h-6 w-6" />}
                    live
                  />
                </div>
              </Card>

              {/* Live Threat Feed */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground">Live Threat Feed</h2>
                    <LiveIndicator active label="Live" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Filter</Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading threats...</div>
                ) : threatsData && threatsData.threats.length > 0 ? (
                  <div className="space-y-4">
                    {threatsData.threats.slice(0, 3).map((threat) => (
                      <ThreatCard
                        key={threat.id}
                        {...threat}
                        onInvestigate={() => setActiveView('threats')}
                        onQuarantine={() => handleQuarantine(threat.id)}
                        onRotate={() => handleRotate(threat.id)}
                        onDismiss={() => handleDismiss(threat.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No active threats</div>
                )}

                {threatsData && threatsData.threats.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setActiveView('threats')}
                  >
                    View All Threats
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </Card>
            </>
          )}

          {activeView === 'threats' && <ThreatsView />}
          {activeView === 'identities' && <IdentitiesView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, badge, active, expanded, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-4 w-full p-4 rounded-xl mb-2
        transition-all duration-150 ease-out
        ${active 
          ? 'bg-gradient-to-r from-nexora-primary/15 to-nexora-primary/5 border-l-3 border-nexora-primary text-nexora-primary' 
          : 'text-text-secondary hover:bg-white/5'
        }
      `}
    >
      <div className="min-w-[24px] flex items-center justify-center">
        {icon}
      </div>
      <span className={`
        whitespace-nowrap transition-opacity duration-200
        ${expanded ? 'opacity-100 delay-50' : 'opacity-0'}
      `}>
        {label}
      </span>
      {badge && badge > 0 && (
        <span className="absolute top-2 left-9 bg-nexora-threat text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(255,0,110,0.4)]">
          {badge}
        </span>
      )}
    </button>
  );
}
