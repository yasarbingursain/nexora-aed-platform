"use client";

import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  live?: boolean;
  subtitle?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  trend,
  live = false,
  subtitle 
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-nexora-ai" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-nexora-threat" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    if (change > 0) return 'text-nexora-ai';
    if (change < 0) return 'text-nexora-threat';
    return 'text-muted-foreground';
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        {icon && <div className="text-nexora-primary">{icon}</div>}
        {live && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-nexora-ai animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
        {change !== undefined && !live && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}
