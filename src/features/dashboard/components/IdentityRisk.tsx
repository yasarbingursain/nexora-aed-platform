'use client'

import { useState, useEffect } from 'react'
import { IdentityType } from '@/types/identity.types'

interface RiskMetrics {
  totalIdentities: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
  averageRiskScore: number
  riskTrend: 'up' | 'down' | 'stable'
  topRiskyIdentities: RiskyIdentity[]
}

interface RiskyIdentity {
  id: string
  name: string
  type: IdentityType
  riskScore: number
  lastActivity: string
  reason: string
}

export function IdentityRisk() {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchMetrics = async () => {
      setIsLoading(true)
      // Mock data - replace with actual API call
      setTimeout(() => {
        setMetrics({
          totalIdentities: 1247,
          highRisk: 23,
          mediumRisk: 156,
          lowRisk: 1068,
          averageRiskScore: 34,
          riskTrend: 'down',
          topRiskyIdentities: [
            {
              id: '1',
              name: 'prod-api-key-7829',
              type: IdentityType.API_KEY,
              riskScore: 89,
              lastActivity: '2 hours ago',
              reason: 'Unusual access pattern'
            },
            {
              id: '2',
              name: 'service-account-ml',
              type: IdentityType.SERVICE_ACCOUNT,
              riskScore: 76,
              lastActivity: '1 day ago',
              reason: 'Elevated privileges'
            },
            {
              id: '3',
              name: 'cert-web-prod',
              type: IdentityType.CERTIFICATE,
              riskScore: 71,
              lastActivity: '3 hours ago',
              reason: 'Expiring soon'
            }
          ]
        })
        setIsLoading(false)
      }, 800)
    }

    fetchMetrics()
  }, [])

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getRiskBgColor = (score: number) => {
    if (score >= 70) return 'bg-red-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Identity Risk</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Identity Risk</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            metrics.riskTrend === 'up' ? 'bg-red-500' : 
            metrics.riskTrend === 'down' ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-muted-foreground capitalize">
            {metrics.riskTrend}
          </span>
        </div>
      </div>

      {/* Average Risk Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Average Risk Score</span>
          <span className={`text-lg font-bold ${getRiskColor(metrics.averageRiskScore)}`}>
            {metrics.averageRiskScore}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getRiskBgColor(metrics.averageRiskScore)}`}
            style={{ width: `${metrics.averageRiskScore}%` }}
          ></div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-foreground">Risk Distribution</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-foreground">High Risk</span>
            </div>
            <span className="text-sm font-medium text-foreground">{metrics.highRisk}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-foreground">Medium Risk</span>
            </div>
            <span className="text-sm font-medium text-foreground">{metrics.mediumRisk}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-foreground">Low Risk</span>
            </div>
            <span className="text-sm font-medium text-foreground">{metrics.lowRisk}</span>
          </div>
        </div>
      </div>

      {/* Top Risky Identities */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Top Risky Identities</h4>
        
        <div className="space-y-3">
          {metrics.topRiskyIdentities.map((identity) => (
            <div key={identity.id} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {identity.name}
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {identity.type.replace('_', ' ')}
                  </span>
                </div>
                <span className={`text-sm font-bold ${getRiskColor(identity.riskScore)}`}>
                  {identity.riskScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{identity.reason}</span>
                <span>{identity.lastActivity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Identities */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{metrics.totalIdentities}</div>
          <div className="text-sm text-muted-foreground">Total Identities</div>
        </div>
      </div>
    </div>
  )
}
