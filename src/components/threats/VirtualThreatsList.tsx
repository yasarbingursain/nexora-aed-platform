/**
 * Virtual Scrolling for Large Threat Lists
 * 
 * Handles 10,000+ threats smoothly with constant memory usage
 * Uses @tanstack/react-virtual for efficient rendering
 */

'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ThreatCard } from '@/components/ui/ThreatCard'
import type { Threat } from '@/types/threat.types'

interface VirtualThreatsListProps {
  threats: Threat[]
  onInvestigate?: (threat: Threat) => void
  onRemediate?: (threat: Threat) => void
  onDismiss?: (threat: Threat) => void
}

export function VirtualThreatsList({ 
  threats, 
  onInvestigate,
  onRemediate,
  onDismiss
}: VirtualThreatsListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: threats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 6,
  })

  return (
    <div
      ref={parentRef}
      className="h-[640px] overflow-auto"
      data-testid="virtual-threats-list"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const threat = threats[virtualRow.index]
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ThreatCard
                id={threat.id}
                title={threat.title}
                description={threat.description}
                severity={threat.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'}
                status={threat.status === 'open' ? 'active' : threat.status === 'investigating' ? 'investigating' : threat.status === 'resolved' ? 'resolved' : 'dismissed'}
                entityName={threat.affectedEntities?.[0] || 'Unknown'}
                entityType="Entity"
                detectedAt={threat.detectedAt}
                riskScore={Math.round(threat.confidence * 100)}
                onInvestigate={() => onInvestigate?.(threat)}
                onRemediate={() => onRemediate?.(threat)}
                onDismiss={() => onDismiss?.(threat)}
                data-testid="threat-card"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
