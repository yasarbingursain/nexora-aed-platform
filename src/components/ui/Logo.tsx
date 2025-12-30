"use client";

import React from 'react';
import { Shield, Zap, Lock } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'icon-only' | 'text-only';
  className?: string;
  animated?: boolean;
}

export function Logo({ 
  size = 'md', 
  variant = 'default',
  className = '',
  animated = false 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  };

  if (variant === 'text-only') {
    return (
      <span className={`font-display font-bold bg-gradient-to-r from-nexora-primary via-nexora-quantum to-nexora-ai bg-clip-text text-transparent ${textSizes[size]} ${className}`}>
        Nexora
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {variant !== 'icon-only' && (
        <div className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br from-nexora-primary via-nexora-quantum to-nexora-ai p-0.5 shadow-lg ${animated ? 'animate-pulse' : ''}`}>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-nexora-primary/20 via-nexora-quantum/20 to-nexora-ai/20 blur-md"></div>
          <div className="relative w-full h-full bg-background rounded-xl flex items-center justify-center">
            <div className="relative">
              <Shield className={`${iconSize[size]} text-nexora-primary absolute top-0 left-0 ${animated ? 'animate-ping opacity-20' : ''}`} />
              <Shield className={`${iconSize[size]} text-nexora-primary relative z-10`} />
              <Zap className={`${iconSize[size]} text-nexora-quantum absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50`} style={{ fontSize: '60%' }} />
            </div>
          </div>
        </div>
      )}
      
      {variant !== 'icon-only' && (
        <span className={`font-display font-bold bg-gradient-to-r from-nexora-primary via-nexora-quantum to-nexora-ai bg-clip-text text-transparent ${textSizes[size]}`}>
          Nexora
        </span>
      )}
    </div>
  );
}

export function LogoWithTagline({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Logo size={size} animated />
      <p className="text-xs text-muted-foreground font-medium tracking-wide">
        Autonomous Entity Defense Platform
      </p>
    </div>
  );
}
