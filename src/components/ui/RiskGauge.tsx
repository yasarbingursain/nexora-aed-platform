"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface RiskGaugeProps {
  value: number; // 0-100
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const sizeConfig = {
  sm: {
    container: "w-16 h-16",
    strokeWidth: 3,
    textSize: "text-xs",
    labelSize: "text-2xs",
  },
  md: {
    container: "w-24 h-24",
    strokeWidth: 4,
    textSize: "text-sm",
    labelSize: "text-xs",
  },
  lg: {
    container: "w-32 h-32",
    strokeWidth: 5,
    textSize: "text-lg",
    labelSize: "text-sm",
  },
  xl: {
    container: "w-40 h-40",
    strokeWidth: 6,
    textSize: "text-xl",
    labelSize: "text-base",
  },
};

const getRiskColor = (value: number) => {
  if (value >= 80) return { color: "#dc2626", glow: "shadow-red-500/25" }; // Critical
  if (value >= 60) return { color: "#ea580c", glow: "shadow-orange-500/25" }; // High
  if (value >= 40) return { color: "#d97706", glow: "shadow-yellow-500/25" }; // Medium
  return { color: "#059669", glow: "shadow-green-500/25" }; // Low
};

const getRiskLevel = (value: number) => {
  if (value >= 80) return "Critical";
  if (value >= 60) return "High";
  if (value >= 40) return "Medium";
  return "Low";
};

export function RiskGauge({
  value,
  size = "md",
  showLabel = true,
  label,
  className,
  animated = true,
}: RiskGaugeProps) {
  const config = sizeConfig[size];
  const riskData = getRiskColor(value);
  const riskLevel = getRiskLevel(value);
  
  // Ensure value is between 0 and 100
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Calculate circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          config.container,
          animated && "transition-all duration-500",
          normalizedValue >= 80 && "animate-pulse-security"
        )}
      >
        {/* Background Circle */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={riskData.color}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-1000 ease-out",
              animated && "animate-pulse"
            )}
            style={{
              filter: `drop-shadow(0 0 8px ${riskData.color}40)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              "font-bold",
              config.textSize,
              normalizedValue >= 80 && "text-red-400",
              normalizedValue >= 60 && normalizedValue < 80 && "text-orange-400",
              normalizedValue >= 40 && normalizedValue < 60 && "text-yellow-400",
              normalizedValue < 40 && "text-green-400"
            )}
          >
            {Math.round(normalizedValue)}%
          </span>
          {size !== "sm" && (
            <span
              className={cn(
                "font-medium opacity-75",
                config.labelSize,
                normalizedValue >= 80 && "text-red-300",
                normalizedValue >= 60 && normalizedValue < 80 && "text-orange-300",
                normalizedValue >= 40 && normalizedValue < 60 && "text-yellow-300",
                normalizedValue < 40 && "text-green-300"
              )}
            >
              {riskLevel}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className={cn("font-medium text-foreground", config.labelSize)}>
            {label || "Risk Score"}
          </p>
        </div>
      )}
    </div>
  );
}
