"use client";

import React from 'react';
import { AlertTriangle, Shield, CheckCircle, X, Zap, Lock, Eye, Bot, Play } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export const ProblemSolution: React.FC = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Machine Identities Outnumber Humans",
      description: "API keys, service accounts, and AI agents now vastly outnumber human identities—but traditional tools weren't built for them",
    },
    {
      icon: Bot,
      title: "Breaches via Service Accounts Rising",
      description: "Snowflake (165 orgs), Treasury (via BeyondTrust), Dropbox Sign—compromised machine credentials are the new attack vector",
    },
    {
      icon: Lock,
      title: "23.8M Secrets Leaked in 2024",
      description: "GitGuardian found 23.8M secrets on GitHub, with 70% of 2022 secrets still active today—a ticking time bomb",
    },
    {
      icon: Eye,
      title: "200+ Days to Detect Breaches",
      description: "Without behavioral monitoring, compromised machine identities operate undetected for months",
    },
  ];

  const solutions = [
    {
      icon: Shield,
      title: "Complete Lifecycle Tracking",
      description: "Discover and monitor all non-human identities—AI agents, service accounts, API keys—across cloud, SaaS, and DevOps",
    },
    {
      icon: Zap,
      title: "Behavioral Anomaly Detection",
      description: "ML-powered analysis using Isolation Forest and One-Class SVM to detect suspicious activity patterns",
    },
    {
      icon: Lock,
      title: "NIST-Approved Post-Quantum Crypto",
      description: "Future-proof sensitive data with Kyber, Dilithium, and SPHINCS+ algorithms—ready for the quantum era",
    },
    {
      icon: CheckCircle,
      title: "Automated Response with Safeguards",
      description: "Credential rotation and network quarantine with dry-run mode and human approval workflows built-in",
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-red-500/10 text-red-400 border-red-500/20">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Critical Security Gap
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Machine Identities Are Your Biggest Security Gap
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Traditional security tools were built for human identities. But your infrastructure now runs on millions of machine identities—and they&apos;re the new attack vector.
          </p>
        </div>

        {/* Split Screen Comparison */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* WITHOUT NEXORA */}
          <Card className="p-8 border-2 border-red-500/20 bg-red-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Without Nexora</h3>
                  <p className="text-sm text-muted-foreground">Traditional Security Approach</p>
                </div>
              </div>

              {/* Visualization: Gaps in coverage */}
              <div className="mb-8 p-6 bg-nexora-darker/50 rounded-lg border border-red-500/20">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-12 rounded ${
                        i % 3 === 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-700/30'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-center text-red-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Most machine identities lack monitoring
                </p>
              </div>

              <div className="space-y-4">
                {problems.map((problem, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-nexora-darker/30 rounded-lg border border-red-500/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <problem.icon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{problem.title}</h4>
                      <p className="text-sm text-muted-foreground">{problem.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 font-semibold">
                  ⚠️ Result: Breaches go undetected for 200+ days on average
                </p>
              </div>
            </div>
          </Card>

          {/* WITH NEXORA */}
          <Card className="p-8 border-2 border-nexora-ai/30 bg-nexora-ai/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nexora-ai/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-nexora-ai/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-nexora-ai" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">With Nexora</h3>
                  <p className="text-sm text-muted-foreground">Autonomous Entity Defense</p>
                </div>
              </div>

              {/* Visualization: Complete coverage */}
              <div className="mb-8 p-6 bg-nexora-darker/50 rounded-lg border border-nexora-ai/20">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded bg-nexora-ai/20 border border-nexora-ai/30 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nexora-ai/30 to-transparent animate-shimmer" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center text-nexora-ai">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Comprehensive machine identity coverage
                </p>
              </div>

              <div className="space-y-4">
                {solutions.map((solution, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-nexora-darker/30 rounded-lg border border-nexora-ai/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-nexora-ai/10 flex items-center justify-center">
                      <solution.icon className="w-5 h-5 text-nexora-ai" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{solution.title}</h4>
                      <p className="text-sm text-muted-foreground">{solution.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-nexora-ai/10 border border-nexora-ai/20 rounded-lg">
                <p className="text-sm text-nexora-ai font-semibold">
                  ✅ Result: Rapid threat detection with automated response workflows and human oversight
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-6">
            Don&apos;t wait for a breach. Secure your non-human identities today.
          </p>
          <Link href="/demo">
            <Button size="lg" className="text-lg px-8 py-6">
              <Play className="mr-2 h-5 w-5" />
              See the Difference Live
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
