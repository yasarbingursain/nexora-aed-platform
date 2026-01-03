"use client";

import React from 'react';
import { Shield, Code, FileCheck, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Stakeholder {
  icon: React.ElementType;
  title: string;
  role: string;
  benefits: string[];
  cta: string;
  ctaLink: string;
}

const stakeholders: Stakeholder[] = [
  {
    icon: Shield,
    title: "For Security Leaders",
    role: "CISOs & Security Directors",
    benefits: [
      "Reduce identity-related breach risk by 95%",
      "Quantifiable ROI with automated incident response",
      "SOC 2 Type II certified, NIST-compliant platform",
      "Board-ready security posture reporting",
      "70% reduction in secret management overhead"
    ],
    cta: "Schedule Executive Briefing",
    ctaLink: "/contact?role=ciso"
  },
  {
    icon: Code,
    title: "For Engineering Teams",
    role: "DevOps & SecOps Engineers",
    benefits: [
      "Zero disruption - integrates with existing CI/CD",
      "Lightweight deployment via Kubernetes/Docker",
      "API-first design with comprehensive SDKs",
      "Negligible performance impact (<1% overhead)",
      "Eliminates alert fatigue with precise, explainable actions"
    ],
    cta: "View Technical Documentation",
    ctaLink: "/docs"
  },
  {
    icon: FileCheck,
    title: "For Compliance Teams",
    role: "GRC & Procurement Officers",
    benefits: [
      "SOC 2 Type II, ISO 27001 ready",
      "Automated compliance evidence collection",
      "Maps to NIST, GDPR, zero-trust frameworks",
      "Complete audit trails for every action",
      "Transparent pricing with enterprise SLAs"
    ],
    cta: "Download Compliance Brief",
    ctaLink: "/resources?type=compliance"
  },
  {
    icon: TrendingUp,
    title: "For Business Leaders",
    role: "CTOs & VPs of Engineering",
    benefits: [
      "Prevent costly breaches (avg. $4.45M per incident)",
      "Scale security without scaling headcount",
      "Faster time-to-market with automated security",
      "Competitive advantage with quantum-safe infrastructure",
      "Proven ROI in first 90 days"
    ],
    cta: "See ROI Calculator",
    ctaLink: "/roi"
  }
];

export function StakeholderSection() {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Built for Your Entire Team
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Nexora addresses the unique priorities of every stakeholder in your security buying committee—from hands-on engineers to C-level executives.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {stakeholders.map((stakeholder, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-nexora-primary to-nexora-quantum rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <stakeholder.icon className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-1">
                    {stakeholder.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stakeholder.role}
                  </p>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {stakeholder.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                    <svg 
                      className="w-5 h-5 text-nexora-ai flex-shrink-0 mt-0.5" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span className="leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              <a
                href={stakeholder.ctaLink}
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-nexora-primary/10 text-nexora-primary rounded-lg font-medium hover:bg-nexora-primary hover:text-white transition-all duration-200 border border-nexora-primary/20 hover:border-nexora-primary"
              >
                {stakeholder.cta}
                <svg 
                  className="w-4 h-4 ml-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </a>
            </Card>
          ))}
        </div>

        {/* Unified Value Proposition */}
        <div className="mt-16 text-center max-w-4xl mx-auto p-8 bg-gradient-to-r from-nexora-primary/5 via-nexora-quantum/5 to-nexora-ai/5 rounded-2xl border border-nexora-primary/10">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            One Platform, Every Stakeholder Wins
          </h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Security leaders get risk reduction and compliance. Engineers get seamless integration and less toil. 
            Compliance teams get audit-ready evidence. Business leaders get ROI and competitive advantage. 
            <span className="text-foreground font-semibold"> Nexora aligns your entire organization around machine identity security.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
