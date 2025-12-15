"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import {
  Shield,
  Cloud,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  Link as LinkIcon,
} from "lucide-react";

interface CloudStatus {
  kubernetes: boolean;
  azure: boolean;
  gcp: boolean;
}

interface TicketTestResult {
  system: "servicenow" | "jira" | "slack";
  success: boolean;
  ticketId?: string;
  ticketUrl?: string;
  error?: string;
}

export default function SocIntegrationsPage() {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [testingIncident, setTestingIncident] = useState(false);
  const [lastTicketResults, setLastTicketResults] = useState<TicketTestResult[] | null>(null);

  const fetchCloudStatus = async () => {
    try {
      setLoadingStatus(true);
      setStatusError(null);

      const res = await fetch("/api/v1/soc/cloud/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Status endpoint failed with ${res.status}`);
      }

      const data = await res.json();
      setCloudStatus(data.status as CloudStatus);
    } catch (error) {
      console.error("Failed to load SOC cloud status", error);
      setStatusError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to load SOC cloud integration status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTestIncident = async () => {
    try {
      setTestingIncident(true);
      setLastTicketResults(null);
      toast.loading("Sending test incident through SOC connectors...", { id: "soc-test-incident" });

      const res = await fetch("/api/v1/soc/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nexora SOC Integration Test Incident",
          description:
            "This is a non-production test incident generated from the Nexora SOC integrations dashboard to validate connectivity.",
          priority: "medium",
          category: "integration-test",
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const message = body?.error || `Ticket endpoint failed with ${res.status}`;
        throw new Error(message);
      }

      const tickets = (body.results?.tickets || []) as TicketTestResult[];
      setLastTicketResults(tickets);

      const successful = tickets.filter((t) => t.success);
      const failed = tickets.filter((t) => !t.success);

      if (successful.length > 0) {
        toast.success(
          `SOC test incident delivered to: ${successful.map((t) => t.system).join(", ")}`,
          { id: "soc-test-incident" },
        );
      } else {
        toast.error("SOC test incident failed for all configured systems", { id: "soc-test-incident" });
      }

      if (failed.length > 0 && successful.length > 0) {
        toast.warning(
          `Some SOC systems failed: ${failed
            .map((t) => `${t.system}${t.error ? ` (${t.error})` : ""}`)
            .join(", ")}`,
        );
      }
    } catch (error) {
      console.error("SOC test incident error", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send SOC test incident",
        { id: "soc-test-incident" },
      );
    } finally {
      setTestingIncident(false);
    }
  };

  useEffect(() => {
    void fetchCloudStatus();
  }, []);

  const renderCloudBadge = (label: string, enabled: boolean | undefined) => {
    if (enabled === undefined) return <StatusBadge status="pending">Unknown</StatusBadge>;
    if (enabled) return <StatusBadge status="active">Connected</StatusBadge>;
    return <StatusBadge status="error">Not Configured</StatusBadge>;
  };

  const renderTicketSystemStatus = (system: "servicenow" | "jira" | "slack") => {
    const entry = lastTicketResults?.find((r) => r.system === system);
    if (!entry) return <StatusBadge status="pending">Not Tested</StatusBadge>;
    if (entry.success) return <StatusBadge status="active">OK</StatusBadge>;
    return <StatusBadge status="error">Failed</StatusBadge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-blue-500" />
              SOC &amp; Cloud Integrations
            </h1>
            <LiveIndicator label="Production Ready" />
          </div>
          <p className="text-muted-foreground">
            Validate and monitor Nexora&apos;s connections to your SOC tooling and cloud environments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            loading={loadingStatus}
            onClick={fetchCloudStatus}
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Button
            variant="security"
            size="sm"
            loading={testingIncident}
            onClick={handleTestIncident}
          >
            <Bell className="h-4 w-4 mr-2" />
            Send SOC Test Incident
          </Button>
        </div>
      </div>

      {/* Cloud Integrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              Cloud Isolation Integrations
            </CardTitle>
            <CardDescription>
              Real-time isolation capabilities across Kubernetes, Azure, and GCP for incident response.
            </CardDescription>
          </div>
          {statusError && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Status Error
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span className="font-medium">Kubernetes</span>
              </div>
              {renderCloudBadge("Kubernetes", cloudStatus?.kubernetes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pod isolation using NetworkPolicies to enforce zero-trust around compromised workloads.
            </p>
          </div>

          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-400" />
                <span className="font-medium">Azure NSG</span>
              </div>
              {renderCloudBadge("Azure", cloudStatus?.azure)}
            </div>
            <p className="text-xs text-muted-foreground">
              Network Security Group rules for quarantining hostile IPs and minimizing blast radius.
            </p>
          </div>

          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-amber-400" />
                <span className="font-medium">GCP Firewall</span>
              </div>
              {renderCloudBadge("GCP", cloudStatus?.gcp)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingress firewall rules to block malicious sources across your GCP perimeter.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SOC Connectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-purple-400" />
            SOC Ticketing &amp; Notifications
          </CardTitle>
          <CardDescription>
            Validate incident routing into ServiceNow, Jira, and Slack using a safe, non-destructive test incident.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">ServiceNow</span>
              {renderTicketSystemStatus("servicenow")}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Incidents created via the ticketing service using ITIL-aligned fields.
            </p>
            {lastTicketResults && (
              <IntegrationResultPill results={lastTicketResults} system="servicenow" />
            )}
          </div>

          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Jira</span>
              {renderTicketSystemStatus("jira")}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Security issues opened in your Jira project for SOC workflows.
            </p>
            {lastTicketResults && (
              <IntegrationResultPill results={lastTicketResults} system="jira" />
            )}
          </div>

          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Slack</span>
              {renderTicketSystemStatus("slack")}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Real-time alerts to your security channel for high-severity activity.
            </p>
            {lastTicketResults && (
              <IntegrationResultPill results={lastTicketResults} system="slack" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" />
            Validation Summary
          </CardTitle>
          <CardDescription>
            High-level view of SOC connectivity and cloud enforcement signals for your Nexora tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
          <SummaryItem
            icon={Shield}
            title="Enforcement Layer"
            description="Cloud isolation services reachable via SOC APIs."
            healthy={!!cloudStatus && Object.values(cloudStatus).some(Boolean)}
          />
          <SummaryItem
            icon={Bell}
            title="Incident Routing"
            description="SOC connectors successfully receiving test incidents."
            healthy={!!lastTicketResults && lastTicketResults.some((r) => r.success)}
          />
          <SummaryItem
            icon={AlertTriangle}
            title="Error Signals"
            description="Any failures surfaced via structured logs and responses."
            healthy={!statusError}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface IntegrationResultPillProps {
  results: TicketTestResult[];
  system: "servicenow" | "jira" | "slack";
}

function IntegrationResultPill({ results, system }: IntegrationResultPillProps) {
  const entry = results.find((r) => r.system === system);
  if (!entry) return null;

  if (!entry.success) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-400">
        <XCircle className="h-3 w-3" />
        <span>{entry.error || "Test failed"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-emerald-400">
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        <span>Last test OK</span>
      </div>
      {entry.ticketId && (
        <span className="text-muted-foreground">Ticket ID: {entry.ticketId}</span>
      )}
    </div>
  );
}

interface SummaryItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  healthy: boolean;
}

function SummaryItem({ icon: Icon, title, description, healthy }: SummaryItemProps) {
  return (
    <div className="flex items-start gap-3 border rounded-lg p-4 bg-muted/30">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{title}</span>
          {healthy ? (
            <StatusBadge status="active">Healthy</StatusBadge>
          ) : (
            <StatusBadge status="warning">Review</StatusBadge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
