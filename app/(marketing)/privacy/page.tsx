import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata = {
  title: 'Privacy Policy | Nexora',
  description: 'Learn how Nexora collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      
      <main className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl font-bold text-foreground mb-6">Privacy Policy</h1>
          
          <p className="text-muted-foreground mb-8">
            <strong>Effective date:</strong> January 2026
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">1. Information we collect</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Contact information you provide (e.g., name, email) when requesting demos or pricing</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Basic usage and diagnostic data to operate and secure the service</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Security event metadata necessary for detection and audit (when applicable)</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">2. How we use information</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Provide and operate the service</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Secure the platform and detect misuse</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Respond to support and sales requests</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>Improve reliability and product performance</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">3. How we share information</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>We do not sell personal data.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>We share only with service providers required to operate the service, under contractual obligations.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span>We may disclose information when legally required.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">4. Data retention</h2>
            <p className="text-muted-foreground">
              We retain information only as long as needed for operational, security, and legal purposes. 
              Retention periods may vary by plan and configuration.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">5. Security</h2>
            <p className="text-muted-foreground">
              We apply technical and organizational measures intended to protect data. 
              No method of transmission or storage is guaranteed 100% secure.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">6. Your choices</h2>
            <p className="text-muted-foreground">
              You may request access, correction, or deletion of your information, subject to legal and operational constraints.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, please contact us through the information provided on our website.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
