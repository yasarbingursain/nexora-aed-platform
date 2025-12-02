import './globals.css'
import type { Metadata } from 'next'
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
  title: 'Nexora - Autonomous Entity Defense Platform',
  description: 'Enterprise-grade cybersecurity platform for securing non-human identities, AI agents, API keys, and service accounts with real-time threat detection and autonomous remediation.',
  keywords: ['cybersecurity', 'AI security', 'API security', 'threat detection', 'autonomous defense'],
  authors: [{ name: 'Nexora Security' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Nexora - Autonomous Entity Defense Platform',
    description: 'Enterprise-grade cybersecurity platform for securing non-human identities',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexora - Autonomous Entity Defense Platform',
    description: 'Enterprise-grade cybersecurity platform for securing non-human identities',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="color-scheme" content="dark light" />
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
