/**
 * Threat Intelligence Source Configuration
 * Standards: NIST SP 800-150 (Threat Intelligence), STIX 2.1
 */

export interface ThreatIntelSource {
  name: string;
  url: string;
  endpoints: Record<string, string>;
  rateLimit: {
    requests: number;
    period: 'second' | 'minute' | 'hour' | 'day';
  };
  authentication?: {
    type: 'api_key' | 'bearer' | 'none';
    headerName?: string;
  };
  dataType: string;
  reliability: number; // 0-100
  enabled: boolean;
}

export const THREAT_INTEL_SOURCES: Record<string, ThreatIntelSource> = {
  // Free, unlimited, high-quality sources
  
  urlhaus: {
    name: 'URLhaus by Abuse.ch',
    url: 'https://urlhaus-api.abuse.ch',
    endpoints: {
      recent: '/v1/urls/recent/',
      payload: '/v1/payloads/recent/',
    },
    rateLimit: { requests: 1000, period: 'hour' },
    authentication: { type: 'none' },
    dataType: 'malicious_urls',
    reliability: 95,
    enabled: true,
  },

  malwarebazaar: {
    name: 'MalwareBazaar by Abuse.ch',
    url: 'https://mb-api.abuse.ch',
    endpoints: {
      recent: '/api/v1/query/recent',
    },
    rateLimit: { requests: 1000, period: 'hour' },
    authentication: { type: 'none' },
    dataType: 'malware_samples',
    reliability: 95,
    enabled: true,
  },

  threatfox: {
    name: 'ThreatFox by Abuse.ch',
    url: 'https://threatfox-api.abuse.ch',
    endpoints: {
      recent: '/api/v1/query/recent',
    },
    rateLimit: { requests: 1000, period: 'hour' },
    authentication: { type: 'none' },
    dataType: 'iocs',
    reliability: 95,
    enabled: true,
  },

  alienvault_otx: {
    name: 'AlienVault OTX',
    url: 'https://otx.alienvault.com',
    endpoints: {
      pulses: '/api/v1/pulses/subscribed',
      events: '/api/v1/pulses/events',
    },
    rateLimit: { requests: 10000, period: 'hour' },
    authentication: { 
      type: 'api_key',
      headerName: 'X-OTX-API-KEY',
    },
    dataType: 'threat_pulses',
    reliability: 90,
    enabled: process.env.ALIENVAULT_API_KEY !== undefined,
  },

  greynoise: {
    name: 'GreyNoise Community',
    url: 'https://api.greynoise.io',
    endpoints: {
      community: '/v3/community/',
      riot: '/v2/riot/',
    },
    rateLimit: { requests: 50, period: 'minute' },
    authentication: {
      type: 'api_key',
      headerName: 'key',
    },
    dataType: 'scanning_ips',
    reliability: 85,
    enabled: process.env.GREYNOISE_API_KEY !== undefined,
  },

  circl: {
    name: 'CIRCL Hash Lookup',
    url: 'https://hashlookup.circl.lu',
    endpoints: {
      lookup: '/lookup/',
    },
    rateLimit: { requests: 1000, period: 'hour' },
    authentication: { type: 'none' },
    dataType: 'file_hashes',
    reliability: 90,
    enabled: true,
  },
};

export const INGESTION_CONFIG = {
  // Polling intervals (NIST recommends frequent updates for threat intel)
  intervals: {
    high_priority: 2 * 60 * 1000,    // 2 minutes (URLhaus, ThreatFox)
    medium_priority: 5 * 60 * 1000,   // 5 minutes (MalwareBazaar)
    low_priority: 15 * 60 * 1000,     // 15 minutes (GreyNoise)
  },
  
  // Batch sizes to prevent overwhelming the database
  batchSize: 100,
  
  // Retry configuration (exponential backoff)
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  
  // Circuit breaker settings (prevent cascading failures)
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  },
};
