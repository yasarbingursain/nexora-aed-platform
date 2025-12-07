import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: CWE-798 - Use of Hard-coded Credentials
 * 
 * Implements secure secrets management following NIST SP 800-57 guidelines:
 * - Secrets stored in AWS Secrets Manager / Azure Key Vault / HashiCorp Vault
 * - In-memory caching with TTL
 * - Automatic rotation support
 * - Fallback to environment variables in development only
 * - Audit logging of secret access
 * 
 * Production: Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
 * Development: Falls back to environment variables with warnings
 */

interface SecretCache {
  value: string;
  expiry: number;
}

interface SecretMetadata {
  name: string;
  version?: string;
  rotationEnabled?: boolean;
  lastRotated?: Date;
}

export class SecretsManager {
  private cache: Map<string, SecretCache> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly provider: 'aws' | 'azure' | 'vault' | 'env';
  private client: any;

  constructor() {
    // Determine secrets provider based on environment
    this.provider = this.detectProvider();
    this.initializeClient();

    logger.info('Secrets Manager initialized', {
      provider: this.provider,
      environment: process.env.NODE_ENV,
    });
  }

  /**
   * Detect which secrets provider to use
   */
  private detectProvider(): 'aws' | 'azure' | 'vault' | 'env' {
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      return 'aws';
    }
    if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID) {
      return 'azure';
    }
    if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
      return 'vault';
    }

    // Fallback to environment variables (development only)
    if (process.env.NODE_ENV === 'production') {
      logger.error('No secrets provider configured in production!');
      throw new Error('Secrets provider required in production');
    }

    logger.warn('Using environment variables for secrets (development only)');
    return 'env';
  }

  /**
   * Initialize secrets provider client
   */
  private initializeClient(): void {
    switch (this.provider) {
      case 'aws':
        this.initializeAWS();
        break;
      case 'azure':
        this.initializeAzure();
        break;
      case 'vault':
        this.initializeVault();
        break;
      case 'env':
        // No client needed for environment variables
        break;
    }
  }

  /**
   * Initialize AWS Secrets Manager client
   */
  private initializeAWS(): void {
    try {
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
      this.client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
      logger.info('AWS Secrets Manager client initialized');
    } catch (error) {
      logger.error('Failed to initialize AWS Secrets Manager', { error });
      throw error;
    }
  }

  /**
   * Initialize Azure Key Vault client
   */
  private initializeAzure(): void {
    try {
      const { SecretClient } = require('@azure/keyvault-secrets');
      const { DefaultAzureCredential } = require('@azure/identity');
      
      const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
      if (!vaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL not configured');
      }

      const credential = new DefaultAzureCredential();
      this.client = new SecretClient(vaultUrl, credential);
      logger.info('Azure Key Vault client initialized');
    } catch (error) {
      logger.error('Failed to initialize Azure Key Vault', { error });
      throw error;
    }
  }

  /**
   * Initialize HashiCorp Vault client
   */
  private initializeVault(): void {
    try {
      const vault = require('node-vault');
      this.client = vault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ADDR,
        token: process.env.VAULT_TOKEN,
      });
      logger.info('HashiCorp Vault client initialized');
    } catch (error) {
      logger.error('Failed to initialize HashiCorp Vault', { error });
      throw error;
    }
  }

  /**
   * Get secret value with caching
   */
  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
      logger.debug('Secret retrieved from cache', { secretName });
      return cached.value;
    }

    // Fetch from provider
    let value: string;
    try {
      value = await this.fetchSecret(secretName);
    } catch (error) {
      logger.error('Failed to fetch secret', {
        secretName,
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to retrieve secret: ${secretName}`);
    }

    // Cache the secret
    this.cache.set(secretName, {
      value,
      expiry: Date.now() + this.CACHE_TTL,
    });

    logger.info('Secret retrieved and cached', {
      secretName,
      provider: this.provider,
    });

    return value;
  }

  /**
   * Fetch secret from provider
   */
  private async fetchSecret(secretName: string): Promise<string> {
    switch (this.provider) {
      case 'aws':
        return this.fetchFromAWS(secretName);
      case 'azure':
        return this.fetchFromAzure(secretName);
      case 'vault':
        return this.fetchFromVault(secretName);
      case 'env':
        return this.fetchFromEnv(secretName);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Fetch secret from AWS Secrets Manager
   */
  private async fetchFromAWS(secretName: string): Promise<string> {
    const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no value`);
    }

    // Handle JSON secrets
    try {
      const parsed = JSON.parse(response.SecretString);
      // If it's a JSON object, return the whole thing as string
      return typeof parsed === 'object' ? response.SecretString : parsed;
    } catch {
      // Not JSON, return as-is
      return response.SecretString;
    }
  }

  /**
   * Fetch secret from Azure Key Vault
   */
  private async fetchFromAzure(secretName: string): Promise<string> {
    const secret = await this.client.getSecret(secretName);
    
    if (!secret.value) {
      throw new Error(`Secret ${secretName} has no value`);
    }

    return secret.value;
  }

  /**
   * Fetch secret from HashiCorp Vault
   */
  private async fetchFromVault(secretName: string): Promise<string> {
    const path = `secret/data/${secretName}`;
    const response = await this.client.read(path);

    if (!response?.data?.data) {
      throw new Error(`Secret ${secretName} not found`);
    }

    // Vault stores secrets in data.data
    const secretData = response.data.data;
    
    // If single value, return it
    if (secretData.value) {
      return secretData.value;
    }

    // If multiple values, return as JSON
    return JSON.stringify(secretData);
  }

  /**
   * Fetch secret from environment variables (development only)
   */
  private async fetchFromEnv(secretName: string): Promise<string> {
    // Convert secret name to env var format
    // e.g., "nexora/jwt-secret" -> "JWT_SECRET"
    const envKey = secretName
      .split('/')
      .pop()!
      .toUpperCase()
      .replace(/-/g, '_');

    const value = process.env[envKey];

    if (!value) {
      throw new Error(`Environment variable ${envKey} not set`);
    }

    logger.warn('Using environment variable for secret (development only)', {
      secretName,
      envKey,
    });

    return value;
  }

  /**
   * Get secret as JSON object
   */
  async getSecretJson<T>(secretName: string): Promise<T> {
    const secretString = await this.getSecret(secretName);
    
    try {
      return JSON.parse(secretString) as T;
    } catch (error) {
      logger.error('Failed to parse secret as JSON', {
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Secret ${secretName} is not valid JSON`);
    }
  }

  /**
   * Invalidate cache for a secret (after rotation)
   */
  invalidateCache(secretName: string): void {
    this.cache.delete(secretName);
    logger.info('Secret cache invalidated', { secretName });
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('All secret caches cleared');
  }

  /**
   * Rotate secret (trigger rotation in provider)
   */
  async rotateSecret(secretName: string): Promise<void> {
    try {
      switch (this.provider) {
        case 'aws':
          await this.rotateAWSSecret(secretName);
          break;
        case 'azure':
          logger.warn('Azure Key Vault rotation must be configured in Azure Portal');
          break;
        case 'vault':
          logger.warn('Vault rotation must be configured in Vault policies');
          break;
        case 'env':
          logger.warn('Cannot rotate environment variables');
          break;
      }

      // Invalidate cache after rotation
      this.invalidateCache(secretName);

      logger.security('Secret rotation initiated', { secretName });
    } catch (error) {
      logger.error('Secret rotation failed', {
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Rotate AWS secret
   */
  private async rotateAWSSecret(secretName: string): Promise<void> {
    const { RotateSecretCommand } = require('@aws-sdk/client-secrets-manager');
    
    const command = new RotateSecretCommand({
      SecretId: secretName,
      RotationLambdaARN: process.env.AWS_ROTATION_LAMBDA_ARN,
    });

    await this.client.send(command);
  }

  /**
   * List all cached secrets (for monitoring)
   */
  getCachedSecrets(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { total: number; provider: string } {
    return {
      total: this.cache.size,
      provider: this.provider,
    };
  }
}

// Singleton instance
export const secretsManager = new SecretsManager();

/**
 * Helper function to get common secrets
 */
export async function getJwtSecret(): Promise<string> {
  return secretsManager.getSecret('nexora/jwt-secret');
}

export async function getJwtRefreshSecret(): Promise<string> {
  return secretsManager.getSecret('nexora/jwt-refresh-secret');
}

export async function getDatabaseUrl(): Promise<string> {
  return secretsManager.getSecret('nexora/database-url');
}

export async function getEncryptionKey(): Promise<string> {
  return secretsManager.getSecret('nexora/encryption-key');
}

export async function getRedisUrl(): Promise<string> {
  return secretsManager.getSecret('nexora/redis-url');
}
