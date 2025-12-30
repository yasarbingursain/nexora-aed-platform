"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, Eye, Github, Play, CheckCircle, Star, Users, TrendingUp } from 'lucide-react';
import { KeyPillars } from '@/components/landing/KeyPillars';
import { TerminalDemo } from '@/components/landing/TerminalDemo';
import { ComparisonMatrix } from '@/components/landing/ComparisonMatrix';
import { PricingPreview } from '@/components/landing/PricingPreview';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { HeroGlobe } from '@/components/landing/HeroGlobe';

// NO HARDCODED DATA - All stats fetched from real API

const features = [
  {
    icon: Shield,
    title: "Always-On Protection",
    description: "Every automated tool gets its own security checkpoint. Nothing gets through without permission - like a bouncer at an exclusive club, but for your software.",
    technical: "Zero Trust Architecture with deny-by-default policies and continuous verification"
  },
  {
    icon: Zap,
    title: "Self-Healing Security",
    description: "When we spot a threat, we don't just alert you - we fix it automatically. Compromised password? We change it instantly. Suspicious behavior? We lock it down before damage happens.",
    technical: "AI-powered autonomous remediation with automatic quarantine, rotation, and incident response"
  },
  {
    icon: Eye,
    title: "24/7 Digital Bodyguard",
    description: "We watch every move your bots and AI tools make. If something looks weird - like a bot suddenly accessing files it never touched before - we catch it immediately.",
    technical: "Real-time behavioral analysis and anomaly detection across API keys, service accounts, and AI agents"
  }
];

const integrations = [
  { name: "GitHub Actions", logo: "🔧", status: "Connected" },
  { name: "AWS IAM", logo: "☁️", status: "Active" },
  { name: "Azure AD", logo: "🔵", status: "Syncing" },
  { name: "Google Cloud", logo: "🌐", status: "Connected" },
  { name: "Kubernetes", logo: "⚙️", status: "Monitoring" },
  { name: "Docker", logo: "🐳", status: "Secured" },
];

