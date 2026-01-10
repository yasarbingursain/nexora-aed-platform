import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Badge } from '@/components/ui/Badge';

export const metadata = {
  title: 'Status | Nexora',
  description: 'Current operational status of Nexora services.',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      
      <main className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl font-bold text-foreground mb-6">Status</h1>

          <section className="mb-12">
            <div className="p-6 border border-border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Current Status</h2>
                <Badge variant="default" className="bg-green-600">Operational</Badge>
              </div>
              <p className="text-muted-foreground">
                All systems are currently operational. No known issues at this time.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Recent Incidents</h2>
            <div className="p-6 border border-border rounded-lg bg-card">
              <p className="text-muted-foreground">No recent incidents to report.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Planned Maintenance</h2>
            <div className="p-6 border border-border rounded-lg bg-card">
              <p className="text-muted-foreground">No planned maintenance scheduled at this time.</p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-foreground mb-4">Contact Support</h2>
            <p className="text-muted-foreground">
              If you&apos;re experiencing issues, please contact our support team through your account dashboard 
              or via the contact information provided on our website.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
