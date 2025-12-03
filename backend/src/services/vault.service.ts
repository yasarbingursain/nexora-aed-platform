import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';

/**
 * SPRINT 2: HashiCorp Vault Integration
 * 
 * Centralized secrets management using HashiCorp Vault.
 * Replaces environment variable secrets with vault-managed secrets.
 * 
 * Security Standards:
 * - OWASP A02:2021 - Cryptographic Failures
 * - CWE-798: Use of Hard-coded Credentials
 * - NIST SP 800-57 - Key Management
 * - ISO/IEC 27001:2013 - A.10.1.2 Key management
 */

interface VaultConfig {
  address: string;
  token: string;
  namespace?: string;
  mountPath?: string;
}

interface SecretData {
  [key: string]: string | number | boolean;
}

interface VaultSecretResponse {
  data: {
    data: SecretData;
    metadata: {
      created_time: string;
      version: number;
    };
  };
}

export class VaultService {
  private client: AxiosInstance;
  private config: VaultConfig;
  private secretCache: Map<string, { data: SecretData; expiry: number }> = new Map();
  private readonly cacheTTL = 300000; // 5 minutes

  constructor(config?: Partial<VaultConfig>) {
    this.config = {
      address: config?.address || process.env.VAULT_ADDR || 'http://localhost:8200',
      token: config?.token || process.env.VAULT_TOKEN || '',
      namespace: config?.namespace || process.env.VAULT_NAMESPACE,
      mountPath: config?.mountPath || 'secret',
    };

    this.client = axios.create({
      baseURL: this.config.address,
      headers: {
        'X-Vault-Token': this.config.token,
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
      timeout: 5000,
    });
  }

  /**
   * Read secret from Vault with caching
   */
  async readSecret(path: string): Promise<SecretData> {
    const cached = this.secretCache.get(path);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const response = await this.client.get<VaultSecretResponse>(
        `/v1/${this.config.mountPath}/data/${path}`
      );
      
      const data = response.data.data.data;

      this.secretCache.set(path, {
        data,
        expiry: Date.now() + this.cacheTTL,
      });

      logger.info('Secret read from Vault', { path });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to read Vault secret', {
          path,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Failed to read Vault secret', { path, error });
      }
      throw new Error(`Failed to retrieve secret: ${path}`);
    }
  }

  /**
   * Write secret to Vault
   */
  async writeSecret(path: string, data: SecretData): Promise<void> {
    try {
      await this.client.post(`/v1/${this.config.mountPath}/data/${path}`, { data });
      this.secretCache.delete(path);
      logger.info('Secret written to Vault', { path });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to write Vault secret', {
          path,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Failed to write Vault secret', { path, error });
      }
      throw new Error(`Failed to store secret: ${path}`);
    }
  }

  /**
   * Delete secret from Vault
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      await this.client.delete(`/v1/${this.config.mountPath}/metadata/${path}`);
      this.secretCache.delete(path);
      logger.info('Secret deleted from Vault', { path });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to delete Vault secret', {
          path,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Failed to delete Vault secret', { path, error });
      }
      throw new Error(`Failed to delete secret: ${path}`);
    }
  }

  /**
   * Get dynamic database credentials from Vault
   * Vault generates temporary credentials with TTL
   */
  async getDatabaseCredentials(role: string): Promise<{ username: string; password: string; ttl: number }> {
    try {
      const response = await this.client.get(`/v1/database/creds/${role}`);
      return {
        username: response.data.data.username,
        password: response.data.data.password,
        ttl: response.data.lease_duration,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Failed to get database credentials', {
          role,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Failed to get database credentials', { role, error });
      }
      throw new Error(`Failed to retrieve database credentials for role: ${role}`);
    }
  }

  /**
   * Encrypt data using Vault transit engine
   */
  async encrypt(keyName: string, plaintext: string): Promise<string> {
    try {
      const response = await this.client.post(`/v1/transit/encrypt/${keyName}`, {
        plaintext: Buffer.from(plaintext).toString('base64'),
      });
      return response.data.data.ciphertext;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Vault encryption failed', {
          keyName,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Vault encryption failed', { keyName, error });
      }
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using Vault transit engine
   */
  async decrypt(keyName: string, ciphertext: string): Promise<string> {
    try {
      const response = await this.client.post(`/v1/transit/decrypt/${keyName}`, {
        ciphertext,
      });
      return Buffer.from(response.data.data.plaintext, 'base64').toString();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Vault decryption failed', {
          keyName,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logger.error('Vault decryption failed', { keyName, error });
      }
      throw new Error('Decryption failed');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/sys/health');
      return response.status === 200;
    } catch (error) {
      logger.error('Vault health check failed', { error });
      return false;
    }
  }

  /**
   * Clear secret cache
   */
  clearCache(): void {
    this.secretCache.clear();
    logger.info('Vault secret cache cleared');
  }
}

// Singleton instance
export const vaultService = new VaultService();

/**
 * Load application secrets from Vault
 * Use this during application startup
 */
export async function loadSecretsFromVault(): Promise<{
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENCRYPTION_KEY: string;
  DATABASE_URL: string;
  CENSYS_API_KEY?: string;
  CENSYS_API_SECRET?: string;
}> {
  try {
    const secrets = await vaultService.readSecret('nexora/production');
    
    return {
      JWT_SECRET: secrets.jwt_secret as string,
      JWT_REFRESH_SECRET: secrets.jwt_refresh_secret as string,
      ENCRYPTION_KEY: secrets.encryption_key as string,
      DATABASE_URL: secrets.database_url as string,
      CENSYS_API_KEY: secrets.censys_api_key as string | undefined,
      CENSYS_API_SECRET: secrets.censys_api_secret as string | undefined,
    };
  } catch (error) {
    logger.error('Failed to load secrets from Vault', { error });
    throw new Error('Secrets initialization failed - check Vault configuration');
  }
}
