'use client'

import { useState, useEffect } from 'react'
import { ThreatOverview } from './ThreatOverview'
import { IdentityRisk } from './IdentityRisk'
import { ActivityTimeline } from './ActivityTimeline'
import { ComplianceStatus } from './ComplianceStatus'

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Nexora Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time threat monitoring and autonomous response
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ThreatOverview />
          </div>
          <div>
            <IdentityRisk />
          </div>
          <div className="lg:col-span-2">
            <ActivityTimeline />
          </div>
          <div>
            <ComplianceStatus />
          </div>
        </div>
      </main>
    </div>
  )
}
