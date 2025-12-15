"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { toast } from "sonner";
import { GitBranch, Search, AlertTriangle } from "lucide-react";

interface LineageNode {
  id: string;
  identityId: string;
  identityName: string;
  identityType: string;
  parentId: string | null;
  relationship: string;
  createdAt: string;
  createdBy: string;
  purpose: string;
}

interface LineageEdge {
  from: string;
  to: string;
  relationship: string;
  createdAt: string;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  rootId: string | null;
  depth: number;
}

interface DriftAnalysis {
  driftScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  baselineDeviation: number;
  recommendations: string[];
  analyzedAt: string;
}

export default function LineagePage() {
  const [identityId, setIdentityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState<LineageGraph | null>(null);
  const [ancestors, setAncestors] = useState<LineageNode[]>([]);
  const [drift, setDrift] = useState<DriftAnalysis | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityId) {
      toast.error("Identity ID is required");
      return;
    }

    try {
      setLoading(true);
      setGraph(null);
      setAncestors([]);
      setDrift(null);

      const [graphRes, ancestorsRes, driftRes] = await Promise.all([
        fetch(`/api/v1/soc/lineage/${encodeURIComponent(identityId)}`),
        fetch(`/api/v1/soc/lineage/${encodeURIComponent(identityId)}/ancestors`),
        fetch(`/api/v1/soc/drift/${encodeURIComponent(identityId)}`),
      ]);

      if (!graphRes.ok) throw new Error("Failed to load lineage graph");
      if (!ancestorsRes.ok) throw new Error("Failed to load ancestors");

      const graphBody = await graphRes.json();
      const ancestorsBody = await ancestorsRes.json();

      setGraph(graphBody.graph as LineageGraph);
      setAncestors((ancestorsBody.ancestors || []) as LineageNode[]);

      if (driftRes.ok) {
        const driftBody = await driftRes.json();
        if (driftBody.analysis) {
          setDrift(driftBody.analysis as DriftAnalysis);
        }
      }

      toast.success("Lineage and drift analysis loaded");
    } catch (error) {
      console.error("Lineage analysis error", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze lineage");
    } finally {
      setLoading(false);
    }
  };

  const renderRiskBadge = (level: DriftAnalysis["riskLevel"]) => {
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
              <GitBranch className="h-7 w-7 text-purple-500" />
              Identity Lineage & Drift
            </h1>
            <LiveIndicator label="Graph & Morphing" />
          </div>
          <p className="text-muted-foreground">
            Inspect how a non-human identity evolved over time and detect suspicious morphing patterns.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-400" />
            Analyze Identity
          </CardTitle>
          <CardDescription>
            Provide an identity ID from the Entities view to retrieve lineage, ancestors and drift analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col md:flex-row gap-3" onSubmit={handleAnalyze}>
            <Input
              placeholder="Identity ID"
              value={identityId}
              onChange={(e) => setIdentityId(e.target.value)}
            />
            <Button type="submit" variant="security" loading={loading} className="md:w-40">
              Analyze
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lineage Graph</CardTitle>
            <CardDescription>
              Parent / child relationships for this identity across generations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!graph ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Run an analysis to see lineage graph details.
              </div>
            ) : graph.nodes.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No lineage information available for this identity.
              </div>
            ) : (
              <div className="space-y-4">
                {graph.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-start justify-between border rounded-lg p-3 bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{node.identityName}</span>
                        <Badge variant="outline" className="text-xs">
                          {node.identityType}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Relationship: {node.relationship} • Purpose: {node.purpose}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(node.createdAt).toLocaleString()} by {node.createdBy}
                      </div>
                    </div>
                    {node.parentId && (
                      <div className="text-xs text-muted-foreground text-right">
                        Parent: {node.parentId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ancestors</CardTitle>
              <CardDescription>Upstream identities this one was derived from.</CardDescription>
            </CardHeader>
            <CardContent>
              {ancestors.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No ancestors found.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {ancestors.map((node) => (
                    <div key={node.id} className="border rounded-lg p-2 bg-muted/40">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{node.identityName}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {node.relationship}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {node.identityType} • {node.purpose}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drift Analysis</CardTitle>
              <CardDescription>Behavioral deviation from this identity&apos;s baseline.</CardDescription>
            </CardHeader>
            <CardContent>
              {!drift ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No drift analysis available yet.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Drift Score</span>
                    <span className="font-semibold">{(drift.driftScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Baseline Deviation</span>
                    <span className="font-semibold">{(drift.baselineDeviation * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk Level</span>
                    {renderRiskBadge(drift.riskLevel)}
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Recommendations</div>
                    <ul className="list-disc list-inside space-y-1">
                      {drift.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground mt-2">
                    <AlertTriangle className="h-3 w-3 text-nexora-warning mt-0.5" />
                    <span>
                      Drift scores are derived from recent activity and baselines. Use them as input to investigation,
                      not as a sole decision factor.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
