"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { toast } from "sonner";
import { Shield, Flame, PlusCircle, RefreshCw, AlertTriangle } from "lucide-react";

interface HoneyToken {
  id: string;
  type: string;
  name: string;
  status: string;
  triggerCount: number;
  createdAt: string;
  expiresAt: string | null;
}

interface HoneyTokenStats {
  total: number;
  active: number;
  triggered: number;
  disabled: number;
}

interface HoneyTokenListResponse {
  tokens: HoneyToken[];
  stats?: HoneyTokenStats;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  triggered: "Triggered",
  disabled: "Disabled",
  expired: "Expired",
};

function mapStatusToBadge(status: string): React.ReactNode {
  switch (status) {
    case "active":
      return <StatusBadge status="active">Active</StatusBadge>;
    case "triggered":
      return <StatusBadge status="warning">Triggered</StatusBadge>;
    case "disabled":
      return <StatusBadge status="inactive">Disabled</StatusBadge>;
    case "expired":
      return <StatusBadge status="error">Expired</StatusBadge>;
    default:
      return <StatusBadge status="pending">{status}</StatusBadge>;
  }
}

export default function HoneyTokensPage() {
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [stats, setStats] = useState<HoneyTokenStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | "all">("all");

  const [form, setForm] = useState({
    type: "api_key",
    name: "",
    description: "",
    deploymentLocation: "",
    expiresInDays: 90,
  });

  const loadTokens = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/v1/soc/honey-tokens${params.toString() ? `?${params.toString()}` : ""}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load honey tokens (${res.status})`);
      }

      const data = (await res.json()) as HoneyTokenListResponse;
      setTokens(data.tokens || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Failed to load honey tokens", error);
      toast.error("Failed to load honey tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.deploymentLocation || !form.type) {
      toast.error("Type, name and deployment location are required");
      return;
    }

    try {
      setCreating(true);
      toast.loading("Creating honey token...", { id: "create-honey-token" });

      const res = await fetch("/api/v1/soc/honey-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          name: form.name,
          description: form.description || undefined,
          deploymentLocation: form.deploymentLocation,
          expiresInDays: form.expiresInDays,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Create failed (${res.status})`);
      }

      toast.success("Honey token created", { id: "create-honey-token" });
      setForm((prev) => ({ ...prev, name: "", description: "", deploymentLocation: "" }));
      await loadTokens();
    } catch (error) {
      console.error("Create honey token error", error);
      toast.error(error instanceof Error ? error.message : "Failed to create honey token", {
        id: "create-honey-token",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (tokenId: string) => {
    try {
      toast.loading("Disabling honey token...", { id: `disable-${tokenId}` });
      const res = await fetch(`/api/v1/soc/honey-tokens/${tokenId}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Disable failed (${res.status})`);
      }
      toast.success("Honey token disabled", { id: `disable-${tokenId}` });
      await loadTokens();
    } catch (error) {
      console.error("Disable honey token error", error);
      toast.error(error instanceof Error ? error.message : "Failed to disable honey token", {
        id: `disable-${tokenId}`,
      });
    }
  };

  const handleRotate = async (tokenId: string) => {
    try {
      toast.loading("Rotating honey token...", { id: `rotate-${tokenId}` });
      const res = await fetch(`/api/v1/soc/honey-tokens/${tokenId}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Rotate failed (${res.status})`);
      }
      toast.success("Honey token rotated", { id: `rotate-${tokenId}` });
      await loadTokens();
    } catch (error) {
      console.error("Rotate honey token error", error);
      toast.error(error instanceof Error ? error.message : "Failed to rotate honey token", {
        id: `rotate-${tokenId}`,
      });
    }
  };

  useEffect(() => {
    void loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flame className="h-7 w-7 text-amber-500" />
              Honey Tokens
            </h1>
            <LiveIndicator label="Detection Layer" />
          </div>
          <p className="text-muted-foreground">
            Manage deception tokens deployed across your environment for early breach detection.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={loading}
          onClick={loadTokens}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Active Tokens
              </CardTitle>
              <CardDescription>
                Overview of all honey tokens and their current status.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("active")}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === "triggered" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("triggered")}
              >
                Triggered
              </Button>
              <Button
                variant={filterStatus === "disabled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("disabled")}
              >
                Disabled
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No honey tokens found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{token.name}</span>
                          <Badge variant="outline" className="text-xs uppercase">
                            {token.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Triggers: {token.triggerCount} • Created {new Date(token.createdAt).toLocaleString()}
                          {token.expiresAt && (
                            <span className="ml-2">• Expires {new Date(token.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {mapStatusToBadge(token.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisable(token.id)}
                        disabled={token.status === "disabled"}
                      >
                        Disable
                      </Button>
                      <Button
                        variant="security"
                        size="sm"
                        onClick={() => handleRotate(token.id)}
                        disabled={token.status === "disabled"}
                      >
                        Rotate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-400" />
              Create Honey Token
            </CardTitle>
            <CardDescription>
              Issue a new deception token. Values are only shown once; store them securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  placeholder="api_key, db_credential, etc."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Token name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Deployment Location</label>
                <Input
                  value={form.deploymentLocation}
                  onChange={(e) => setForm((prev) => ({ ...prev, deploymentLocation: e.target.value }))}
                  placeholder="e.g. repo URL, S3 path, config file path"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Operational notes for this token"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Expires In (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.expiresInDays}
                  onChange={(e) => setForm((prev) => ({ ...prev, expiresInDays: Number(e.target.value) || 1 }))}
                />
              </div>
              <Button type="submit" variant="security" loading={creating} className="w-full">
                Issue Token
              </Button>
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                <AlertTriangle className="h-3 w-3 text-nexora-warning mt-0.5" />
                <span>
                  Token secrets are returned only once by the API. Ensure they are stored in your secret manager or SOAR
                  playbooks.
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
