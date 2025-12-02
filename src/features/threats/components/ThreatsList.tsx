'use client';

import { ThreatCard } from '@/components/ui/ThreatCard';
import type { Threat } from '@/types/api.types';
import { ThreatStatus } from '@/types/threat.types';

interface ThreatsListProps {
  threats: Threat[];
  isLoading?: boolean;
  isUpdating?: boolean;
  onUpdateThreat?: (data: { id: string; status: ThreatStatus }) => void;
}

export function ThreatsList({ threats, isLoading, isUpdating, onUpdateThreat }: ThreatsListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading threats...</div>;
  }

  if (threats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Threats Detected</h3>
        <p className="text-sm text-muted-foreground">
          Your environment is secure. All systems are operating normally.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {threats.map((threat) => (
        <ThreatCard
          key={threat.id}
          id={threat.id}
          title={threat.title}
          description={threat.description}
          severity={threat.severity as "critical" | "high" | "medium" | "low"}
          status={threat.status as "active" | "investigating" | "resolved" | "dismissed"}
          entityName={threat.affectedEntities?.[0] || "Unknown"}
          entityType={threat.category || "Threat"}
          detectedAt={threat.detectedAt}
          riskScore={Math.round(threat.confidence * 100)}
          onInvestigate={() => {
            // Navigate to threat detail page
            window.location.href = `/threats/${threat.id}`;
          }}
          onRemediate={() => {
            if (onUpdateThreat) {
              onUpdateThreat({ id: threat.id, status: ThreatStatus.CONTAINED });
            }
          }}
          onDismiss={() => {
            if (onUpdateThreat) {
              onUpdateThreat({ id: threat.id, status: ThreatStatus.FALSE_POSITIVE });
            }
          }}
        />
      ))}
    </div>
  );
}
