"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, AlertTriangle, Construction, Shield } from 'lucide-react';

const statusItems = [
  {
    category: "Production-Ready",
    icon: CheckCircle,
    color: "text-nexora-ai",
    bgColor: "bg-nexora-ai/10",
    borderColor: "border-nexora-ai/20",
    features: [
      "Post-quantum cryptography (Kyber, Dilithium, SPHINCS+)",
      "AWS, Azure, GCP credential rotation",
      "Network quarantine and isolation",
      "Explainable AI (SHAP, LIME, counterfactuals)",
      "Multi-tenant architecture with RLS",
      "SPIFFE/SPIRE service identity",
      "Real-time WebSockets and monitoring",
      "Remediation playbooks with dry-run mode"
    ]
  },
  {
    category: "In Development",
    icon: Construction,
    color: "text-nexora-warning",
    bgColor: "bg-nexora-warning/10",
    borderColor: "border-nexora-warning/20",
    features: [
      "ML anomaly detection pipeline (code complete, deployment in progress)",
      "Threat intelligence sharing network (NHITI)",
      "Kafka event bus for distributed processing",
      "Advanced behavioral baselining",
      "Production false-positive rate validation"
    ]
  }
];

export function DevelopmentStatus() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-card/30 to-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-nexora-primary/10 text-nexora-primary border-nexora-primary/20">
            <Shield className="w-4 h-4 mr-2" />
            Radical Transparency
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Development Status
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We believe in honest communication. Here&apos;s exactly where we are in our development journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card 
                key={item.category}
                className={`p-8 border-2 ${item.borderColor} ${item.bgColor} relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current/5 to-transparent rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{item.category}</h3>
                  </div>

                  <ul className="space-y-3">
                    {item.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full ${item.bgColor} flex items-center justify-center mt-0.5`}>
                          <div className={`w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')}`} />
                        </div>
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Key Stats */}
        <Card className="p-8 bg-gradient-to-br from-nexora-primary/5 to-nexora-quantum/5 border border-nexora-primary/20">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-nexora-primary mb-2">~60%</div>
              <div className="text-sm text-muted-foreground">Production-Ready Features</div>
              <div className="text-xs text-muted-foreground mt-1">(Per internal audit)</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-nexora-ai mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Code-Verified Claims</div>
              <div className="text-xs text-muted-foreground mt-1">(No fabricated features)</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-nexora-quantum mb-2">Early Access</div>
              <div className="text-sm text-muted-foreground">Design Partner Program</div>
              <div className="text-xs text-muted-foreground mt-1">(Shape the product)</div>
            </div>
          </div>
        </Card>

        {/* Why This Matters */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">Why We&apos;re Transparent</h3>
          <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground">
            <p>
              Many security startups make bold claims about capabilities that don&apos;t exist. 
              We&apos;ve seen the damage this causes—wasted time, broken trust, and security gaps.
            </p>
            <p>
              <strong className="text-foreground">Our commitment:</strong> Every feature we advertise is either 
              production-ready or clearly marked as in-development. No fabricated statistics. 
              No invented product names. No false regulatory frameworks.
            </p>
            <p>
              We&apos;re building something real, and we want partners who value honesty as much as innovation.
            </p>
          </div>
        </div>

        {/* Verified Claims Badge */}
        <div className="mt-12 p-6 bg-nexora-darker/30 border border-nexora-primary/20 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-nexora-primary/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-nexora-primary" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Fact-Checked Content</h4>
              <p className="text-sm text-muted-foreground">
                All claims on this page have been verified against our codebase and independent audits. 
                Statistics are sourced from verified industry reports (GitGuardian, NIST, verified breach data). 
                Competitive comparisons are based on publicly available documentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
