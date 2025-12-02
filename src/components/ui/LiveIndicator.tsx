"use client";

import React from 'react';

interface LiveIndicatorProps {
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  label?: string;
}

export function LiveIndicator({ 
  active = true, 
  size = 'md', 
  color = 'success',
  label 
}: LiveIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colorClasses = {
    primary: 'bg-nexora-primary',
    success: 'bg-nexora-ai',
    warning: 'bg-nexora-warning',
    danger: 'bg-nexora-threat'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${active ? 'animate-pulse' : 'opacity-50'}`} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
