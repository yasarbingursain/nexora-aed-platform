/**
 * Azure NSG Quarantine Service
 * Enterprise-grade network isolation using Azure Network Security Groups
 * 
 * Standards Compliance:
 * - NIST SP 800-137 (Information Security Continuous Monitoring)
 * - CIS Azure Foundations Benchmark v2.0
 * - ISO/IEC 27001:2013 - A.13.1.1 Network controls
 * - Microsoft Azure Security Benchmark v3
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  resourceGroup: string;
  quarantineNsgName: string;
}

interface QuarantineResult {
  success: boolean;
  ruleId?: string;
  ruleName?: string;
  error?: string;
  timestamp: Date;
}

interface NsgRule {
  name: string;
  priority: number;
  direction: 'Inbound' | 'Outbound';
  access: 'Allow' | 'Deny';
  protocol: string;
  sourceAddressPrefix: string;
  destinationAddressPrefix: string;
  sourcePortRange: string;
  destinationPortRange: string;
}

export class AzureQuarantineService {
  private config: AzureConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly API_VERSION = '2023-09-01';
  private readonly BASE_URL = 'https://management.azure.com';

  constructor() {
    this.config = {
      tenantId: process.env.AZURE_TENANT_ID || '',
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || '',
      resourceGroup: process.env.AZURE_RESOURCE_GROUP || '',
      quarantineNsgName: process.env.AZURE_QUARANTINE_NSG_NAME || 'nexora-quarantine-nsg',
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.tenantId &&
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.subscriptionId &&
      this.config.resourceGroup
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

      return this.accessToken!;
    } catch (error) {
      logger.error('Failed to get Azure access token', { error });
      throw new Error('Azure authentication failed');
    }
  }

  /**
   * Quarantine an IP address by adding deny rule to NSG
   */
  async quarantineIP(ipAddress: string, reason: string): Promise<QuarantineResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Azure quarantine service not configured',
        timestamp: new Date(),
      };
    }

    try {
      const token = await this.getAccessToken();
      const ruleName = `quarantine-${ipAddress.replace(/\./g, '-')}-${Date.now()}`;
      const priority = await this.getNextAvailablePriority(token);

      const rule: NsgRule = {
        name: ruleName,
        priority,
        direction: 'Inbound',
        access: 'Deny',
        protocol: '*',
        sourceAddressPrefix: ipAddress,
        destinationAddressPrefix: '*',
        sourcePortRange: '*',
        destinationPortRange: '*',
      };

      const url = `${this.BASE_URL}/subscriptions/${this.config.subscriptionId}/resourceGroups/${this.config.resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${this.config.quarantineNsgName}/securityRules/${ruleName}?api-version=${this.API_VERSION}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            priority: rule.priority,
            direction: rule.direction,
            access: rule.access,
            protocol: rule.protocol,
            sourceAddressPrefix: rule.sourceAddressPrefix,
            destinationAddressPrefix: rule.destinationAddressPrefix,
            sourcePortRange: rule.sourcePortRange,
            destinationPortRange: rule.destinationPortRange,
            description: `Nexora Quarantine: ${reason}`,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `NSG rule creation failed: ${response.status}`);
      }

      const result = await response.json() as { id: string };

      logger.info('Azure NSG quarantine rule created', {
        ipAddress,
        ruleName,
        priority,
        reason,
      });

      return {
        success: true,
        ruleId: result.id,
        ruleName,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Azure quarantine failed', { ipAddress, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Remove quarantine by deleting NSG rule
   */
  async removeQuarantine(ruleName: string): Promise<QuarantineResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Azure quarantine service not configured',
        timestamp: new Date(),
      };
    }

    try {
      const token = await this.getAccessToken();

      const url = `${this.BASE_URL}/subscriptions/${this.config.subscriptionId}/resourceGroups/${this.config.resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${this.config.quarantineNsgName}/securityRules/${ruleName}?api-version=${this.API_VERSION}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `NSG rule deletion failed: ${response.status}`);
      }

      logger.info('Azure NSG quarantine rule removed', { ruleName });

      return {
        success: true,
        ruleName,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Azure quarantine removal failed', { ruleName, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get next available priority for NSG rule
   */
  private async getNextAvailablePriority(token: string): Promise<number> {
    try {
      const url = `${this.BASE_URL}/subscriptions/${this.config.subscriptionId}/resourceGroups/${this.config.resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${this.config.quarantineNsgName}?api-version=${this.API_VERSION}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return 100; // Default starting priority
      }

      const nsg = await response.json() as { properties?: { securityRules?: Array<{ properties: { priority: number } }> } };
      const rules = nsg.properties?.securityRules || [];
      const priorities = rules.map((r) => r.properties.priority);
      
      // Find next available priority starting from 100
      let priority = 100;
      while (priorities.includes(priority) && priority < 4096) {
        priority++;
      }

      return priority;
    } catch (error) {
      logger.warn('Failed to get NSG priorities, using default', { error });
      return 100;
    }
  }

  /**
   * List all quarantine rules
   */
  async listQuarantineRules(): Promise<NsgRule[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const token = await this.getAccessToken();

      const url = `${this.BASE_URL}/subscriptions/${this.config.subscriptionId}/resourceGroups/${this.config.resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${this.config.quarantineNsgName}?api-version=${this.API_VERSION}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const nsg = await response.json() as { properties?: { securityRules?: Array<{ name: string; properties: Record<string, unknown> }> } };
      const rules = nsg.properties?.securityRules || [];

      return rules
        .filter((r) => r.name.startsWith('quarantine-'))
        .map((r: any) => ({
          name: r.name,
          priority: r.properties.priority,
          direction: r.properties.direction,
          access: r.properties.access,
          protocol: r.properties.protocol,
          sourceAddressPrefix: r.properties.sourceAddressPrefix,
          destinationAddressPrefix: r.properties.destinationAddressPrefix,
          sourcePortRange: r.properties.sourcePortRange,
          destinationPortRange: r.properties.destinationPortRange,
        }));
    } catch (error) {
      logger.error('Failed to list Azure quarantine rules', { error });
      return [];
    }
  }
}

export const azureQuarantineService = new AzureQuarantineService();
