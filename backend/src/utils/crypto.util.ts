import crypto from 'crypto';
import { env } from '@/config/env';

/**
 * Cryptographic Utility
 * 
 * Provides secure cryptographic operations following NIST and OWASP standards
 * - AES-256-GCM for encryption
 * - PBKDF2 for key derivation
 * - Secure random generation
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000; // NIST recommendation

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandom(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate secure random token (hex string)
 */
export function generateSecureToken(length: number = 32): string {
  return generateSecureRandom(length).toString('hex');
}

/**
 * Hash data using SHA-256
 */
export function sha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using SHA-512
 */
export function sha512Hash(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64 encoded string with format: salt:iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, password?: string): string {
  const encryptionKey = password || env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const salt = generateSecureRandom(SALT_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  const iv = generateSecureRandom(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt, iv, authTag, and ciphertext
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt data using AES-256-GCM
 * Expects format: salt:iv:authTag:ciphertext
 */
export function decrypt(ciphertext: string, password?: string): string {
  const encryptionKey = password || env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [saltB64, ivB64, authTagB64, encryptedB64] = parts;
  
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = encryptedB64;
  
  const key = deriveKey(encryptionKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt object to JSON string
 */
export function encryptObject(obj: any, password?: string): string {
  return encrypt(JSON.stringify(obj), password);
}

/**
 * Decrypt JSON string to object
 */
export function decryptObject<T = any>(ciphertext: string, password?: string): T {
  const decrypted = decrypt(ciphertext, password);
  return JSON.parse(decrypted);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate HMAC signature
 */
export function generateHMAC(data: string, secret?: string): string {
  const key = secret || env.JWT_SECRET;
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret?: string): boolean {
  const expected = generateHMAC(data, secret);
  return secureCompare(expected, signature);
}
