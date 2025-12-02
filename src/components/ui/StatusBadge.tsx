"use client";

import React from 'react';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'warning' | 'error' | 'pending';
  pulse?: boolean;
  children?: React.ReactNode;
}

export function StatusBadge({ status, pulse = false, children }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      className: 'bg-nexora-ai/10 text-nexora-ai border-nexora-ai/20',
      dotColor: 'bg-nexora-ai'
    },
    inactive: {
      className: 'bg-muted/10 text-muted-foreground border-muted/20',
      dotColor: 'bg-muted-foreground'
    },
    warning: {
      className: 'bg-nexora-warning/10 text-nexora-warning border-nexora-warning/20',
      dotColor: 'bg-nexora-warning'
    },
    error: {
      className: 'bg-nexora-threat/10 text-nexora-threat border-nexora-threat/20',
      dotColor: 'bg-nexora-threat'
    },
    pending: {
      className: 'bg-nexora-primary/10 text-nexora-primary border-nexora-primary/20',
      dotColor: 'bg-nexora-primary'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge className={config.className}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.dotColor} ${pulse ? 'animate-pulse' : ''}`} />
        {children || status.toUpperCase()}
      </div>
    </Badge>
  );
}