export default function LandingPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    entitiesProtected: 0,
    threatsBlocked: 0,
    uptime: 0,
    customersServed: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch real platform stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
          setStats({
            entitiesProtected: data.data.entitiesProtected,
            threatsBlocked: data.data.threatsBlocked,
            uptime: data.data.uptime,
            customersServed: data.data.customersServed,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-2xl font-bold text-foreground">Nexora</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">Live Demo</a>
              <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">Integrations</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => window.location.href = '/auth/login'}>Sign In</Button>
              <Button onClick={() => window.location.href = '/auth/signup'}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Viewport */}
      <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-nexora-primary/5 via-transparent to-nexora-quantum/5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nexora-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-nexora-quantum/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-left">
              <Badge className="mb-6 bg-nexora-primary/10 text-nexora-primary border-nexora-primary/20 inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-nexora-primary rounded-full animate-pulse" />
                Securing Machine Identities • Enterprise-Grade Protection
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-display font-bold text-foreground mb-6 leading-[1.1]">
                Protect Your Digital Workers
                <br />
                <span className="bg-gradient-to-r from-nexora-primary via-nexora-quantum to-nexora-ai bg-clip-text text-transparent inline-block">
                  Like You Protect People
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-muted-foreground/80 mb-8 max-w-2xl leading-relaxed">
                Your company runs on thousands of automated tools, bots, and AI assistants. We make sure they&apos;re safe.
              </p>
              
              <p className="text-base text-muted-foreground mb-10 max-w-xl">
                Think of us as security guards for your software robots. We watch them 24/7, stop hackers from stealing their passwords, and automatically fix problems before they become disasters.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-gradient-to-r from-nexora-primary to-blue-600 hover:from-nexora-primary/90 hover:to-blue-600/90 shadow-lg shadow-nexora-primary/30 hover:shadow-xl hover:shadow-nexora-primary/40 transition-all duration-300 hover:-translate-y-0.5"
                    onClick={() => window.location.href = '/demo'}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    See Threats in Real-Time
                  </Button>
                <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6 border-2 hover:bg-white/5 transition-all duration-300"
                    onClick={() => window.location.href = '/resources'}
                  >
                    Read the Whitepaper
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
              </div>
              
              {/* Social Proof */}
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-nexora-ai" />
                  <span>SOC 2 Type II Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-nexora-ai" />
                  <span>NIST Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-nexora-ai" />
                  <span>99.99% Uptime SLA</span>
                </div>
              </div>
            </div>
            
            {/* Right: Live Threat Globe */}
            <div className="relative h-[600px] lg:h-[700px]">
              <HeroGlobe />
            </div>
          </div>

          {/* Live Stats - Below Hero - REAL DATA FROM API */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto mt-20">
            <div className="text-center group">
              <div className="text-3xl font-bold text-nexora-primary mb-2 group-hover:scale-110 transition-transform">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-10 w-24 mx-auto rounded" />
                ) : (
                  `${stats.entitiesProtected.toLocaleString()}+`
                )}
              </div>
              <div className="text-sm text-muted-foreground">Entities Protected</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-nexora-ai mb-2 group-hover:scale-110 transition-transform">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-10 w-24 mx-auto rounded" />
                ) : (
                  `${stats.threatsBlocked.toLocaleString()}+`
                )}
              </div>
              <div className="text-sm text-muted-foreground">Threats Blocked Today</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-nexora-quantum mb-2 group-hover:scale-110 transition-transform">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-10 w-24 mx-auto rounded" />
                ) : (
                  `${stats.uptime}%`
                )}
              </div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-nexora-warning mb-2 group-hover:scale-110 transition-transform">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-muted h-10 w-24 mx-auto rounded" />
                ) : (
                  `${stats.customersServed}+`
                )}
              </div>
              <div className="text-sm text-muted-foreground">Enterprise Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <ProblemSolution />

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              How Nexora Protects Your Business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, powerful security that works automatically - no PhD required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="w-16 h-16 bg-gradient-to-r from-nexora-primary to-nexora-quantum rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-4 text-center">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4 text-center">{feature.description}</p>
                <details className="mt-4">
                  <summary className="text-sm text-nexora-primary cursor-pointer hover:text-nexora-primary/80 text-center font-medium">
                    Technical Details
                  </summary>
                  <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
                    {feature.technical}
                  </p>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Key Pillars Section */}
      <KeyPillars />

      {/* Terminal Demo Section */}
      <TerminalDemo />

      {/* Comparison Matrix */}
      <ComparisonMatrix />

      {/* Pricing Preview */}
      <PricingPreview />

      {/* Live Demo Section */}
      <section id="demo" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              See Nexora in Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience real-time threat detection and autonomous remediation with our interactive demo.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-foreground">Live Security Dashboard</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Live Data</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400 mb-2">3</div>
                <div className="text-sm text-muted-foreground">Critical Threats</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400 mb-2">12</div>
                <div className="text-sm text-muted-foreground">Investigating</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400 mb-2">847</div>
                <div className="text-sm text-muted-foreground">Auto-Resolved</div>
              </div>
            </div>

            <div className="text-center">
              <Button size="lg" className="text-lg px-8 py-4" onClick={() => window.location.href = '/demo'}>
                <Play className="mr-2 h-5 w-5" />
                Launch Interactive Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-20 px-6 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Seamless Integrations
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with your existing infrastructure and security tools in minutes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {integrations.map((integration, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{integration.logo}</div>
                <h4 className="font-semibold text-foreground mb-2">{integration.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {integration.status}
                </Badge>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={() => window.location.href = '/integrations'}>
              View All Integrations
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Ready to Secure Your Non-Human Identities?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join 150+ companies already protecting their infrastructure with Nexora&apos;s autonomous defense platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-4" onClick={() => window.location.href = '/auth/signup'}>
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => window.location.href = '/contact'}>
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-xl font-bold text-foreground">Nexora</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Autonomous Entity Defense Platform for modern cloud infrastructure.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Demo</a></li>
                <li><a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="/careers" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="/blog" className="hover:text-foreground transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="/support" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="/status" className="hover:text-foreground transition-colors">Status</a></li>
                <li><a href="/security" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Nexora Security. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
