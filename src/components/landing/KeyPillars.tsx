"use client";

import React from 'react';
import { Shield, Zap, Network, Brain, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const pillars = [
  {
    id: 1,
    icon: Shield,
    title: "Machine Identity Lifecycle",
    description: "Comprehensive discovery and tracking for AI agents, service accounts, and API keys across cloud, SaaS, and DevOps environments.",
    metric: "Multi-Cloud",
    metricLabel: "AWS, Azure, GCP support",
    gradient: "from-nexora-primary to-blue-500"
  },
  {
    id: 2,
    icon: Lock,
    title: "Post-Quantum Cryptography",
    description: "NIST-approved algorithms (Kyber, Dilithium, SPHINCS+) to future-proof sensitive data against quantum computing threats.",
    metric: "NIST FIPS",
    metricLabel: "203, 204, 205 compliant",
    gradient: "from-nexora-quantum to-purple-500"
  },
  {
    id: 3,
    icon: Brain,
    title: "Explainable AI",
    description: "SHAP, LIME, and counterfactual explanations for every security decision—built for GDPR and EU AI Act compliance.",
    metric: "Full Transparency",
    metricLabel: "Every decision explained",
    gradient: "from-nexora-warning to-yellow-500"
  },
  {
    id: 4,
    icon: Zap,
    title: "Automated Response",
    description: "Credential rotation and network quarantine with dry-run mode by default and human approval workflows for high-risk actions.",
    metric: "Human-in-Loop",
    metricLabel: "Safe automation",
    gradient: "from-nexora-threat to-pink-500"
  },
  {
    id: 5,
    icon: Network,
    title: "Behavioral Analysis",
    description: "ML-powered anomaly detection using Isolation Forest, One-Class SVM, and autoencoders to identify suspicious patterns.",
    metric: "ML-Powered",
    metricLabel: "Advanced detection",
    gradient: "from-nexora-ai to-green-500"
  }
];

export function KeyPillars() {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            What Makes Nexora Different
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Purpose-built for machine identity security with post-quantum cryptography, explainable AI, and human-in-the-loop automation.
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
