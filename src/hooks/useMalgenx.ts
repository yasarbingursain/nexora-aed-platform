/**
 * MalGenX React Hook
 * Secure API client for MalGenX malware analysis endpoints
 */

import { useState, useCallback } from 'react';

// Use Next.js API proxy to avoid CORS issues
const API_BASE = '/api/v1/malgenx';

interface SubmitSampleRequest {
  type: 'file' | 'url';
  url?: string;
  fileId?: string;
  source?: string;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface SubmitSampleResponse {
  success: boolean;
  sampleId: string;
  status: string;
}

interface SampleStatus {
  success: boolean;
  sampleId: string;
  status: string;
  submissionType: string;
  priority: string;
  createdAt: string;
  riskScore?: number;
  malwareFamily?: string;
}

interface SampleReport {
  success: boolean;
  sampleId: string;
  status: string;
  riskScore?: number;
  malwareFamily?: string;
  malwareCategory?: string;
  isMalicious?: boolean;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  analysisResults?: any;
  iocsExtracted?: number;
}

interface IOCSearchRequest {
  query: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  offset?: number;
}

interface IOCResult {
  id: string;
  iocType: string;
  iocValue: string;
  sampleId: string;
  isValidated: boolean;
  isKnownMalicious?: boolean;
  reputationScore?: number;
  firstSeen: string;
  lastSeen: string;
}

interface IOCSearchResponse {
  success: boolean;
  total: number;
  results: IOCResult[];
}

interface ThreatFeedItem {
  sampleId: string;
  submissionType: string;
  malwareFamily?: string;
  riskScore?: number;
  riskLevel?: string;
  isMalicious?: boolean;
  createdAt: string;
}

interface ThreatsFeedResponse {
  success: boolean;
  total: number;
  threats: ThreatFeedItem[];
}

export function useMalgenx() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitSample = useCallback(async (data: SubmitSampleRequest): Promise<SubmitSampleResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/samples/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit sample: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSampleStatus = useCallback(async (sampleId: string): Promise<SampleStatus | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/samples/${sampleId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get sample status: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSampleReport = useCallback(async (sampleId: string): Promise<SampleReport | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/samples/${sampleId}/report`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get sample report: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchIOCs = useCallback(async (data: IOCSearchRequest): Promise<IOCSearchResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/iocs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to search IOCs: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getThreatsFeed = useCallback(async (params?: {
    sinceMinutes?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
  }): Promise<ThreatsFeedResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.sinceMinutes) queryParams.append('sinceMinutes', params.sinceMinutes.toString());
      if (params?.severity) queryParams.append('severity', params.severity);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/threats/feed/public?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get threats feed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitSample,
    getSampleStatus,
    getSampleReport,
    searchIOCs,
    getThreatsFeed,
  };
}
