'use client'

import { useState, useEffect } from 'react'
import { ThreatSeverity, ThreatStatus } from '@/types/threat.types'

interface ThreatStats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  resolved: number
  investigating: number
  open: number
}

export function ThreatOverview() {
  const [stats, setStats] = useState<ThreatStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
    investigating: 0,
    open: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchStats = async () => {
      setIsLoading(true)
      // Mock data - replace with actual API call
      setTimeout(() => {
        setStats({
          total: 127,
          critical: 8,
          high: 23,
          medium: 45,
          low: 51,
          resolved: 89,
          investigating: 15,
          open: 23,
        })
        setIsLoading(false)
      }, 1000)
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Threat Overview</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Threat Overview</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Total Threats */}
      <div className="mb-6">
        <div className="text-3xl font-bold text-foreground">{stats.total}</div>
        <div className="text-sm text-muted-foreground">Total Active Threats</div>
      </div>

      {/* Severity Breakdown */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-foreground">By Severity</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-foreground">Critical</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.critical}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-foreground">High</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.high}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-foreground">Medium</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.medium}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-foreground">Low</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.low}</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">By Status</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-sm text-foreground">Open</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.open}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-foreground">Investigating</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.investigating}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-sm text-foreground">Resolved</span>
            </div>
            <span className="text-sm font-medium text-foreground">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Resolution Rate</span>
          <span className="text-foreground font-medium">
            {Math.round((stats.resolved / stats.total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
