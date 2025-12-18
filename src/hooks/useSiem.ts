/**
 * SIEM Integration React Hook
 * Nexora AED Platform - Enterprise SIEM Compatibility
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';

const API_BASE = '/api/v1/siem';

export interface SiemProvider {
  id: string;
  name: string;
  description: string;
  configRequired: string[];
  formats: string[];
}

export interface SiemFormat {
  id: string;
  name: string;
  description: string;
  supportedBy: string[];
  example: string;
}

export interface SiemStatus {
  configured: boolean;
  providers: string[];
  settings: Record<string, unknown>;
  environmentVariables: {
    syslog: { configured: boolean; host: string | null; port: string; protocol: string; format: string };
    splunk: { configured: boolean; url: string | null; index: string };
    sentinel: { configured: boolean; workspaceId: string | null; logType: string };
    elastic: { configured: boolean; url: string | null; index: string };
  };
}

export interface SiemTestResult {
  allConnected: boolean;
  results: Record<string, { connected: boolean; error?: string }>;
  testedAt: string;
}

export interface SiemEvent {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  eventType: string;
  source: string;
  sourceIp?: string;
  destinationIp?: string;
  user?: string;
  identityId?: string;
  identityName?: string;
  organizationId: string;
  title: string;
  description: string;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  indicators?: string[];
  riskScore?: number;
}

export interface SiemSendResult {
  success: boolean;
  eventsProcessed: number;
  eventsFailed: number;
  errors?: string[];
  timestamp: string;
}

export function useSiem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const getStatus = useCallback(async (): Promise<SiemStatus | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/status`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get SIEM status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get SIEM status';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const testConnectivity = useCallback(async (): Promise<SiemTestResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Connectivity test failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connectivity test failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const sendEvents = useCallback(async (events: SiemEvent[]): Promise<SiemSendResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send events';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const forwardThreat = useCallback(async (threatId: string): Promise<SiemSendResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/forward/threat/${threatId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to forward threat: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to forward threat';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const forwardIncident = useCallback(async (incidentId: string): Promise<SiemSendResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/forward/incident/${incidentId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to forward incident: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to forward incident';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const previewFormat = useCallback(async (
    event: SiemEvent,
    format: 'cef' | 'leef' | 'syslog' | 'json'
  ): Promise<{ format: string; formatted: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ event, format }),
      });

      if (!response.ok) {
        throw new Error(`Failed to preview format: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to preview format';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const exportEvents = useCallback(async (params: {
    format?: 'cef' | 'leef' | 'syslog' | 'json';
    startDate?: string;
    endDate?: string;
    severity?: string;
    category?: string;
    limit?: number;
  }): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.format) queryParams.set('format', params.format);
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.severity) queryParams.set('severity', params.severity);
      if (params.category) queryParams.set('category', params.category);
      if (params.limit) queryParams.set('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/export?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to export events: ${response.status}`);
      }

      return await response.text();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export events';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const getFormats = useCallback(async (): Promise<{
    formats: SiemFormat[];
    transports: Array<{ id: string; name: string; port: number; description: string }>;
    providers: SiemProvider[];
  } | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/formats`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get formats: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get formats';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  return {
    loading,
    error,
    getStatus,
    testConnectivity,
    sendEvents,
    forwardThreat,
    forwardIncident,
    previewFormat,
    exportEvents,
    getFormats,
  };
}
