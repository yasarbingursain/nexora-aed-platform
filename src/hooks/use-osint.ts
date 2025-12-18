/**
 * OSINT Threat Intelligence Hooks
 * React hooks for consuming OSINT backend APIs
 */

import { useState, useEffect, useCallback } from 'react';

// Use Next.js API proxy to avoid CORS issues
const BACKEND_URL = '/api/v1';

interface ThreatEvent {
  id: string;
  external_id: string;
  source: string;
  indicator_type: string;
  value: string;
  severity: string;
  risk_score: number;
  risk_label: string;
  description?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  first_seen: string;
  last_seen: string;
  created_at: string;
}

interface ThreatStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  new_threats: number;
  avg_risk_score: number;
  sources: number;
}

interface Blocklist {
  generated_at: string;
  expires_at: string;
  total_items: number;
  ips: string[];
  domains: string[];
  urls: string[];
  metadata: {
    min_risk_score: number;
    max_items: number;
    sources: string[];
  };
}

/**
 * Hook to fetch latest OSINT threats
 */
export function useOsintThreats(limit: number = 100) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/osint/threats/latest?limit=${limit}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch threats: ${response.status}`);
      }

      const data = await response.json();
      setThreats(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setThreats([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchThreats();
    const interval = setInterval(fetchThreats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchThreats]);

  return { threats, loading, error, refetch: fetchThreats };
}

/**
 * Hook to fetch OSINT threats for map visualization
 */
export function useOsintThreatMap(limit: number = 200) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMapThreats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/osint/threats/map?limit=${limit}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch map threats: ${response.status}`);
      }

      const data = await response.json();
      setThreats(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setThreats([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchMapThreats();
    const interval = setInterval(fetchMapThreats, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchMapThreats]);

  return { threats, loading, error, refetch: fetchMapThreats };
}

/**
 * Hook to fetch OSINT threat statistics
 */
export function useOsintStats() {
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/osint/threats/stats`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook to fetch SOAR blocklist
 */
export function useBlocklist(minRisk: number = 60, maxItems: number = 500) {
  const [blocklist, setBlocklist] = useState<Blocklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocklist = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/osint/soar/blocklist?minRisk=${minRisk}&maxItems=${maxItems}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocklist: ${response.status}`);
      }

      const data = await response.json();
      setBlocklist(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBlocklist(null);
    } finally {
      setLoading(false);
    }
  }, [minRisk, maxItems]);

  useEffect(() => {
    fetchBlocklist();
    const interval = setInterval(fetchBlocklist, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchBlocklist]);

  return { blocklist, loading, error, refetch: fetchBlocklist };
}
