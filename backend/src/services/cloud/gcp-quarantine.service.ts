/**
 * GCP Firewall Quarantine Service
 * Enterprise-grade network isolation using Google Cloud Firewall Rules
 * 
 * Standards Compliance:
 * - NIST SP 800-137 (Information Security Continuous Monitoring)
 * - CIS Google Cloud Platform Foundation Benchmark v2.0
 * - ISO/IEC 27001:2013 - A.13.1.1 Network controls
 * - Google Cloud Security Best Practices
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

interface GcpConfig {
  projectId: string;
  networkName: string;
  serviceAccountKeyPath?: string;
}

interface QuarantineResult {
  success: boolean;
  ruleId?: string;
  ruleName?: string;
  error?: string;
  timestamp: Date;
}

interface FirewallRule {
  name: string;
  priority: number;
  direction: 'INGRESS' | 'EGRESS';
  action: 'allow' | 'deny';
  sourceRanges?: string[];
  destinationRanges?: string[];
  targetTags?: string[];
}

export class GcpQuarantineService {
  private config: GcpConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly API_BASE = 'https://compute.googleapis.com/compute/v1';

  constructor() {
    this.config = {
      projectId: process.env.GCP_PROJECT_ID || '',
      networkName: process.env.GCP_NETWORK_NAME || 'default',
      serviceAccountKeyPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };
  }

  isConfigured(): boolean {
    return !!(this.config.projectId && this.config.serviceAccountKeyPath);
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Use Google Auth Library for service account authentication
      let GoogleAuth: any;
      try {
        const googleAuth = await import('google-auth-library' as any);
        GoogleAuth = googleAuth.GoogleAuth;
      } catch {
        throw new Error('google-auth-library not installed. Run: npm install google-auth-library');
      }

      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/compute'],
      });

      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();

      if (!tokenResponse.token) {
        throw new Error('Failed to obtain access token');
      }

      this.accessToken = tokenResponse.token;
      this.tokenExpiry = new Date(Date.now() + 3500 * 1000); // ~1 hour

      return this.accessToken!;
    } catch (error) {
      logger.error('Failed to get GCP access token', { error });
      throw new Error('GCP authentication failed');
    }
  }

  /**
   * Quarantine an IP address by creating deny firewall rule
   */
  async quarantineIP(ipAddress: string, reason: string): Promise<QuarantineResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GCP quarantine service not configured',
        timestamp: new Date(),
      };
    }

    try {
      const token = await this.getAccessToken();
      const ruleName = `nexora-quarantine-${ipAddress.replace(/\./g, '-')}-${Date.now()}`;
      const priority = await this.getNextAvailablePriority(token);

      const firewallRule = {
        name: ruleName,
        description: `Nexora Quarantine: ${reason}`,
        network: `projects/${this.config.projectId}/global/networks/${this.config.networkName}`,
        priority,
        direction: 'INGRESS',
        denied: [{ IPProtocol: 'all' }],
        sourceRanges: [ipAddress.includes('/') ? ipAddress : `${ipAddress}/32`],
        logConfig: {
          enable: true,
          metadata: 'INCLUDE_ALL_METADATA',
        },
      };

      const url = `${this.API_BASE}/projects/${this.config.projectId}/global/firewalls`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firewallRule),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `Firewall rule creation failed: ${response.status}`);
      }

      const result = await response.json() as { name: string; targetId?: string };

      // Wait for operation to complete
      await this.waitForOperation(token, result.name);

      logger.info('GCP firewall quarantine rule created', {
        ipAddress,
        ruleName,
        priority,
        reason,
      });

      return {
        success: true,
        ruleId: result.targetId,
        ruleName,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('GCP quarantine failed', { ipAddress, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Remove quarantine by deleting firewall rule
   */
  async removeQuarantine(ruleName: string): Promise<QuarantineResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GCP quarantine service not configured',
        timestamp: new Date(),
      };
    }

    try {
      const token = await this.getAccessToken();

      const url = `${this.API_BASE}/projects/${this.config.projectId}/global/firewalls/${ruleName}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `Firewall rule deletion failed: ${response.status}`);
      }

      if (response.ok) {
        const result = await response.json() as { name: string };
        await this.waitForOperation(token, result.name);
      }

      logger.info('GCP firewall quarantine rule removed', { ruleName });

      return {
        success: true,
        ruleName,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('GCP quarantine removal failed', { ruleName, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Wait for GCP operation to complete
   */
  private async waitForOperation(token: string, operationName: string, maxWaitMs = 30000): Promise<void> {
    const startTime = Date.now();
    const operationUrl = `${this.API_BASE}/projects/${this.config.projectId}/global/operations/${operationName.split('/').pop()}`;

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(operationUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to check operation status: ${response.status}`);
      }

      const operation = await response.json() as { status: string; error?: { errors?: Array<{ message?: string }> } };

      if (operation.status === 'DONE') {
        if (operation.error) {
          throw new Error(operation.error.errors?.[0]?.message || 'Operation failed');
        }
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Operation timed out');
  }

  /**
   * Get next available priority for firewall rule
   */
  private async getNextAvailablePriority(token: string): Promise<number> {
    try {
      const url = `${this.API_BASE}/projects/${this.config.projectId}/global/firewalls?filter=name:nexora-quarantine-*`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        return 100;
      }

      const data = await response.json() as { items?: Array<{ priority: number }> };
      const rules = data.items || [];
      const priorities = rules.map((r) => r.priority);

      let priority = 100;
      while (priorities.includes(priority) && priority < 65534) {
        priority++;
      }

      return priority;
    } catch (error) {
      logger.warn('Failed to get firewall priorities, using default', { error });
      return 100;
    }
  }

  /**
   * List all quarantine rules
   */
  async listQuarantineRules(): Promise<FirewallRule[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const token = await this.getAccessToken();

      const url = `${this.API_BASE}/projects/${this.config.projectId}/global/firewalls?filter=name:nexora-quarantine-*`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { items?: Array<Record<string, unknown>> };
      const rules = data.items || [];

      return rules.map((r) => ({
        name: String(r.name || ''),
        priority: Number(r.priority || 0),
        direction: (r.direction === 'EGRESS' ? 'EGRESS' : 'INGRESS') as 'INGRESS' | 'EGRESS',
        action: r.denied ? 'deny' as const : 'allow' as const,
        sourceRanges: r.sourceRanges as string[] | undefined,
        destinationRanges: r.destinationRanges as string[] | undefined,
        targetTags: r.targetTags as string[] | undefined,
      }));
    } catch (error) {
      logger.error('Failed to list GCP quarantine rules', { error });
      return [];
    }
  }
}

export const gcpQuarantineService = new GcpQuarantineService();
