// NHITI Feed API Client - Live Data Integration
import type { NHITIFeedResponse, ThreatIndicator } from '@/components/admin/NHITIFeed.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Fetch live NHITI threat intelligence feed
 * Connects to Gateway Service /api/v1/nhiti/feed endpoint
 */
export async function fetchNHITIFeed(limit: number = 100): Promise<NHITIFeedResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/nhiti/feed?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error(`NHITI Feed API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform API response to match our interface
    return {
      indicators: data.indicators.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      })),
      stats: data.stats,
      distribution: data.distribution,
      contributors: data.contributors,
      lastUpdate: data.lastUpdate,
    };
  } catch (error) {
    console.error('Failed to fetch NHITI feed:', error);
    throw error;
  }
}

/**
 * Block a threat indicator globally
 */
export async function blockThreatIndicator(indicatorId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/nhiti/block/${indicatorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to block indicator: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to block threat indicator:', error);
    throw error;
  }
}

/**
 * Share threat indicator with customer network
 */
export async function shareThreatIndicator(indicatorId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/nhiti/share/${indicatorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to share indicator: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to share threat indicator:', error);
    throw error;
  }
}

/**
 * Export NHITI feed data
 */
export async function exportNHITIFeed(format: 'json' | 'csv' | 'stix'): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/nhiti/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                 format === 'csv' ? 'text/csv' : 
                 'application/stix+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export NHITI feed: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Failed to export NHITI feed:', error);
    throw error;
  }
}
