"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: "threat" | "action" | "incident" | "compliance" | "system";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  entityName?: string;
  status?: "active" | "resolved" | "investigating";
  metadata?: Record<string, any>;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
  showEntityNames?: boolean;
  maxEvents?: number;
}

const typeConfig = {
  threat: {
    icon: "🚨",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  action: {
    icon: "⚡",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  incident: {
    icon: "🔥",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  compliance: {
    icon: "📋",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  system: {
    icon: "⚙️",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
};

const severityConfig = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
  info: "border-l-blue-500",
};

export function Timeline({
  events,
  className,
  showEntityNames = true,
  maxEvents = 50,
}: TimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatFullTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {displayEvents.map((event, index) => {
          const config = typeConfig[event.type];
          const isLast = index === displayEvents.length - 1;

          return (
            <div
              key={event.id}
              className="relative flex items-start gap-4 group"
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex items-center justify-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200",
                    config.bg,
                    config.border,
                    "group-hover:scale-110 group-hover:shadow-lg"
                  )}
                >
                  <span className="text-lg">{config.icon}</span>
                </div>
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pb-8">
                <div
                  className={cn(
                    "bg-card border rounded-lg p-4 transition-all duration-200",
                    "hover:shadow-md hover:border-primary/20",
                    event.severity && `border-l-4 ${severityConfig[event.severity]}`
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {event.title}
                      </h3>
                      {showEntityNames && event.entityName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Entity: {event.entityName}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className="text-2xs text-muted-foreground/70">
                        {formatFullTime(event.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Type badge */}
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-2xs font-medium capitalize",
                          config.bg,
                          config.color,
                          config.border,
                          "border"
                        )}
                      >
                        {event.type}
                      </span>

                      {/* Severity badge */}
                      {event.severity && (
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-2xs font-medium capitalize",
                            event.severity === "critical" && "bg-red-500/10 text-red-400 border-red-500/20",
                            event.severity === "high" && "bg-orange-500/10 text-orange-400 border-orange-500/20",
                            event.severity === "medium" && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                            event.severity === "low" && "bg-green-500/10 text-green-400 border-green-500/20",
                            event.severity === "info" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            "border"
                          )}
                        >
                          {event.severity}
                        </span>
                      )}

                      {/* Status badge */}
                      {event.status && (
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-2xs font-medium capitalize",
                            event.status === "active" && "bg-red-500/10 text-red-400 border-red-500/20",
                            event.status === "investigating" && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                            event.status === "resolved" && "bg-green-500/10 text-green-400 border-green-500/20",
                            "border"
                          )}
                        >
                          {event.status}
                        </span>
                      )}
                    </div>

                    {/* Metadata count */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <span className="text-2xs text-muted-foreground">
                        +{Object.keys(event.metadata).length} details
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {events.length > maxEvents && (
        <div className="relative flex items-center justify-center mt-4">
          <div className="absolute left-6 w-px h-8 bg-gradient-to-b from-border to-transparent" />
          <div className="bg-muted/50 px-4 py-2 rounded-full text-xs text-muted-foreground">
            +{events.length - maxEvents} more events
          </div>
        </div>
      )}
    </div>
  );
}
