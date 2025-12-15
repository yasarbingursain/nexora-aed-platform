"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { Timeline, type TimelineEvent } from "@/components/ui/Timeline";
import { toast } from "sonner";
import { Activity, Calendar, Filter } from "lucide-react";

interface ForensicTimelineResponse {
  timeline: {
    events: any[];
    summary?: any;
    clusters?: any[];
    attackPath?: any;
  };
}

export default function ForensicsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [severity, setSeverity] = useState<string | "all">("all");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const buildTimeline = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setEvents([]);

      const body: any = {
        startDate: from || undefined,
        endDate: to || undefined,
        severities: severity === "all" ? undefined : [severity],
      };

      const res = await fetch("/api/v1/soc/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Timeline endpoint failed (${res.status})`);
      }

      const data = (await res.json()) as ForensicTimelineResponse;
      const rawEvents = data.timeline?.events || [];

      const mapped: TimelineEvent[] = rawEvents.map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        timestamp: new Date(ev.timestamp),
        type: ev.category || ev.eventType || "system_event",
        severity: (ev.severity || "medium") as any,
        metadata: {
          actorId: ev.actor?.id || ev.actorId,
          actorType: ev.actor?.type || ev.actorType,
          targetId: ev.target?.id || ev.targetId,
          targetType: ev.target?.type || ev.targetType,
          sourceSystem: ev.evidence?.sourceSystem || ev.sourceSystem,
        },
      }));

      setEvents(mapped);
      toast.success(`Loaded ${mapped.length} forensic events`);
    } catch (error) {
      console.error("Forensic timeline error", error);
      toast.error(error instanceof Error ? error.message : "Failed to build forensic timeline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-green-500" />
              Forensic Timeline
            </h1>
            <LiveIndicator label="Investigation View" />
          </div>
          <p className="text-muted-foreground">
            Build a unified investigation timeline across audit logs, threats, remediation actions and evidence.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-400" />
            Timeline Filters
          </CardTitle>
          <CardDescription>
            Restrict events by time range and severity before building the forensic view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={buildTimeline}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From
              </label>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                To
              </label>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Severity</label>
              <select
                className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="security" loading={loading} className="w-full">
                Build Timeline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Chronological view of normalized events for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No events loaded. Adjust filters and build the timeline.
            </div>
          ) : (
            <Timeline events={events} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
