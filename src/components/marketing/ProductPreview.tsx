'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Shield, Activity, Lock, FileText, Zap } from 'lucide-react';

type TabKey = 'inventory' | 'anomalies' | 'policy' | 'containment' | 'evidence';

const TABS: Array<{ key: TabKey; label: string; sub: string; icon: any }> = [
  { key: 'inventory', label: 'Inventory', sub: 'NHI discovery + lifecycle', icon: Shield },
  { key: 'anomalies', label: 'Anomalies', sub: 'Behavioral detection', icon: Activity },
  { key: 'policy', label: 'Policy', sub: 'Least privilege controls', icon: Lock },
  { key: 'containment', label: 'Containment', sub: 'Safe autonomous response', icon: Zap },
  { key: 'evidence', label: 'Evidence', sub: 'Explainability + audit trail', icon: FileText },
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function ProductPreview() {
  const [active, setActive] = useState<TabKey>('inventory');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % 10_000), 2200);
    return () => clearInterval(t);
  }, []);

  const mock = useMemo(() => {
    const now = new Date();
    const stamp = now.toISOString().replace('T', ' ').slice(0, 19) + 'Z';

    const entities = [
      { name: 'svc-payments', type: 'Service Account', risk: 'Medium' },
      { name: 'ci-github-actions', type: 'CI/CD', risk: 'Low' },
      { name: 'bot-reports', type: 'Automation Bot', risk: 'Low' },
      { name: 'agent-ops-runner', type: 'AI Agent', risk: tick % 3 === 0 ? 'High' : 'Medium' },
    ];

    const events = [
      {
        t: stamp,
        sev: tick % 3 === 0 ? 'HIGH' : 'MED',
        msg: tick % 3 === 0
          ? 'Anomalous token usage: agent-ops-runner attempted lateral access'
          : 'Privilege drift detected: svc-payments requested new scope',
      },
      {
        t: stamp,
        sev: 'LOW',
        msg: 'Observe-only: policy simulation completed (no enforcement applied)',
      },
      {
        t: stamp,
        sev: 'LOW',
        msg: 'Evidence log chained: action_id=EVT-' + String(1000 + (tick % 9000)),
      },
    ];

    return { stamp, entities, events };
  }, [tick]);

  return (
    <section className="py-16 px-6 bg-gradient-to-b from-background to-card/20">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-4xl font-bold text-foreground mb-3">
            See what &quot;Autonomous Entity Defense&quot; looks like.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A single control plane that inventories non-human identities, detects abnormal behavior,
            enforces policy, triggers safe containment, and produces evidence-grade audit trails.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Card className="p-4 md:p-6 border-border bg-card/60 backdrop-blur">
            <div className="flex flex-wrap gap-2 mb-5">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={cx(
                      'rounded-xl px-4 py-2 text-sm transition-colors border flex items-center gap-2',
                      active === t.key
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
                    )}
                    aria-pressed={active === t.key}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-xs opacity-80">{t.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1 rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-xs text-muted-foreground mb-3">Workspace</div>
                <div className="space-y-2">
                  {[
                    'Overview',
                    'Identities',
                    'Threats',
                    'Policies',
                    'Remediation',
                    'Evidence',
                  ].map((i) => (
                    <div
                      key={i}
                      className={cx(
                        'rounded-xl px-3 py-2 text-sm border',
                        (active === 'inventory' && i === 'Identities') ||
                        (active === 'anomalies' && i === 'Threats') ||
                        (active === 'policy' && i === 'Policies') ||
                        (active === 'containment' && i === 'Remediation') ||
                        (active === 'evidence' && i === 'Evidence')
                          ? 'border-foreground text-foreground bg-foreground/5'
                          : 'border-border text-muted-foreground bg-transparent'
                      )}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-border bg-background/40 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Live view</div>
                    <div className="text-xl font-bold text-foreground">
                      {active === 'inventory' && 'Non-Human Identity Inventory'}
                      {active === 'anomalies' && 'Behavioral Anomaly Feed'}
                      {active === 'policy' && 'Policy Enforcement (Least Privilege)'}
                      {active === 'containment' && 'Autonomous Containment Workflow'}
                      {active === 'evidence' && 'Evidence-Grade Audit Timeline'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">Observe-only ready</Badge>
                    <Badge variant="outline" className="text-xs">Tenant isolated</Badge>
                    <Badge variant="outline" className="text-xs">Explainable</Badge>
                  </div>
                </div>

                {active === 'inventory' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Identities (sample)
                      </div>
                      <div className="space-y-2">
                        {mock.entities.map((e) => (
                          <div
                            key={e.name}
                            className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                          >
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {e.name}
                              </div>
                              <div className="text-xs text-muted-foreground">{e.type}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">Risk: {e.risk}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Lifecycle signals
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• first_seen_at / last_seen_at / last_used_at tracked per identity</li>
                        <li>• behavior baselines stored per entity (confidence-scored)</li>
                        <li>• org-scoped data boundaries enforced end-to-end</li>
                      </ul>
                    </div>
                  </div>
                )}

                {active === 'anomalies' && (
                  <div className="rounded-2xl border border-border p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">
                      Detection events (sample)
                    </div>
                    <div className="space-y-2">
                      {mock.events.map((ev, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2"
                        >
                          <div>
                            <div className="text-xs text-muted-foreground">{ev.t}</div>
                            <div className="text-sm text-foreground">{ev.msg}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">{ev.sev}</Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      This preview shows the workflow shape. Production feeds reflect actual detections, policies, and evidence logs.
                    </div>
                  </div>
                )}

                {active === 'policy' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Example policy controls
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• environment boundaries (prod vs non-prod) enforced</li>
                        <li>• least privilege scope validation for tokens and integrations</li>
                        <li>• deny-by-default when tenant context is missing</li>
                        <li>• optional approvals for high-impact changes</li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Enforcement modes
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="rounded-xl border border-border px-3 py-2">
                          <div className="font-semibold text-foreground">Observe-only</div>
                          <div className="text-muted-foreground text-xs">
                            Record evidence, simulate response, no changes applied.
                          </div>
                        </div>
                        <div className="rounded-xl border border-border px-3 py-2">
                          <div className="font-semibold text-foreground">Guarded enforcement</div>
                          <div className="text-muted-foreground text-xs">
                            Apply safe actions + approvals for destructive steps.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {active === 'containment' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Containment playbook (sample)
                      </div>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
                        <li>quarantine identity (revoke / block / isolate scope)</li>
                        <li>rotate credentials (policy-gated)</li>
                        <li>trigger approval (if required)</li>
                        <li>execute rollback if downstream dependency breaks</li>
                        <li>write evidence log entries for each step</li>
                      </ol>
                    </div>
                    <div className="rounded-2xl border border-border p-4">
                      <div className="text-sm font-semibold text-foreground mb-2">
                        Safety constraints
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• dry-run supported for workflow verification</li>
                        <li>• rollback snapshots captured for high-impact steps</li>
                        <li>• all actions recorded with who/what/why context</li>
                      </ul>
                    </div>
                  </div>
                )}

                {active === 'evidence' && (
                  <div className="rounded-2xl border border-border p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">
                      Evidence timeline (sample)
                    </div>
                    <div className="space-y-2">
                      {[
                        { k: 'Decision', v: 'Flagged due to behavioral deviation + policy violation' },
                        { k: 'Reason', v: 'Access sequence deviated from baseline by threshold' },
                        { k: 'Action', v: 'Containment executed in guarded mode (approval-gated)' },
                        { k: 'Audit', v: 'Evidence log hash-chained for tamper-evidence' },
                      ].map((r) => (
                        <div
                          key={r.k}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2"
                        >
                          <div className="text-sm font-semibold text-foreground">{r.k}</div>
                          <div className="text-sm text-muted-foreground text-right">{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Export evidence as PDF/JSON for compliance reporting without making unverified certification claims.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
