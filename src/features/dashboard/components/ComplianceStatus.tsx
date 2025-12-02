'use client'

import { useState, useEffect } from 'react'

interface ComplianceFramework {
  id: string
  name: string
  shortName: string
  score: number
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_assessed'
  lastAssessment: string
  nextAssessment: string
  totalControls: number
  passedControls: number
  failedControls: number
  pendingControls: number
}

interface ComplianceMetrics {
  overallScore: number
  frameworks: ComplianceFramework[]
  totalRequirements: number
  metRequirements: number
  criticalGaps: number
  lastUpdated: string
}

export function ComplianceStatus() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchMetrics = async () => {
      setIsLoading(true)
      // Mock data - replace with actual API call
      setTimeout(() => {
        setMetrics({
          overallScore: 87,
          totalRequirements: 245,
          metRequirements: 213,
          criticalGaps: 3,
          lastUpdated: new Date().toISOString(),
          frameworks: [
            {
              id: '1',
              name: 'SOC 2 Type II',
              shortName: 'SOC 2',
              score: 92,
              status: 'compliant',
              lastAssessment: '2024-10-15',
              nextAssessment: '2025-04-15',
              totalControls: 64,
              passedControls: 59,
              failedControls: 2,
              pendingControls: 3
            },
            {
              id: '2',
              name: 'NIST Cybersecurity Framework',
              shortName: 'NIST CSF',
              score: 85,
              status: 'partially_compliant',
              lastAssessment: '2024-10-20',
              nextAssessment: '2025-01-20',
              totalControls: 98,
              passedControls: 83,
              failedControls: 8,
              pendingControls: 7
            },
            {
              id: '3',
              name: 'PCI DSS v4.0',
              shortName: 'PCI DSS',
              score: 78,
              status: 'partially_compliant',
              lastAssessment: '2024-09-30',
              nextAssessment: '2024-12-30',
              totalControls: 83,
              passedControls: 65,
              failedControls: 12,
              pendingControls: 6
            },
            {
              id: '4',
              name: 'HIPAA Security Rule',
              shortName: 'HIPAA',
              score: 94,
              status: 'compliant',
              lastAssessment: '2024-10-10',
              nextAssessment: '2025-10-10',
              totalControls: 45,
              passedControls: 42,
              failedControls: 1,
              pendingControls: 2
            }
          ]
        })
        setIsLoading(false)
      }, 700)
    }

    fetchMetrics()
  }, [])

  const getStatusColor = (status: ComplianceFramework['status']) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'partially_compliant':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'non_compliant':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      case 'not_assessed':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Compliance Status</h3>
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
        <h3 className="text-lg font-semibold text-foreground">Compliance Status</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">Monitored</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Compliance</span>
          <span className={`text-lg font-bold ${getScoreColor(metrics.overallScore)}`}>
            {metrics.overallScore}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              metrics.overallScore >= 90 ? 'bg-green-500' :
              metrics.overallScore >= 75 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.overallScore}%` }}
          ></div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{metrics.metRequirements}</div>
          <div className="text-xs text-muted-foreground">Met</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{metrics.totalRequirements - metrics.metRequirements}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-500">{metrics.criticalGaps}</div>
          <div className="text-xs text-muted-foreground">Critical</div>
        </div>
      </div>

      {/* Frameworks */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Frameworks</h4>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {metrics.frameworks.map((framework) => (
            <div key={framework.id} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">
                    {framework.shortName}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(framework.status)}`}>
                    {framework.status.replace('_', ' ')}
                  </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(framework.score)}`}>
                  {framework.score}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{framework.passedControls}/{framework.totalControls} controls</span>
                <span>Next: {formatDate(framework.nextAssessment)}</span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    framework.score >= 90 ? 'bg-green-500' :
                    framework.score >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${framework.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Last updated: {formatDate(metrics.lastUpdated)}
          </span>
          <button className="text-xs text-primary hover:text-primary/80 font-medium">
            View Details →
          </button>
        </div>
      </div>
    </div>
  )
}
