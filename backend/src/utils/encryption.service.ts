import crypto from 'crypto';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: CWE-311 - Missing Encryption of Sensitive Data
 * 
 * AES-256-GCM encryption for credentials at rest.
 * Uses environment-based key derivation with scrypt.
 * 
 * TODO (Sprint 2): Migrate to HashiCorp Vault for key management
 */

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private key: Buffer;

  constructor() {
    // Derive key from environment secret
    const secret = env.ENCRYPTION_KEY || env.JWT_SECRET;
    
    if (!secret || secret.length < 32) {
      logger.error('ENCRYPTION_KEY must be at least 32 characters');
      throw new Error('Invalid encryption configuration');
    }

    // Use scrypt for key derivation (PBKDF2 alternative)
    this.key = crypto.scryptSync(secret, 'nexora-salt-v1', this.keyLength);
    
    logger.info('Encryption service initialized', {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
    });
  }

  /**
   * Encrypt plaintext string
   * Returns: iv:tag:ciphertext (hex encoded)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Format: iv:tag:ciphertext
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt ciphertext string
   * Expects format: iv:tag:ciphertext (hex encoded)
   */
  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, tagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt object (for credentials)
   */
  encryptObject(obj: Record<string, any>): Record<string, any> {
    const encrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && value.value && !value.encrypted) {
        encrypted[key] = {
          ...value,
          value: this.encrypt(value.value),
          encrypted: true,
        };
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object (for credentials)
   */
  decryptObject(obj: Record<string, any>): Record<string, any> {
    const decrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && value.value && value.encrypted) {
        try {
          decrypted[key] = {
            ...value,
            value: this.decrypt(value.value),
            encrypted: false,
          };
        } catch (error) {
          logger.error('Failed to decrypt credential', { 
            key,
            error: error instanceof Error ? error.message : 'Unknown',
          });
          decrypted[key] = value; // Return encrypted on error
        }
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  /**
   * Hash sensitive data (one-way, for comparison)
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
