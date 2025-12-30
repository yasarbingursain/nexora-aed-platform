"use client";

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { FileText, Download, ExternalLink, BookOpen, Shield, Lock, CheckCircle } from 'lucide-react';

export default function ResourcesPage() {
  const whitepapers = [
    {
      id: 1,
      title: "Autonomous Entity Defense: A New Paradigm in Non-Human Identity Security",
      description: "Comprehensive analysis of AED architecture, threat detection mechanisms, and autonomous remediation capabilities for enterprise NHI security.",
      date: "December 2024",
      pages: 42,
      category: "Technical Architecture",
      downloadUrl: "/whitepapers/nexora-aed-architecture.pdf",
      references: [
        "NIST Cybersecurity Framework 2.0",
        "MITRE ATT&CK Framework for Enterprise",
        "OWASP Top 10 API Security Risks 2023"
      ]
    },
    {
      id: 2,
      title: "Machine Learning for Identity Anomaly Detection: Real-Time Threat Intelligence",
      description: "Research on ML-driven behavioral analysis, anomaly detection algorithms, and explainable AI for identity threat detection in cloud-native environments.",
      date: "November 2024",
      pages: 38,
      category: "Machine Learning",
      downloadUrl: "/whitepapers/nexora-ml-anomaly-detection.pdf",
      references: [
        "NIST AI Risk Management Framework",
        "ISO/IEC 23894 AI Risk Management",
        "MITRE ATLAS - Adversarial Threat Landscape for AI"
      ]
    },
    {
      id: 3,
      title: "Zero Trust Architecture for Non-Human Identities",
      description: "Implementation guide for zero trust principles in NHI management, including continuous verification, least privilege access, and micro-segmentation.",
      date: "October 2024",
      pages: 35,
      category: "Security Framework",
      downloadUrl: "/whitepapers/nexora-zero-trust-nhi.pdf",
      references: [
        "NIST SP 800-207 Zero Trust Architecture",
        "CISA Zero Trust Maturity Model",
        "NSA Zero Trust Guidance"
      ]
    },
    {
      id: 4,
      title: "Compliance Automation: Meeting DORA, SOC 2, and ISO 27001 Requirements",
      description: "Automated compliance mapping, evidence collection, and continuous monitoring for regulatory frameworks including DORA ICT, SOC 2 Type II, and ISO 27001.",
      date: "September 2024",
      pages: 45,
      category: "Compliance",
      downloadUrl: "/whitepapers/nexora-compliance-automation.pdf",
      references: [
        "EU DORA Regulation (EU) 2022/2554",
        "AICPA SOC 2 Trust Services Criteria",
        "ISO/IEC 27001:2022 Information Security"
      ]
    },
    {
      id: 5,
      title: "Threat Intelligence Integration: OSINT and Commercial Feeds",
      description: "Architecture for real-time threat intelligence aggregation from NIST NVD, MITRE ATT&CK, AlienVault OTX, and commercial threat feeds.",
      date: "August 2024",
      pages: 31,
      category: "Threat Intelligence",
      downloadUrl: "/whitepapers/nexora-threat-intelligence.pdf",
      references: [
        "NIST National Vulnerability Database",
        "MITRE ATT&CK Knowledge Base",
        "STIX/TAXII 2.1 Specification"
      ]
    }
  ];

  const researchPapers = [
    {
      title: "Behavioral Analysis of Service Account Compromise Patterns",
      authors: "Nexora Security Research Team",
      journal: "Journal of Cybersecurity Research",
      year: 2024,
      doi: "10.1000/jcr.2024.001"
    },
    {
      title: "Autonomous Remediation in Cloud-Native Environments",
      authors: "Nexora Engineering Team",
      journal: "IEEE Security & Privacy",
      year: 2024,
      doi: "10.1109/MSP.2024.001"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Resources & Whitepapers</h1>
              <p className="text-muted-foreground">Technical documentation, research papers, and compliance guides</p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Whitepapers Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-nexora-primary" />
            <h2 className="text-3xl font-bold text-foreground">Technical Whitepapers</h2>
          </div>

          <div className="grid gap-6">
            {whitepapers.map((paper) => (
              <Card key={paper.id} className="p-6 hover:border-nexora-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-nexora-primary/10 text-nexora-primary border-nexora-primary/20">
                        {paper.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{paper.date}</span>
                      <span className="text-sm text-muted-foreground">• {paper.pages} pages</span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-3">{paper.title}</h3>
                    <p className="text-muted-foreground mb-4">{paper.description}</p>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-2">Referenced Standards:</p>
                      <div className="flex flex-wrap gap-2">
                        {paper.references.map((ref, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = paper.downloadUrl;
                          link.download = `${paper.title}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => window.open(paper.downloadUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Online
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="w-32 h-40 bg-gradient-to-br from-nexora-primary/20 to-nexora-quantum/20 rounded-lg border border-nexora-border flex items-center justify-center">
                      <FileText className="w-12 h-12 text-nexora-primary" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Research Papers Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-8 h-8 text-nexora-quantum" />
            <h2 className="text-3xl font-bold text-foreground">Published Research</h2>
          </div>

          <div className="grid gap-4">
            {researchPapers.map((paper, idx) => (
              <Card key={idx} className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{paper.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{paper.authors}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{paper.journal}</span>
                  <span>•</span>
                  <span>{paper.year}</span>
                  <span>•</span>
                  <span className="font-mono">DOI: {paper.doi}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Compliance Documentation */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-nexora-ai" />
            <h2 className="text-3xl font-bold text-foreground">Compliance & Certifications</h2>
          </div>

          <Card className="p-8 bg-gradient-to-br from-nexora-primary/5 to-nexora-quantum/5 border-nexora-border">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-nexora-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-8 h-8 text-nexora-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">SOC 2 Type II</h3>
                <p className="text-sm text-muted-foreground">Certified security controls and continuous monitoring</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-nexora-quantum/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-nexora-quantum" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">ISO 27001</h3>
                <p className="text-sm text-muted-foreground">Information security management system certified</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-nexora-ai/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-nexora-ai" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">DORA Compliant</h3>
                <p className="text-sm text-muted-foreground">EU Digital Operational Resilience Act ready</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
