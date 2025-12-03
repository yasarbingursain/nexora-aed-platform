import { env } from '@/config/env';
import { logger } from '@/utils/logger';

// Interface for secret data
interface SecretData {
  [key: string]: any;
}

// Vault client interface
interface VaultClient {
  read(path: string): Promise<{ data: SecretData }>;
  write(path: string, data: SecretData): Promise<void>;
  delete(path: string): Promise<void>;
}

// Mock Vault client for development
class MockVaultClient implements VaultClient {
  private secrets: Map<string, SecretData> = new Map();

  async read(path: string): Promise<{ data: SecretData }> {
    const data = this.secrets.get(path);
    if (!data) {
      throw new Error(`Secret not found at path: ${path}`);
    }
    return { data };
  }

  async write(path: string, data: SecretData): Promise<void> {
    this.secrets.set(path, data);
  }

  async delete(path: string): Promise<void> {
    this.secrets.delete(path);
  }
}

// Real Vault client (when vault is available)
class RealVaultClient implements VaultClient {
  private vault: any;

  constructor() {
    try {
      const Vault = require('node-vault');
      this.vault = Vault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN,
      });
    } catch (error) {
      logger.warn('Vault client not available, using mock client', { error });
      throw error;
    }
  }

  async read(path: string): Promise<{ data: SecretData }> {
    const response = await this.vault.read(path);
    return { data: response.data.data || response.data };
  }

  async write(path: string, data: SecretData): Promise<void> {
    await this.vault.write(path, { data });
  }

  async delete(path: string): Promise<void> {
    await this.vault.delete(path);
  }
}

// Initialize the appropriate client
let vaultClient: VaultClient;

try {
  if (env.NODE_ENV === 'production' && process.env.VAULT_ADDR) {
    vaultClient = new RealVaultClient();
    logger.info('Vault client initialized for production');
  } else {
    vaultClient = new MockVaultClient();
    logger.info('Mock vault client initialized for development');
  }
} catch (error) {
  vaultClient = new MockVaultClient();
  logger.warn('Falling back to mock vault client', { error });
}

// Secret management functions
export const getSecret = async (path: string): Promise<SecretData> => {
  try {
    const { data } = await vaultClient.read(path);
    logger.debug('Secret retrieved successfully', { path });
    return data;
  } catch (error) {
    logger.error('Failed to retrieve secret', { path, error });
    throw new Error(`Failed to retrieve secret from path: ${path}`);
  }
};

export const setSecret = async (path: string, data: SecretData): Promise<void> => {
  try {
    await vaultClient.write(path, data);
    logger.info('Secret stored successfully', { path });
  } catch (error) {
    logger.error('Failed to store secret', { path, error });
    throw new Error(`Failed to store secret at path: ${path}`);
  }
};

export const deleteSecret = async (path: string): Promise<void> => {
  try {
    await vaultClient.delete(path);
    logger.info('Secret deleted successfully', { path });
  } catch (error) {
    logger.error('Failed to delete secret', { path, error });
    throw new Error(`Failed to delete secret at path: ${path}`);
  }
};

// Helper functions for common secrets
export const getDatabaseCredentials = async (): Promise<{
  username: string;
  password: string;
  host: string;
  port: number;
  database: string;
}> => {
  try {
    const secrets = await getSecret('secret/data/database');
    return {
      username: secrets.username,
      password: secrets.password,
      host: secrets.host || 'localhost',
      port: secrets.port || 5432,
      database: secrets.database || 'nexora_db',
    };
  } catch (error) {
    // Fallback to environment variables
    logger.warn('Using database credentials from environment variables');
    return {
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nexora_db',
    };
  }
};

export const getRedisCredentials = async (): Promise<{
  host: string;
  port: number;
  password?: string;
}> => {
  try {
    const secrets = await getSecret('secret/data/redis');
    return {
      host: secrets.host || 'localhost',
      port: secrets.port || 6379,
      password: secrets.password,
    };
  } catch (error) {
    // Fallback to environment variables
    logger.warn('Using Redis credentials from environment variables');
    const config: { host: string; port: number; password?: string } = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
    
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
    
    return config;
  }
};

export const getJWTSecrets = async (): Promise<{
  accessSecret: string;
  refreshSecret: string;
}> => {
  try {
    const secrets = await getSecret('secret/data/jwt');
    return {
      accessSecret: secrets.access_secret,
      refreshSecret: secrets.refresh_secret,
    };
  } catch (error) {
    // Fallback to environment variables
    logger.warn('Using JWT secrets from environment variables');
    return {
      accessSecret: env.JWT_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
    };
  }
};

export const getCloudProviderCredentials = async (provider: 'aws' | 'azure' | 'gcp') => {
  try {
    const secrets = await getSecret(`secret/data/cloud/${provider}`);
    return secrets;
  } catch (error) {
    logger.warn(`Using ${provider} credentials from environment variables`);
    
    switch (provider) {
      case 'aws':
        return {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1',
        };
      case 'azure':
        return {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          tenantId: process.env.AZURE_TENANT_ID,
        };
      case 'gcp':
        return {
          projectId: process.env.GCP_PROJECT_ID,
          clientEmail: process.env.GCP_CLIENT_EMAIL,
          privateKey: process.env.GCP_PRIVATE_KEY,
        };
      default:
        throw new Error(`Unsupported cloud provider: ${provider}`);
    }
  }
};

// Initialize mock secrets for development
if (env.NODE_ENV === 'development' && vaultClient instanceof MockVaultClient) {
  const initializeMockSecrets = async () => {
    try {
      await setSecret('secret/data/database', {
        username: 'postgres',
        password: 'password',
        host: 'localhost',
        port: 5432,
        database: 'nexora_db',
      });

      await setSecret('secret/data/redis', {
        host: 'localhost',
        port: 6379,
        password: '',
      });

      await setSecret('secret/data/jwt', {
        access_secret: env.JWT_SECRET,
        refresh_secret: env.JWT_REFRESH_SECRET,
      });

      logger.info('Mock secrets initialized for development');
    } catch (error) {
      logger.error('Failed to initialize mock secrets', { error });
    }
  };

  // Initialize mock secrets on startup
  initializeMockSecrets();
}
