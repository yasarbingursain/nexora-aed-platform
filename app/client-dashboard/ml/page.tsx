"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { AlertTriangle, Brain, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface MLObservation {
  id: string;
  identityId: string;
  organizationId: string;
  observationType: string;
  timestamp: string;
  anomalyScore?: number;
  data?: string;
}

interface MLAnomalyViewItem {
  id: string;
  identityId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  anomalyScore: number;
  confidence: number;
  contributingFactors: string[];
  modelVersion: string;
  timestamp: string;
}

export default function MLAnomaliesPage() {
  const [items, setItems] = useState<MLAnomalyViewItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/customer/analytics/ml-anomalies", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`ML anomalies endpoint failed (${res.status})`);
      }

      const body = await res.json();
      const anomalies = (body.anomalies || []) as any[];

      const mapped: MLAnomalyViewItem[] = anomalies.map((a) => ({
        id: a.id,
        identityId: a.identityId,
        riskLevel: a.riskLevel,
        anomalyScore: a.anomalyScore,
        confidence: a.confidence,
        contributingFactors: a.contributingFactors || [],
        modelVersion: a.modelVersion,
        timestamp: a.timestamp,
      }));

      setItems(mapped);
    } catch (error) {
      console.error("ML anomalies load error", error);
      toast.error(error instanceof Error ? error.message : "Failed to load ML anomalies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnomalies();
  }, []);

  const renderRiskBadge = (level: MLAnomalyViewItem["riskLevel"]) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-nexora-threat/10 text-nexora-threat">High</Badge>;
      case "medium":
        return <Badge className="bg-nexora-warning/10 text-nexora-warning">Medium</Badge>;
      default:
        return <Badge className="bg-nexora-ai/10 text-nexora-ai">Low</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-sky-500" />
              ML Anomalies & Explainability
            </h1>
            <LiveIndicator label="Model-Driven" />
          </div>
          <p className="text-muted-foreground">
            Surface ML-detected anomalies on identities together with model risk scores and top contributing factors.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={loading}
          onClick={loadAnomalies}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent ML Anomalies</CardTitle>
          <CardDescription>
            This view depends on a backend route that exposes stored ML observations; until that is wired, data may be
            limited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No ML anomalies available. Ensure ML monitoring is enabled and the backend exposes an anomalies endpoint.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between border rounded-lg p-3 bg-muted/40"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">Identity {item.identityId}</span>
                      {renderRiskBadge(item.riskLevel)}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Anomaly Score: {(item.anomalyScore * 100).toFixed(1)}% • Confidence:
                      {" "}
                      {(item.confidence * 100).toFixed(1)}% • Model: {item.modelVersion}
                    </div>
                    {item.contributingFactors.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Top Factors: {item.contributingFactors.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-nexora-warning" />
                      <span>Use anomalies as decision support, not an automated verdict.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
