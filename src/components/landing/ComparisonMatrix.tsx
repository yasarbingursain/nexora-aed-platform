"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Check, X, AlertTriangle } from 'lucide-react';

type FeatureStatus = 'yes' | 'no' | 'partial';

interface FeatureDetail {
  status: FeatureStatus;
  detail: string;
}

const features: Array<{
  name: string;
  nexora: FeatureDetail;
  cyberark: FeatureDetail;
  okta: FeatureDetail;
}> = [
  {
    name: 'AI Agents & Bots',
    nexora: { status: 'yes' as const, detail: 'First-class support with behavioral baselines' },
    cyberark: { status: 'no' as const, detail: 'Static credentials only, no AI agent support' },
    okta: { status: 'no' as const, detail: 'Human identity focus, limited machine identity' }
  },
  {
    name: 'Quantum-Safe Crypto',
    nexora: { status: 'yes' as const, detail: 'NIST-approved PQC algorithms (Kyber, Dilithium)' },
    cyberark: { status: 'no' as const, detail: 'Classical crypto only, no quantum roadmap' },
    okta: { status: 'no' as const, detail: 'No post-quantum cryptography support' }
  },
  {
    name: 'Autonomous Remediation',
    nexora: { status: 'yes' as const, detail: 'Real-time response in <3 seconds with rollback' },
    cyberark: { status: 'partial' as const, detail: 'Manual workflows required for most actions' },
    okta: { status: 'no' as const, detail: 'Alerting only, no automated response' }
  },
  {
    name: 'Explainable AI',
    nexora: { status: 'yes' as const, detail: 'Full forensic timeline for every decision' },
    cyberark: { status: 'no' as const, detail: 'Rule-based detection, no ML explanations' },
    okta: { status: 'no' as const, detail: 'Limited visibility into detection logic' }
  },
  {
    name: 'Threat Intelligence',
    nexora: { status: 'yes' as const, detail: 'Global NHITI network with crowd-sourced IOCs' },
    cyberark: { status: 'no' as const, detail: 'No shared threat intelligence network' },
    okta: { status: 'no' as const, detail: 'Limited to internal threat data' }
  },
  {
    name: 'Entity Morphing Detection',
    nexora: { status: 'yes' as const, detail: 'Behavioral drift and identity lineage tracking' },
    cyberark: { status: 'no' as const, detail: 'Static identity model, no morphing detection' },
    okta: { status: 'no' as const, detail: 'No behavioral analysis for machine identities' }
  },
  {
    name: 'Setup Time',
    nexora: { status: 'yes' as const, detail: '< 1 week with automated discovery' },
    cyberark: { status: 'no' as const, detail: '6+ months with extensive professional services' },
    okta: { status: 'partial' as const, detail: '3 months for enterprise deployment' }
  },
  {
    name: 'Compliance Mapping',
    nexora: { status: 'yes' as const, detail: 'Auto-map to NIST, PCI, HIPAA, SOC2, GDPR' },
    cyberark: { status: 'partial' as const, detail: 'Manual compliance reporting' },
    okta: { status: 'partial' as const, detail: 'Limited compliance automation' }
  }
];

const StatusIcon = ({ status }: { status: 'yes' | 'no' | 'partial' }) => {
  if (status === 'yes') {
    return <Check className="h-5 w-5 text-nexora-ai" />;
  }
  if (status === 'partial') {
    return <AlertTriangle className="h-5 w-5 text-nexora-warning" />;
  }
  return <X className="h-5 w-5 text-muted-foreground" />;
};

export function ComparisonMatrix() {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Why CISOs Choose Nexora
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Over CyberArk, Okta, and point solutions. Built for the autonomous era, not retrofitted.
          </p>
        </div>

        <Card className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-6 font-semibold text-foreground bg-bg-elevated/50">
                    Capability
                  </th>
                  <th className="text-center p-6 font-semibold text-foreground bg-nexora-primary/10 border-l border-r border-nexora-primary/20">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-nexora-primary to-nexora-quantum rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">N</span>
                      </div>
                      <span>Nexora</span>
                    </div>
                  </th>
                  <th className="text-center p-6 font-semibold text-muted-foreground bg-bg-elevated/30">
                    CyberArk
                  </th>
                  <th className="text-center p-6 font-semibold text-muted-foreground bg-bg-elevated/30">
                    Okta
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-border/30 hover:bg-bg-elevated/30 transition-colors ${
                      index % 2 === 0 ? 'bg-bg-deep/20' : ''
                    }`}
                  >
                    <td className="p-6 font-medium text-foreground">
                      {feature.name}
                    </td>
                    <td
                      className="p-6 text-center bg-nexora-primary/5 border-l border-r border-nexora-primary/10 relative"
                      onMouseEnter={() => setHoveredCell(`nexora-${index}`)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className="flex justify-center">
                        <StatusIcon status={feature.nexora.status} />
                      </div>
                      {hoveredCell === `nexora-${index}` && (
                        <div className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-bg-overlay border border-nexora-primary/30 rounded-lg shadow-xl min-w-[250px] text-sm text-left">
                          <div className="text-nexora-primary font-semibold mb-1">How we do it:</div>
                          <div className="text-foreground">{feature.nexora.detail}</div>
                        </div>
                      )}
                    </td>
                    <td
                      className="p-6 text-center relative"
                      onMouseEnter={() => setHoveredCell(`cyberark-${index}`)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className="flex justify-center">
                        <StatusIcon status={feature.cyberark.status} />
                      </div>
                      {hoveredCell === `cyberark-${index}` && (
                        <div className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-bg-overlay border border-border rounded-lg shadow-xl min-w-[250px] text-sm text-left">
                          <div className="text-muted-foreground font-semibold mb-1">Limitation:</div>
                          <div className="text-foreground">{feature.cyberark.detail}</div>
                        </div>
                      )}
                    </td>
                    <td
                      className="p-6 text-center relative"
                      onMouseEnter={() => setHoveredCell(`okta-${index}`)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className="flex justify-center">
                        <StatusIcon status={feature.okta.status} />
                      </div>
                      {hoveredCell === `okta-${index}` && (
                        <div className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-bg-overlay border border-border rounded-lg shadow-xl min-w-[250px] text-sm text-left">
                          <div className="text-muted-foreground font-semibold mb-1">Limitation:</div>
                          <div className="text-foreground">{feature.okta.detail}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Hover over cells for detailed explanations. Data based on publicly available documentation and vendor specifications.
          </p>
        </div>
      </div>
    </section>
  );
}
