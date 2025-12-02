"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import type { Threat } from "@/types/api.types";

export interface ThreatCardProps {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "active" | "investigating" | "resolved" | "dismissed";
  onInvestigate?: () => void;
  onRemediate?: () => void;
  onDismiss?: () => void;
  className?: string;
  // Optional fields for backward compatibility
  entityName?: string;
  entityType?: string;
  timestamp?: Date;
  riskScore?: number;
  detectedAt?: string;
  affectedEntities?: string[];
}

const severityConfig = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    icon: "🔴",
    glow: "shadow-red-500/25",
  },
  high: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    icon: "🟠",
    glow: "shadow-orange-500/25",
  },
  medium: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
    icon: "🟡",
    glow: "shadow-yellow-500/25",
  },
  low: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
    icon: "🟢",
    glow: "shadow-green-500/25",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    icon: "🔵",
    glow: "shadow-blue-500/25",
  },
};

const statusConfig = {
  active: { bg: "bg-red-500", text: "Active" },
  investigating: { bg: "bg-yellow-500", text: "Investigating" },
  resolved: { bg: "bg-green-500", text: "Resolved" },
  dismissed: { bg: "bg-gray-500", text: "Dismissed" },
};

export function ThreatCard({
  id,
  title,
  description,
  severity,
  entityName = "Unknown",
  entityType = "Entity",
  timestamp,
  status,
  riskScore = 0,
  onInvestigate,
  onRemediate,
  onDismiss,
  className,
  detectedAt,
  affectedEntities,
}: ThreatCardProps) {
  const severityStyle = severityConfig[severity];
  const statusStyle = statusConfig[status];

  const formatTimeAgo = (date?: Date | string) => {
    if (!date) return "recently";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const displayTime = timestamp || detectedAt;

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-all duration-200 hover:shadow-lg",
        "bg-card text-card-foreground",
        severityStyle.bg,
        severityStyle.border,
        severity === "critical" && "animate-pulse-security",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{severityStyle.icon}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {entityType}: {entityName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Risk Score */}
          <div className="text-right">
            <div className={cn("text-xs font-medium", severityStyle.text)}>
              Risk: {riskScore}%
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTimeAgo(displayTime)}
            </div>
          </div>
          
          {/* Status Badge */}
          <div
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium text-white",
              statusStyle.bg
            )}
          >
            {statusStyle.text}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onInvestigate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onInvestigate}
            className="text-xs"
          >
            Investigate
          </Button>
        )}
        
        {onRemediate && status === "active" && (
          <Button
            size="sm"
            variant={severity === "critical" ? "critical" : "high"}
            onClick={onRemediate}
            className="text-xs"
          >
            Remediate
          </Button>
        )}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        )}
      </div>

      {/* Severity Indicator */}
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-transparent via-current to-transparent opacity-50" />
    </div>
  );
}
