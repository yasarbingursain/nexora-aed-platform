/**
 * Custom App Component for Web Vitals Reporting
 * 
 * This file enables Next.js Web Vitals tracking
 * Reports metrics to analytics endpoint
 */

import type { AppProps } from 'next/app'
import { reportWebVitals } from './analytics'

export { reportWebVitals }

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
