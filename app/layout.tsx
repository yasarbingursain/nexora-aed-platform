import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import { ConsentProvider } from '@/providers/ConsentProvider'
import { ConsentBanner } from '@/components/ConsentBanner'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { Toaster } from 'sonner'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nexora AED | Autonomous Entity Defense for Non-Human Identities',
  description: 'Nexora is an Autonomous Entity Defense platform for non-human identities—API tokens, service accounts, bots, and AI agents. Detect abnormal behavior, enforce least-privilege policies, and execute safe remediation with evidence-grade audit trails.',
  keywords: [
    'non-human identity security',
    'machine identity security',
    'API key security',
    'service account protection',
    'AI agent security',
    'identity threat detection and response',
    'ITDR',
    'autonomous remediation',
    'zero trust for machine identities',
    'post-quantum cryptography',
    'PQC',
    'explainable AI security',
    'evidence-grade audit logs',
    'multi-tenant RLS security',
    'credential rotation',
    'behavioral anomaly detection',
    'policy enforcement',
    'SOC 2 aligned controls',
    'compliance-ready security'
  ],
  authors: [{ name: 'Nexora Security' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  alternates: {
    canonical: 'https://nexora.security',
  },
  openGraph: {
    title: 'Nexora AED | Autonomous Entity Defense',
    description: 'Autonomous defense for non-human identities: inventory, behavioral detection, policy enforcement, safe containment, and evidence-grade explainability.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Nexora Security',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexora AED | Autonomous Entity Defense',
    description: 'Autonomous defense for non-human identities with evidence-grade audit trails and compliance-ready explainability.',
    creator: '@NexoraSecurity',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get CSP nonce from middleware for proper inline script execution
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';
  const isProd = process.env.NODE_ENV === 'production';

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nexora Security',
    url: 'https://nexora.security',
    description: 'Nexora builds Autonomous Entity Defense (AED) for non-human identities: API tokens, service accounts, bots, and AI agents.',
    sameAs: [
      'https://twitter.com/NexoraSecurity',
      'https://linkedin.com/company/nexora-security',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      email: 'sales@nexora.security',
    },
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Nexora AED Platform',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web, Cloud',
    description: 'Autonomous Entity Defense platform for non-human identities with behavioral analytics, policy enforcement, safe remediation workflows, and evidence-grade audit trails.',
    provider: {
      '@type': 'Organization',
      name: 'Nexora Security',
      url: 'https://nexora.security',
    },
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="color-scheme" content="dark light" />
        <meta property="csp-nonce" content={nonce} />

        {/* JSON-LD (clean, non-manipulative) */}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />

        {/* Only in non-prod: avoid masking real production errors */}
        {!isProd && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // Dev-only: reduce noise from browser extensions.
                window.addEventListener('error', function(e) {
                  if (e.message && (e.message.includes('MetaMask') || e.message.includes('chrome-extension'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  const msg = e?.reason?.message || '';
                  if (msg.includes('MetaMask') || msg.includes('chrome-extension')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                });
              `,
            }}
          />
        )}
      </head>
      <body 
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <ConsentProvider>
          <AnalyticsProvider />
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
          <ConsentBanner />
          <Toaster 
            position="top-right" 
            theme="dark"
            richColors
            closeButton
            duration={4000}
          />
        </ConsentProvider>
      </body>
    </html>
  )
}
