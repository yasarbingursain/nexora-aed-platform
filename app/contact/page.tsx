import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Card } from '@/components/ui/Card';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | Nexora AED',
  description: 'Get in touch with Nexora for sales inquiries, technical support, or partnership opportunities. Schedule a demo or architecture walkthrough.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <MarketingHeader />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Ready to secure your non-human identities? Schedule a walkthrough or reach out to our team.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                Send us a message
              </h2>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  >
                    <option value="">Select your role</option>
                    <option value="security">Security / SOC</option>
                    <option value="engineering">Engineering Leadership</option>
                    <option value="platform">Platform / Cloud Security</option>
                    <option value="compliance">Compliance / Audit</option>
                    <option value="executive">Executive</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="interest" className="block text-sm font-medium text-foreground mb-2">
                    I&apos;m interested in *
                  </label>
                  <select
                    id="interest"
                    name="interest"
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  >
                    <option value="">Select an option</option>
                    <option value="demo">Scheduling a demo</option>
                    <option value="walkthrough">Architecture walkthrough</option>
                    <option value="pricing">Pricing information</option>
                    <option value="partnership">Partnership opportunities</option>
                    <option value="support">Technical support</option>
                    <option value="other">Other inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    placeholder="Tell us about your use case or questions..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this form, you agree to our Privacy Policy and Terms of Service.
                </p>
              </form>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      For general inquiries and support
                    </p>
                    <a href="mailto:sales@nexora.security" className="text-blue-500 hover:text-blue-400 transition-colors">
                      sales@nexora.security
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Response Time</h3>
                    <p className="text-muted-foreground text-sm">
                      We typically respond within 1 business day. For urgent security matters, please contact your account team directly.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Headquarters</h3>
                    <p className="text-muted-foreground text-sm">
                      Nexora Security<br />
                      United States
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-blue-500/10 border-blue-500/30">
                <h3 className="font-semibold text-foreground mb-3">
                  Security Vulnerability Reporting
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you&apos;ve discovered a security vulnerability, please report it responsibly.
                </p>
                <a 
                  href="/security" 
                  className="text-blue-500 hover:text-blue-400 transition-colors text-sm font-medium"
                >
                  View Security Reporting Guidelines →
                </a>
              </Card>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Prefer to schedule directly?
            </h2>
            <p className="text-muted-foreground mb-6">
              Book a 15-minute architecture walkthrough or full product demo
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/demo"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Schedule Demo
              </a>
              <a
                href="/trust"
                className="bg-transparent border border-border hover:bg-muted text-foreground font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                View Trust & Security
              </a>
            </div>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </main>
  );
}
