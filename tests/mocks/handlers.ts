/**
 * MSW Handlers for E2E Testing
 * 
 * Provides deterministic API responses for Playwright tests
 * Eliminates dependency on live backend during testing
 */

import { http, HttpResponse } from 'msw'

const mockThreats = [
  {
    id: 'threat-1',
    title: 'Suspicious API Key Usage',
    description: 'API key accessed from unusual geographic location',
    severity: 'critical',
    status: 'active',
    entityName: 'prod-api-key-7829',
    entityType: 'API Key',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    riskScore: 95,
    detectedAt: new Date(Date.now() - 3600000).toISOString(),
    affectedEntities: ['payments-service', 'billing-api'],
  },
  {
    id: 'threat-2',
    title: 'Privilege Escalation Attempt',
    description: 'Service account attempting to access admin resources',
    severity: 'high',
    status: 'investigating',
    entityName: 'svc-account-analytics',
    entityType: 'Service Account',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    riskScore: 82,
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    affectedEntities: ['admin-panel'],
  },
  {
    id: 'threat-3',
    title: 'Unusual Access Pattern',
    description: 'OAuth token used outside normal business hours',
    severity: 'medium',
    status: 'active',
    entityName: 'oauth-token-user-456',
    entityType: 'OAuth Token',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    riskScore: 65,
    detectedAt: new Date(Date.now() - 10800000).toISOString(),
    affectedEntities: ['user-api'],
  },
]

export const handlers = [
  // Get threats list
  http.get('/api/v1/threats', () => {
    return HttpResponse.json({
      threats: mockThreats,
      total: mockThreats.length,
      page: 1,
      pageSize: 10,
    })
  }),

  // Get single threat
  http.get('/api/v1/threats/:id', ({ params }) => {
    const threat = mockThreats.find(t => t.id === params.id)
    if (!threat) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(threat)
  }),

  // Remediate threat
  http.post('/api/v1/threats/:id/remediate', ({ params }) => {
    return HttpResponse.json({
      success: true,
      threatId: params.id,
      action: 'remediated',
      timestamp: new Date().toISOString(),
    })
  }),

  // Dismiss threat
  http.post('/api/v1/threats/:id/dismiss', ({ params }) => {
    return HttpResponse.json({
      success: true,
      threatId: params.id,
      action: 'dismissed',
      timestamp: new Date().toISOString(),
    })
  }),

  // CSRF token
  http.get('/api/v1/auth/csrf', () => {
    return HttpResponse.json({
      csrfToken: 'mock-csrf-token-12345',
    })
  }),

  // Web Vitals reporting
  http.post('/api/v1/analytics/web-vitals', async ({ request }) => {
    const body = await request.json()
    console.log('[MSW] Web Vitals:', body)
    return HttpResponse.json({ success: true })
  }),
]
