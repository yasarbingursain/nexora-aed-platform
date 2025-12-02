"use client";

import React from 'react';
import { Shield, Zap, Network, Brain, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const pillars = [
  {
    id: 1,
    icon: Shield,
    title: "Autonomous Entity Defense",
    description: "First platform to secure AI agents that create their own credentials. Monitor entity lifecycle from birth to death, detecting morphing attacks in real-time.",
    metric: "45B+",
    metricLabel: "Non-human identities protected",
    gradient: "from-nexora-primary to-blue-500"
  },
  {
    id: 2,
    icon: Lock,
    title: "Quantum-Resilient Security",
    description: "Native post-quantum cryptography with NIST-approved algorithms. Future-proof against Q-day with hybrid classical + quantum-safe encryption.",
    metric: "100%",
    metricLabel: "Quantum-ready from day 1",
    gradient: "from-nexora-quantum to-purple-500"
  },
  {
    id: 3,
    icon: Network,
    title: "NHITI Network",
    description: "First crowd-sourced threat intelligence for machine identities. Share malicious fingerprints and behavioral signatures globally.",
    metric: "1.2M+",
    metricLabel: "Threat indicators shared",
    gradient: "from-nexora-ai to-green-500"
  },
  {
    id: 4,
    icon: Brain,
    title: "Explainable AI",
    description: "Every automated decision comes with clear forensic timeline. Map actions to compliance frameworks with transparent AI reasoning.",
    metric: "100%",
    metricLabel: "Audit trail coverage",
    gradient: "from-nexora-warning to-yellow-500"
  },
  {
    id: 5,
    icon: Zap,
    title: "Autonomous Remediation",
    description: "Real-time automated countermeasures beyond alerts. Quarantine rogue identities and rotate credentials in <3 seconds.",
    metric: "<3s",
    metricLabel: "Average response time",
    gradient: "from-nexora-threat to-pink-500"
  }
];

export function KeyPillars() {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Five Reasons Nexora Will Define the Category
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built from the ground up for the autonomous era. Not an iteration—a revolution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pillars.map((pillar, index) => (
            <PillarCard key={pillar.id} pillar={pillar} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface PillarCardProps {
  pillar: typeof pillars[0];
  index: number;
}

function PillarCard({ pillar, index }: PillarCardProps) {
  const Icon = pillar.icon;
  
  return (
    <div
      className="group relative"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <Card 
        className="h-full p-8 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-xl border border-border/50 
                   hover:border-nexora-primary/30 transition-all duration-300 
                   hover:shadow-[0_0_30px_rgba(0,217,255,0.15)]
                   transform-gpu hover:scale-[1.02]
                   animate-fade-in"
      >
        {/* Icon with gradient background */}
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.gradient} 
                        flex items-center justify-center mb-6 
                        group-hover:scale-110 transition-transform duration-300
                        shadow-lg group-hover:shadow-xl`}>
          <Icon className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-semibold text-foreground mb-4 group-hover:text-nexora-primary transition-colors">
          {pillar.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed mb-6 text-base">
          {pillar.description}
        </p>

        {/* Metric */}
        <div className="mt-auto pt-6 border-t border-border/50">
          <div className={`text-4xl font-bold bg-gradient-to-r ${pillar.gradient} bg-clip-text text-transparent mb-2`}>
            {pillar.metric}
          </div>
          <div className="text-sm text-muted-foreground">
            {pillar.metricLabel}
          </div>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-nexora-primary/0 to-nexora-primary/0 
                        group-hover:from-nexora-primary/5 group-hover:to-transparent 
                        transition-all duration-300 pointer-events-none" />
      </Card>
    </div>
  );
}
