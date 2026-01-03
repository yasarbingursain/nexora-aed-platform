"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'pricing' | 'security';
}

const faqs: FAQItem[] = [
  {
    question: "What is machine identity security?",
    answer: "Machine identity security protects non-human accounts like API keys, service accounts, bot credentials, and AI agents. These automated identities outnumber human users 45:1 in modern enterprises and are prime targets for attackers. Nexora provides autonomous protection specifically designed for these machine identities.",
    category: "general"
  },
  {
    question: "How does Nexora detect compromised API keys?",
    answer: "Nexora uses ML-powered behavioral analysis to detect anomalies in real-time. We monitor access patterns, geographic locations, usage frequency, and resource access. When an API key exhibits suspicious behavior—like accessing data it never touched before or originating from an unusual location—our AI flags and can automatically quarantine it in under 3 seconds.",
    category: "technical"
  },
  {
    question: "What is autonomous remediation?",
    answer: "Autonomous remediation means Nexora automatically fixes security threats without human intervention. When we detect a compromised credential, we can instantly rotate keys, quarantine identities, revoke access, and isolate affected resources across AWS, Azure, GCP, and Kubernetes—all in under 3 seconds. Every action is logged with full explainability.",
    category: "technical"
  },
  {
    question: "Is Nexora SOC 2 compliant?",
    answer: "Yes, Nexora is SOC 2 Type II certified. We implement comprehensive security controls including encryption at rest and in transit, role-based access control (RBAC), audit logging, and continuous monitoring. Our platform also helps you achieve compliance by mapping all actions to frameworks like NIST, ISO 27001, and GDPR.",
    category: "security"
  },
  {
    question: "What is post-quantum cryptography (PQC)?",
    answer: "Post-quantum cryptography uses NIST-approved algorithms (ML-KEM, ML-DSA, SLH-DSA) that are resistant to attacks from quantum computers. While quantum computers capable of breaking current encryption don't exist yet, Nexora future-proofs your security by implementing quantum-safe encryption today, protecting your secrets beyond 'Q-Day'.",
    category: "security"
  },
  {
    question: "How much does Nexora cost?",
    answer: "Nexora starts at $1,500/month for the Starter plan (up to 1,000 identities). Professional plans start at $5,000/month (up to 10,000 identities), and Enterprise plans are custom-priced based on your needs. All plans include 24/7 support, SOC integrations, and autonomous remediation. Contact sales for volume discounts.",
    category: "pricing"
  },
  {
    question: "Does Nexora integrate with my existing security tools?",
    answer: "Yes. Nexora integrates with major SIEM platforms (Splunk, QRadar, Microsoft Sentinel, Elastic), ticketing systems (ServiceNow, Jira), cloud providers (AWS, Azure, GCP), and notification tools (Slack). We complement your existing IAM and vault solutions rather than replacing them.",
    category: "technical"
  },
  {
    question: "How long does deployment take?",
    answer: "Most customers are fully operational within 1-2 weeks. Our lightweight agents deploy via Kubernetes, Docker, or cloud-native integrations with minimal configuration. We provide dedicated onboarding support, and there's no need to rip out existing tools—Nexora augments your current security stack.",
    category: "general"
  },
  {
    question: "What is the NHITI threat intelligence network?",
    answer: "NHITI (Non-Human Identity Threat Intelligence) is a privacy-preserving, crowd-sourced threat feed for machine credentials. Nexora customers anonymously share indicators of attacks (malicious fingerprints, behavioral signatures) using k-anonymity and differential privacy. This collective defense helps all users detect threats earlier.",
    category: "technical"
  },
  {
    question: "Can I trust AI to make security decisions?",
    answer: "Nexora's AI is fully explainable—every decision includes a forensic timeline showing exactly why the action was taken, which policies were triggered, and what data was analyzed. You can configure approval workflows for high-risk actions, set guardrails, and maintain full audit trails. No black boxes.",
    category: "security"
  },
  {
    question: "What happens if Nexora detects a false positive?",
    answer: "Our ML models are tuned to minimize false positives, but if one occurs, you can instantly whitelist the activity and provide feedback. The system learns from your corrections. All autonomous actions are reversible, and you can configure dry-run mode to review actions before they execute.",
    category: "general"
  },
  {
    question: "Does Nexora slow down my CI/CD pipeline?",
    answer: "No. Nexora's agents have negligible performance impact (<1% overhead). We use asynchronous monitoring and don't block your workflows. Security checks happen in parallel, and our sub-3-second response time means threats are contained faster than manual processes.",
    category: "technical"
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General' },
    { id: 'technical', label: 'Technical' },
    { id: 'security', label: 'Security' },
    { id: 'pricing', label: 'Pricing' }
  ];

  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  return (
    <section id="faq" className="py-20 px-6 bg-card/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about machine identity security
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-nexora-primary text-white shadow-lg'
                  : 'bg-card text-muted-foreground hover:bg-card/80 border border-border'
              }`}
              aria-pressed={selectedCategory === category.id}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => (
            <Card 
              key={index} 
              className="overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-card/50 transition-colors"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </h3>
                <ChevronDown 
                  className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              
              {openIndex === index && (
                <div 
                  id={`faq-answer-${index}`}
                  className="px-6 pb-5 pt-2 text-muted-foreground leading-relaxed border-t border-border/50"
                  role="region"
                >
                  {faq.answer}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-nexora-primary/10 to-nexora-quantum/10 rounded-xl border border-nexora-primary/20">
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Still have questions?
          </h3>
          <p className="text-muted-foreground mb-6">
            Our security experts are here to help. Schedule a personalized demo or contact our team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-nexora-primary text-white rounded-lg font-medium hover:bg-nexora-primary/90 transition-colors"
            >
              Contact Sales
            </a>
            <a 
              href="/docs" 
              className="inline-flex items-center justify-center px-6 py-3 bg-card text-foreground rounded-lg font-medium border border-border hover:bg-card/80 transition-colors"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
