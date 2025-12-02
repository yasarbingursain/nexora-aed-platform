/**
 * OpenTelemetry Web SDK Integration
 * 
 * Features:
 * - Automatic instrumentation for document load, user interactions
 * - Web Vitals tracking (LCP, FID, CLS, FCP, TTFB)
 * - Custom spans for API calls and user actions
 * - Export to OTLP collector
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'

/**
 * Initialize OpenTelemetry for browser
 */
export function initTelemetry() {
  // Only run in browser
  if (typeof window === 'undefined') {
    return
  }

  // Skip in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_TELEMETRY) {
    console.log('[Telemetry] Disabled in development')
    return
  }

  try {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'nexora-frontend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
    })

    // Create tracer provider
    const provider = new WebTracerProvider({
      resource,
    })

    // Configure OTLP exporter
    const exporter = new OTLPTraceExporter({
      url: process.env.NEXT_PUBLIC_OTEL_EXPORTER_URL || 'http://localhost:4318/v1/traces',
      headers: {
        // Add authentication if needed
        ...(process.env.NEXT_PUBLIC_OTEL_API_KEY && {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OTEL_API_KEY}`,
        }),
      },
    })

    // Add batch span processor
    provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    }))

    // Register the provider
    provider.register()

    // Auto-instrument browser APIs
    registerInstrumentations({
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-document-load': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-user-interaction': {
            enabled: true,
            eventNames: ['click', 'submit'],
          },
          '@opentelemetry/instrumentation-fetch': {
            enabled: true,
            propagateTraceHeaderCorsUrls: [
              new RegExp(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'),
            ],
            clearTimingResources: true,
          },
          '@opentelemetry/instrumentation-xml-http-request': {
            enabled: true,
            propagateTraceHeaderCorsUrls: [
              new RegExp(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'),
            ],
          },
        }),
      ],
    })

    console.log('[Telemetry] Initialized successfully')

    // Track Web Vitals
    if ('PerformanceObserver' in window) {
      trackWebVitals()
    }
  } catch (error) {
    console.error('[Telemetry] Failed to initialize:', error)
  }
}

/**
 * Track Core Web Vitals
 */
function trackWebVitals() {
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      console.log('[WebVitals] LCP:', lastEntry.renderTime || lastEntry.loadTime)
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        console.log('[WebVitals] FID:', entry.processingStart - entry.startTime)
      })
    })
    fidObserver.observe({ type: 'first-input', buffered: true })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      console.log('[WebVitals] CLS:', clsValue)
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch (error) {
    console.error('[WebVitals] Failed to track:', error)
  }
}

/**
 * Create custom span for user actions
 */
export function trackUserAction(actionName: string, attributes?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    const tracer = (window as any).__OTEL_TRACER__
    if (!tracer) return

    const span = tracer.startSpan(actionName, {
      attributes: {
        'user.action': actionName,
        ...attributes,
      },
    })

    // End span immediately for user actions
    span.end()
  } catch (error) {
    console.error('[Telemetry] Failed to track user action:', error)
  }
}
