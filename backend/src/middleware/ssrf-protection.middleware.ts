import { Request, Response, NextFunction } from 'express';
import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';
import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: CWE-918 - Server-Side Request Forgery (SSRF)
 * 
 * Validates and blocks requests to private IP ranges and cloud metadata endpoints.
 * Prevents internal network scanning and credential theft.
 */

// Private IP ranges (RFC 1918, RFC 4193, RFC 3927, localhost)
const BLOCKED_IP_RANGES = [
  { subnet: '10.0.0.0', bits: 8 },          // RFC 1918 - Private
  { subnet: '172.16.0.0', bits: 12 },       // RFC 1918 - Private
  { subnet: '192.168.0.0', bits: 16 },      // RFC 1918 - Private
  { subnet: '127.0.0.0', bits: 8 },         // Localhost
  { subnet: '169.254.0.0', bits: 16 },      // RFC 3927 - Link-local
  { subnet: 'fc00::', bits: 7 },            // RFC 4193 - Unique local IPv6
  { subnet: 'fe80::', bits: 10 },           // Link-local IPv6
  { subnet: '::1', bits: 128 },             // Localhost IPv6
];

// Cloud metadata endpoints
const BLOCKED_HOSTNAMES = [
  '169.254.169.254',      // AWS, Azure, GCP, DigitalOcean metadata
  'metadata.google.internal', // GCP metadata
  '100.100.100.200',      // Alibaba Cloud metadata
  'fd00:ec2::254',        // AWS IPv6 metadata
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate URL and check for SSRF vulnerabilities
 */
export async function validateUrl(urlString: string): Promise<void> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Block non-HTTP protocols
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    throw new Error(`Protocol ${parsedUrl.protocol} not allowed. Only HTTP/HTTPS permitted.`);
  }

  // Check hostname against blocklist
  if (BLOCKED_HOSTNAMES.includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error('Access to cloud metadata endpoints is blocked');
  }

  // Resolve DNS to check IP addresses
  let addresses: string[] = [];
  
  try {
    // Try IPv4 first
    addresses = await dns.resolve4(parsedUrl.hostname);
  } catch (error) {
    // Try IPv6 if IPv4 fails
    try {
      addresses = await dns.resolve6(parsedUrl.hostname);
    } catch (error) {
      throw new Error('Failed to resolve hostname');
    }
  }

  // Check each resolved IP address
  for (const address of addresses) {
    const addr = ipaddr.parse(address);
    
    // Check if IP is in any blocked range
    for (const range of BLOCKED_IP_RANGES) {
      const subnetAddr = ipaddr.parse(range.subnet);
      
      if (addr.match(subnetAddr, range.bits)) {
        throw new Error(`Access to private IP address ${address} is blocked`);
      }
    }
  }

  // Additional check for IP literals in hostname
  if (isIpLiteral(parsedUrl.hostname)) {
    const addr = ipaddr.parse(parsedUrl.hostname);
    
    for (const range of BLOCKED_IP_RANGES) {
      const subnetAddr = ipaddr.parse(range.subnet);
      
      if (addr.match(subnetAddr, range.bits)) {
        throw new Error(`Direct access to private IP ${parsedUrl.hostname} is blocked`);
      }
    }
  }

  logger.info('URL validated against SSRF', {
    url: urlString,
    hostname: parsedUrl.hostname,
    resolvedIps: addresses,
  });
}

/**
 * Check if hostname is an IP literal
 */
function isIpLiteral(hostname: string): boolean {
  try {
    ipaddr.parse(hostname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Express middleware for SSRF protection on request body URLs
 */
export function ssrfProtectionMiddleware(urlFields: string[] = ['url']) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check each specified field in request body
      for (const field of urlFields) {
        const urlValue = req.body[field];
        
        if (urlValue && typeof urlValue === 'string') {
          await validateUrl(urlValue);
        }
      }

      // Check query parameters
      for (const field of urlFields) {
        const urlValue = req.query[field];
        
        if (urlValue && typeof urlValue === 'string') {
          await validateUrl(urlValue);
        }
      }

      next();
    } catch (error) {
      logger.security('SSRF attempt blocked', {
        ip: req.ip,
        path: req.path,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        error: 'Invalid URL',
        message: error instanceof Error ? error.message : 'URL validation failed',
      });
    }
  };
}

/**
 * Validate URL before making external request (use in services)
 */
export async function validateExternalRequest(url: string): Promise<void> {
  await validateUrl(url);
}

/**
 * Safe fetch wrapper with SSRF protection
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<any> {
  // Validate URL first
  await validateUrl(url);

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Middleware to log all external requests for monitoring
 */
export function logExternalRequests() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only log endpoints that make external requests
    const externalEndpoints = [
      '/api/v1/osint',
      '/api/v1/malgenx',
      '/api/v1/threats/enrich',
    ];

    const isExternalRequest = externalEndpoints.some(endpoint => 
      req.path.startsWith(endpoint)
    );

    if (isExternalRequest) {
      logger.info('External request endpoint accessed', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
      });
    }

    next();
  };
}
