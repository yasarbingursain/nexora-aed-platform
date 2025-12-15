/**
 * Honey Token Service
 * Enterprise-grade deception technology for threat detection
 * 
 * Standards Compliance:
 * - MITRE ATT&CK (Deception Techniques)
 * - NIST SP 800-53 (Security and Privacy Controls)
 * - ISO/IEC 27001 (Deception Technologies)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import * as crypto from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

interface HoneyToken {
  id: string;
  type: HoneyTokenType;
  value: string;
  name: string;
  description: string;
  organizationId: string;
  deploymentLocation: string;
  status: 'active' | 'triggered' | 'expired' | 'disabled';
  createdAt: Date;
  expiresAt: Date | null;
  triggeredAt: Date | null;
  triggerCount: number;
  metadata: Record<string, unknown>;
}

type HoneyTokenType =
  | 'api_key'
  | 'aws_credential'
  | 'database_credential'
  | 'oauth_token'
  | 'jwt_token'
  | 'ssh_key'
  | 'certificate'
  | 'webhook_url'
  | 'file_canary';

interface HoneyTokenAlert {
  id: string;
  tokenId: string;
  tokenType: HoneyTokenType;
  sourceIp: string;
  userAgent: string;
  requestPath: string;
  requestMethod: string;
  headers: Record<string, string>;
  body: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date;
  metadata: Record<string, unknown>;
}

interface CreateHoneyTokenInput {
  type: HoneyTokenType;
  name: string;
  description: string;
  organizationId: string;
  deploymentLocation: string;
  expiresInDays?: number;
  metadata?: Record<string, unknown>;
}

// In-memory stores
const tokenStore = new Map<string, HoneyToken>();
const alertStore = new Map<string, HoneyTokenAlert[]>();

// ============================================================================
// HONEY TOKEN SERVICE
// ============================================================================

export class HoneyTokenService {
  private readonly TOKEN_PREFIX = 'NXHONEY';
  private readonly DEFAULT_EXPIRY_DAYS = 365;

  /**
   * Create a new honey token
   */
  async createToken(input: CreateHoneyTokenInput): Promise<HoneyToken> {
    const tokenValue = this.generateTokenValue(input.type);
    const expiresAt = input.expiresInDays 
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const token: HoneyToken = {
      id: `ht-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      type: input.type,
      value: tokenValue,
      name: input.name,
      description: input.description,
      organizationId: input.organizationId,
      deploymentLocation: input.deploymentLocation,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      triggeredAt: null,
      triggerCount: 0,
      metadata: input.metadata || {},
    };

    tokenStore.set(token.id, token);
    tokenStore.set(tokenValue, token); // Also index by value for quick lookup

    // Log creation
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        event: 'honey_token_created',
        entityType: 'honey_token',
        entityId: token.id,
        action: 'create',
        metadata: JSON.stringify({
          type: input.type,
          name: input.name,
          deploymentLocation: input.deploymentLocation,
        }),
      },
    });

    logger.info('Honey token created', {
      tokenId: token.id,
      type: input.type,
      name: input.name,
      organizationId: input.organizationId,
    });

    return token;
  }

  /**
   * Generate token value based on type
   */
  private generateTokenValue(type: HoneyTokenType): string {
    const randomPart = crypto.randomBytes(24).toString('base64url');

    switch (type) {
      case 'api_key':
        return `${this.TOKEN_PREFIX}_api_${randomPart}`;
      
      case 'aws_credential':
        // Looks like AWS access key format
        return `AKIA${crypto.randomBytes(16).toString('hex').toUpperCase().substring(0, 16)}`;
      
      case 'database_credential':
        return `${this.TOKEN_PREFIX}_db_${randomPart}`;
      
      case 'oauth_token':
        return `${this.TOKEN_PREFIX}_oauth_${randomPart}`;
      
      case 'jwt_token':
        // Generate a fake JWT-looking token
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ 
          sub: 'honey', 
          iat: Date.now(),
          exp: Date.now() + 86400000,
          honey: true 
        })).toString('base64url');
        const signature = crypto.randomBytes(32).toString('base64url');
        return `${header}.${payload}.${signature}`;
      
      case 'ssh_key':
        return `ssh-rsa ${crypto.randomBytes(256).toString('base64')} honey@nexora`;
      
      case 'certificate':
        return `-----BEGIN CERTIFICATE-----\n${crypto.randomBytes(256).toString('base64')}\n-----END CERTIFICATE-----`;
      
      case 'webhook_url':
        return `https://hooks.nexora.io/honey/${crypto.randomBytes(16).toString('hex')}`;
      
      case 'file_canary':
        return `${this.TOKEN_PREFIX}_file_${randomPart}`;
      
      default:
        return `${this.TOKEN_PREFIX}_${randomPart}`;
    }
  }

  /**
   * Check if a value is a honey token and trigger alert if so
   */
  async checkAndTrigger(
    value: string,
    context: {
      sourceIp: string;
      userAgent: string;
      requestPath: string;
      requestMethod: string;
      headers: Record<string, string>;
      body?: string;
    }
  ): Promise<HoneyTokenAlert | null> {
    // Check if this value matches any honey token
    const token = tokenStore.get(value);

    if (!token || token.status !== 'active') {
      return null;
    }

    // Check expiry
    if (token.expiresAt && new Date() > token.expiresAt) {
      token.status = 'expired';
      return null;
    }

    // Trigger the token
    token.status = 'triggered';
    token.triggeredAt = token.triggeredAt || new Date();
    token.triggerCount++;

    // Create alert
    const alert: HoneyTokenAlert = {
      id: `hta-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      tokenId: token.id,
      tokenType: token.type,
      sourceIp: context.sourceIp,
      userAgent: context.userAgent,
      requestPath: context.requestPath,
      requestMethod: context.requestMethod,
      headers: context.headers,
      body: context.body || null,
      severity: this.calculateSeverity(token, context),
      triggeredAt: new Date(),
      metadata: {
        tokenName: token.name,
        deploymentLocation: token.deploymentLocation,
        triggerCount: token.triggerCount,
      },
    };

    // Store alert
    const existingAlerts = alertStore.get(token.id) || [];
    alertStore.set(token.id, [...existingAlerts, alert]);

    // Log to database
    await prisma.securityEvent.create({
      data: {
        organizationId: token.organizationId,
        type: 'honey_token_triggered',
        severity: alert.severity,
        description: `Honey token ${token.name} triggered from ${context.sourceIp}`,
        sourceIp: context.sourceIp,
        details: JSON.stringify(alert),
      },
    });

    // Create threat
    await prisma.threat.create({
      data: {
        organizationId: token.organizationId,
        title: `Honey Token Triggered: ${token.name}`,
        description: `A honey token was accessed from ${context.sourceIp}. This indicates potential unauthorized access or credential theft.`,
        severity: alert.severity,
        status: 'open',
        category: 'credential_abuse',
        sourceIp: context.sourceIp,
        indicators: JSON.stringify([
          { type: 'ip', value: context.sourceIp },
          { type: 'user_agent', value: context.userAgent },
        ]),
        evidence: JSON.stringify({
          tokenId: token.id,
          tokenType: token.type,
          requestPath: context.requestPath,
          headers: context.headers,
        }),
        mitreTactics: 'credential-access,initial-access',
        mitreId: 'T1078',
      },
    });

    logger.warn('HONEY TOKEN TRIGGERED', {
      tokenId: token.id,
      tokenType: token.type,
      sourceIp: context.sourceIp,
      severity: alert.severity,
    });

    return alert;
  }

  /**
   * Calculate severity based on token type and context
   */
  private calculateSeverity(
    token: HoneyToken,
    context: { sourceIp: string; requestMethod: string }
  ): 'low' | 'medium' | 'high' | 'critical' {
    // High-value token types
    const criticalTypes: HoneyTokenType[] = ['aws_credential', 'database_credential', 'ssh_key', 'certificate'];
    const highTypes: HoneyTokenType[] = ['api_key', 'oauth_token', 'jwt_token'];

    if (criticalTypes.includes(token.type)) {
      return 'critical';
    }

    if (highTypes.includes(token.type)) {
      return 'high';
    }

    // Destructive methods are more severe
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(context.requestMethod)) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Get token by ID
   */
  getToken(tokenId: string): HoneyToken | undefined {
    return tokenStore.get(tokenId);
  }

  /**
   * List all tokens for an organization
   */
  listTokens(organizationId: string, status?: HoneyToken['status']): HoneyToken[] {
    const tokens = Array.from(tokenStore.values()).filter(
      t => t.organizationId === organizationId && t.id.startsWith('ht-')
    );

    return status ? tokens.filter(t => t.status === status) : tokens;
  }

  /**
   * Get alerts for a token
   */
  getAlerts(tokenId: string): HoneyTokenAlert[] {
    return alertStore.get(tokenId) || [];
  }

  /**
   * Disable a token
   */
  async disableToken(tokenId: string): Promise<boolean> {
    const token = tokenStore.get(tokenId);
    if (!token) return false;

    token.status = 'disabled';

    await prisma.auditLog.create({
      data: {
        organizationId: token.organizationId,
        event: 'honey_token_disabled',
        entityType: 'honey_token',
        entityId: tokenId,
        action: 'update',
        metadata: JSON.stringify({ name: token.name }),
      },
    });

    logger.info('Honey token disabled', { tokenId, name: token.name });
    return true;
  }

  /**
   * Rotate a token (create new, disable old)
   */
  async rotateToken(tokenId: string): Promise<HoneyToken | null> {
    const oldToken = tokenStore.get(tokenId);
    if (!oldToken) return null;

    // Disable old token
    await this.disableToken(tokenId);

    // Create new token with same config
    const newToken = await this.createToken({
      type: oldToken.type,
      name: oldToken.name,
      description: oldToken.description,
      organizationId: oldToken.organizationId,
      deploymentLocation: oldToken.deploymentLocation,
      metadata: { ...oldToken.metadata, rotatedFrom: tokenId },
    });

    logger.info('Honey token rotated', {
      oldTokenId: tokenId,
      newTokenId: newToken.id,
    });

    return newToken;
  }

  /**
   * Get statistics for honey tokens
   */
  getStats(organizationId: string): {
    total: number;
    active: number;
    triggered: number;
    expired: number;
    disabled: number;
    totalAlerts: number;
  } {
    const tokens = this.listTokens(organizationId);
    const allAlerts = tokens.flatMap(t => this.getAlerts(t.id));

    return {
      total: tokens.length,
      active: tokens.filter(t => t.status === 'active').length,
      triggered: tokens.filter(t => t.status === 'triggered').length,
      expired: tokens.filter(t => t.status === 'expired').length,
      disabled: tokens.filter(t => t.status === 'disabled').length,
      totalAlerts: allAlerts.length,
    };
  }
}

export const honeyTokenService = new HoneyTokenService();
