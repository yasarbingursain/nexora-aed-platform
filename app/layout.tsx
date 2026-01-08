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
  title: 'Machine Identity Security Platform | Non-Human Identity Protection | Nexora AED',
  description: 'Stop API key breaches in <3 seconds with AI-powered machine identity protection. Secure non-human identities, service accounts & AI agents. SOC 2 Type II certified. Enterprise-ready autonomous entity defense platform with post-quantum cryptography.',
  keywords: [
    'machine identity security',
    'non-human identity management',
    'API key security',
    'service account protection',
    'AI agent security',
    'post-quantum cryptography',
    'autonomous entity defense',
    'zero-trust machine identities',
    'credential breach prevention',
    'autonomous remediation',
    'ML anomaly detection',
    'SIEM integration',
    'SOC 2 compliance',
    'identity threat detection',
    'nexora aed platform',
    'machine credential security',
    'bot identity protection',
    'API token management',
    'quantum-safe encryption',
    'explainable AI security'
  ],
  authors: [{ name: 'Nexora Security' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    title: 'Machine Identity Security Platform | Nexora AED',
    description: 'Autonomous protection for API keys, service accounts, and AI agents. Stop breaches in <3 seconds with quantum-safe security.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Nexora Security',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Machine Identity Security Platform | Nexora AED',
    description: 'Autonomous protection for API keys, service accounts, and AI agents. Stop breaches in <3 seconds.',
    creator: '@NexoraSecurity',
  },
  alternates: {
    canonical: 'https://nexora.security',
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

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="color-scheme" content="dark light" />
        <meta property="csp-nonce" content={nonce} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Nexora AED Platform",
              "applicationCategory": "SecurityApplication",
              "operatingSystem": "Web, Cloud",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "1500",
                "highPrice": "15000",
                "priceCurrency": "USD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "1500",
                  "priceCurrency": "USD",
                  "unitText": "MONTH"
                }
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "150",
                "bestRating": "5"
              },
              "description": "Enterprise machine identity security platform with autonomous threat detection and remediation for API keys, service accounts, and AI agents.",
              "featureList": [
                "Post-Quantum Cryptography (PQC)",
                "Autonomous Remediation in <3 seconds",
                "Explainable AI decisions",
                "NHITI Threat Intelligence Network",
                "SOC 2 Type II Certified",
                "Multi-cloud support (AWS, Azure, GCP)"
              ],
              "provider": {
                "@type": "Organization",
                "name": "Nexora Security",
                "url": "https://nexora.security"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Nexora Security",
              "url": "https://nexora.security",
              "logo": "https://nexora.security/logo.png",
              "description": "Leading provider of autonomous entity defense solutions for machine identity security",
              "sameAs": [
                "https://twitter.com/NexoraSecurity",
                "https://linkedin.com/company/nexora-security",
                "https://github.com/nexora-security"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Sales",
                "email": "sales@nexora.security"
              }
            })
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress MetaMask and other browser extension errors
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.includes('MetaMask') || e.message.includes('chrome-extension'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && (e.reason.message.includes('MetaMask') || e.reason.message.includes('chrome-extension'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
            `,
          }}
        />
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
