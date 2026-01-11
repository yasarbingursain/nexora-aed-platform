import Link from 'next/link';

export function MarketingFooter() {
  return (
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
              Autonomous Entity Defense for Non-Human Identities and AI Agents
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#product" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="/#use-cases" className="hover:text-foreground transition-colors">Use Cases</a></li>
              <li><a href="/#integrations" className="hover:text-foreground transition-colors">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Trust</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/trust" className="hover:text-foreground transition-colors">Trust & Security</Link></li>
              <li><Link href="/security" className="hover:text-foreground transition-colors">Security Reporting</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/status" className="hover:text-foreground transition-colors">Status</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Nexora Security. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
