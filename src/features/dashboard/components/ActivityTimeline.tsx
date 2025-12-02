'use client'

import { useState, useEffect } from 'react'

interface TimelineEvent {
  id: string
  timestamp: string
  type: 'threat_detected' | 'action_executed' | 'identity_created' | 'policy_updated' | 'user_login' | 'system_alert'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actor: string
  entityName?: string
  automated: boolean
}

export function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchEvents = async () => {
      setIsLoading(true)
      // Mock data - replace with actual API call
      setTimeout(() => {
        setEvents([
          {
            id: '1',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            type: 'threat_detected',
            title: 'Critical Threat Detected',
            description: 'Suspicious API key usage from unusual location',
            severity: 'critical',
            actor: 'Nexora AI',
            entityName: 'prod-api-key-7829',
            automated: true
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            type: 'action_executed',
            title: 'Credential Rotation',
            description: 'Automatically rotated compromised API key',
            severity: 'medium',
            actor: 'Nexora AI',
            entityName: 'staging-api-key-1234',
            automated: true
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            type: 'user_login',
            title: 'User Login',
            description: 'Security analyst logged in from approved location',
            severity: 'low',
            actor: 'john.doe@company.com',
            automated: false
          },
          {
            id: '4',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            type: 'identity_created',
            title: 'New Identity Discovered',
            description: 'Service account detected in production environment',
            severity: 'medium',
            actor: 'Nexora Discovery',
            entityName: 'svc-payment-processor',
            automated: true
          },
          {
            id: '5',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            type: 'policy_updated',
            title: 'Security Policy Updated',
            description: 'Updated access control policy for production resources',
            severity: 'low',
            actor: 'admin@company.com',
            automated: false
          },
          {
            id: '6',
            timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            type: 'system_alert',
            title: 'System Health Check',
            description: 'All systems operational, no issues detected',
            severity: 'low',
            actor: 'Nexora Monitor',
            automated: true
          }
        ])
        setIsLoading(false)
      }, 600)
    }

    fetchEvents()
  }, [])

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'threat_detected':
        return '⚠️'
      case 'action_executed':
        return '🔄'
      case 'identity_created':
        return '👤'
      case 'policy_updated':
        return '📋'
      case 'user_login':
        return '🔑'
      case 'system_alert':
        return '📊'
      default:
        return '•'
    }
  }

  const getSeverityColor = (severity: TimelineEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'low':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      default:
        return 'text-muted-foreground bg-muted/10 border-border'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffMs = now.getTime() - eventTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return eventTime.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Activity Timeline</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Real-time</span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {events.map((event, index) => (
          <div key={event.id} className="relative">
            {/* Timeline line */}
            {index < events.length - 1 && (
              <div className="absolute left-4 top-8 w-px h-16 bg-border"></div>
            )}
            
            <div className="flex space-x-3">
              {/* Event icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm ${getSeverityColor(event.severity)}`}>
                {getEventIcon(event.type)}
              </div>
              
              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                    {event.entityName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Entity: <span className="font-mono">{event.entityName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(event.timestamp)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {event.automated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Auto
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        event.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        event.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    by {event.actor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View all link */}
      <div className="mt-4 pt-4 border-t border-border">
        <button className="text-sm text-primary hover:text-primary/80 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  )
}
