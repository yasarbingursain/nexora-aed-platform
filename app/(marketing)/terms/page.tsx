import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata = {
  title: 'Terms of Service | Nexora',
  description: 'Terms and conditions for using Nexora services.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      
      <main className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl font-bold text-foreground mb-6">Terms of Service</h1>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">1. Service description</h2>
            <p className="text-muted-foreground">
              Nexora provides a security platform designed to monitor, govern, and respond to risks associated 
              with non-human identities and autonomous systems.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">2. Acceptable use</h2>
            <p className="text-muted-foreground mb-4">You may not use the service to:</p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Violate laws or regulations</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Attempt unauthorized access to systems</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Interfere with service availability</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Upload malware or abusive content</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">3. Customer responsibilities</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>You are responsible for user accounts, access permissions, and safeguarding credentials.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>You must ensure you have rights to connect systems and data sources you integrate.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">4. Security and warranties</h2>
            <p className="text-muted-foreground">
              The service is provided &quot;as is&quot; except as agreed in a signed contract. 
              Nexora does not guarantee that all threats will be detected or prevented.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">5. Limitation of liability</h2>
            <p className="text-muted-foreground">
              Standard limitation framework applies. Final terms should be reviewed by counsel before enterprise contracts.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">6. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend accounts for security risk, abuse, or non-payment.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">7. Changes</h2>
            <p className="text-muted-foreground">
              We may update terms; significant changes will be communicated.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
