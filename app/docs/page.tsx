import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Book, Code, Shield, Zap, FileText, Terminal, Lock, Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Documentation | Nexora AED',
  description: 'Complete documentation for Nexora Autonomous Entity Defense platform. Learn how to deploy, configure, and operate Nexora for non-human identity security.',
};

const sections = [
  {
    title: 'Getting Started',
    icon: Book,
    description: 'Quick start guides and initial setup',
    links: [
      { label: 'Installation', href: '#installation' },
      { label: 'Configuration', href: '#configuration' },
      { label: 'First Steps', href: '#first-steps' },
      { label: 'Architecture Overview', href: '#architecture' },
    ],
  },
  {
    title: 'API Reference',
    icon: Code,
    description: 'Complete API documentation and examples',
    links: [
      { label: 'Authentication', href: '#api-auth' },
      { label: 'Entities API', href: '#api-entities' },
      { label: 'Threats API', href: '#api-threats' },
      { label: 'Policies API', href: '#api-policies' },
    ],
  },
  {
    title: 'Security & Compliance',
    icon: Shield,
    description: 'Security controls and compliance frameworks',
    links: [
      { label: 'Security Model', href: '#security-model' },
      { label: 'Data Boundaries', href: '#data-boundaries' },
      { label: 'Audit Logging', href: '#audit-logging' },
      { label: 'Compliance Mapping', href: '#compliance' },
    ],
  },
  {
    title: 'Integrations',
    icon: Zap,
    description: 'Connect Nexora with your existing tools',
    links: [
      { label: 'Cloud Providers', href: '#cloud-integrations' },
      { label: 'CI/CD Platforms', href: '#cicd-integrations' },
      { label: 'SIEM & SOAR', href: '#siem-integrations' },
      { label: 'Custom Connectors', href: '#custom-integrations' },
    ],
  },
  {
    title: 'Policy Management',
    icon: FileText,
    description: 'Define and enforce security policies',
    links: [
      { label: 'Policy Language', href: '#policy-language' },
      { label: 'Enforcement Modes', href: '#enforcement-modes' },
      { label: 'Policy Templates', href: '#policy-templates' },
      { label: 'Testing Policies', href: '#policy-testing' },
    ],
  },
  {
    title: 'CLI & Automation',
    icon: Terminal,
    description: 'Command-line tools and automation',
    links: [
      { label: 'CLI Installation', href: '#cli-install' },
      { label: 'CLI Commands', href: '#cli-commands' },
      { label: 'Terraform Provider', href: '#terraform' },
      { label: 'GitHub Actions', href: '#github-actions' },
    ],
  },
  {
    title: 'Threat Detection',
    icon: Activity,
    description: 'Behavioral analytics and threat detection',
    links: [
      { label: 'Detection Rules', href: '#detection-rules' },
      { label: 'Anomaly Detection', href: '#anomaly-detection' },
      { label: 'Threat Intelligence', href: '#threat-intel' },
      { label: 'Custom Detections', href: '#custom-detections' },
    ],
  },
  {
    title: 'Advanced Topics',
    icon: Lock,
    description: 'Advanced configuration and deployment',
    links: [
      { label: 'High Availability', href: '#ha-deployment' },
      { label: 'Multi-Tenant Setup', href: '#multi-tenant' },
      { label: 'Post-Quantum Crypto', href: '#pqc' },
      { label: 'Performance Tuning', href: '#performance' },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <MarketingHeader />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to deploy, configure, and operate Nexora for autonomous entity defense.
            </p>
          </div>

          <div className="mb-12 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-start gap-4">
              <Book className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Documentation Status
                </h3>
                <p className="text-muted-foreground mb-3">
                  Comprehensive documentation is currently being finalized. For immediate assistance:
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/contact" className="text-blue-500 hover:text-blue-400 transition-colors">
                    Contact Sales →
                  </Link>
                  <Link href="/demo" className="text-blue-500 hover:text-blue-400 transition-colors">
                    Request Demo →
                  </Link>
                  <Link href="/trust" className="text-blue-500 hover:text-blue-400 transition-colors">
                    Security Documentation →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.title} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {section.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 ml-16">
                    {section.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <h4 className="font-semibold text-foreground mb-2">Quick Start</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get up and running in minutes with our quick start guide
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </Card>
            <Card className="p-6 text-center">
              <h4 className="font-semibold text-foreground mb-2">API Reference</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Complete REST API documentation with examples
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </Card>
            <Card className="p-6 text-center">
              <h4 className="font-semibold text-foreground mb-2">SDK Libraries</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Python, Node.js, Go, and Java client libraries
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </Card>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </main>
  );
}
