import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Trust & Security | Nexora',
  description: 'Learn about Nexora\'s approach to security, privacy, and operational integrity.',
};

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      
      <main className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl font-bold text-foreground mb-6">Trust & Security</h1>
          
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Nexora is designed for teams that require clear controls, strong boundaries, and evidence-grade auditability. 
            This page summarizes how we approach security, privacy, and operational integrity.
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Data boundaries and tenant isolation</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Tenant data is logically isolated and access is governed by least-privilege controls.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Administrative access is restricted and monitored.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Customer data is never used for unrelated purposes without explicit agreement.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Encryption and transport security</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Encryption in transit is enforced using modern TLS configurations.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Sensitive secrets are not stored in frontend code or shipped to clients.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Auditability and evidence</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Security-relevant actions are recorded with traceability (who/what, when, what changed, and why when provided).</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Audit views and exports are intended to support investigations and compliance workflows.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Secure development practices</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Code changes are reviewed and tested prior to release.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Dependencies are monitored and updated to reduce exposure to known vulnerabilities.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Security issues are triaged and addressed based on severity and exploitability.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">SOC 2 and compliance alignment</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Nexora is designed to support SOC 2 readiness and common control frameworks.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Certification and formal compliance status are available under NDA where applicable.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Responsible disclosure</h2>
            <p className="text-muted-foreground mb-4">
              If you believe you&apos;ve found a security issue, report it through our Security page. 
              We investigate promptly and coordinate responsibly.
            </p>
          </section>

          <div className="flex gap-4 pt-8 border-t border-border">
            <Link href="/security">
              <Button variant="outline">Security Reporting</Button>
            </Link>
            <Link href="/privacy">
              <Button variant="outline">Privacy Policy</Button>
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
