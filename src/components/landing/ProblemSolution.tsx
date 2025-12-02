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
      title: "45B Machine IDs Unprotected",
      description: "Traditional security tools can't see or protect AI agents, service accounts, and autonomous entities",
    },
    {
      icon: Bot,
      title: "AI Agents Morph Freely",
      description: "Malicious entities disguise themselves, change behaviors, and evade detection without consequence",
    },
    {
      icon: Lock,
      title: "Quantum Vulnerable",
      description: "Your RSA/ECC encryption will be broken by quantum computers - are you ready for Q-day?",
    },
    {
      icon: Eye,
      title: "No Visibility or Control",
      description: "You can't protect what you can't see. Most orgs have no inventory of non-human identities",
    },
  ];

  const solutions = [
    {
      icon: Shield,
      title: "Every Entity Tracked",
      description: "Complete visibility and lifecycle management for all non-human identities across your infrastructure",
    },
    {
      icon: Zap,
      title: "Morphing Detected",
      description: "ML-powered behavioral analysis detects entity morphing and suspicious activity in real-time",
    },
    {
      icon: Lock,
      title: "Quantum-Ready from Day 1",
      description: "Post-quantum cryptography (PQC) built-in with NIST-approved algorithms - future-proof today",
    },
    {
      icon: CheckCircle,
      title: "Autonomous Response",
      description: "Automatic quarantine, rotation, and remediation in <3 seconds - no human intervention needed",
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
            Your Security Stack Has a Blind Spot
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Traditional tools were built for humans. But 80% of your identities are now non-human - and completely unprotected.
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
                  Only 25% of machine identities protected
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
                  100% of machine identities protected
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
                  ✅ Result: Threats detected and blocked in &lt;3 seconds automatically
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
