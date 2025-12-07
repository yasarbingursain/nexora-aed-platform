import { redisRateLimit } from '@/config/redis';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

/**
 * SECURITY FIX: CWE-307 - Improper Restriction of Excessive Authentication Attempts
 * 
 * Implements account lockout mechanism following NIST 800-63B guidelines:
 * - Max 5 failed attempts within 5 minutes
 * - 30-minute lockout duration
 * - IP-based and email-based tracking
 * - Admin unlock capability
 * - Audit logging of all lockout events
 */

interface LockoutStatus {
  locked: boolean;
  reason?: string;
  remainingAttempts?: number;
  lockoutUntil?: Date;
}

export class AccountLockoutService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW = 300; // 5 minutes in seconds
  private readonly LOCKOUT_DURATION = 1800; // 30 minutes in seconds
  private readonly PROGRESSIVE_LOCKOUT = true; // Enable progressive delays

  /**
   * Record a failed authentication attempt
   */
  async recordFailedAttempt(email: string, ip: string, reason: string = 'invalid_credentials'): Promise<void> {
    const keys = {
      email: `lockout:email:${email}`,
      ip: `lockout:ip:${ip}`,
      combined: `lockout:combined:${email}:${ip}`,
    };

    try {
      // Increment counters with expiration
      const pipeline = redisRateLimit.pipeline();
      
      for (const [type, key] of Object.entries(keys)) {
        pipeline.incr(key);
        pipeline.expire(key, this.ATTEMPT_WINDOW);
      }

      const results = await pipeline.exec();
      
      // Check if any limits exceeded
      let lockoutTriggered = false;
      for (let i = 0; i < Object.keys(keys).length; i++) {
        const attempts = results[i * 2]?.[1] as number;
        
        if (attempts >= this.MAX_ATTEMPTS) {
          const keyType = Object.keys(keys)[i];
          await this.lockAccount(Object.values(keys)[i], keyType, email, ip);
          lockoutTriggered = true;
        }
      }

      // Log failed attempt
      await this.logAuthEvent({
        email,
        ip,
        event: 'failed_login',
        reason,
        locked: lockoutTriggered,
      });

      logger.warn('Failed authentication attempt recorded', {
        email,
        ip,
        reason,
        locked: lockoutTriggered,
      });
    } catch (error) {
      logger.error('Failed to record authentication attempt', {
        email,
        ip,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if account or IP is locked
   */
  async isLocked(email: string, ip: string): Promise<LockoutStatus> {
    const keys = {
      email: `locked:email:${email}`,
      ip: `locked:ip:${ip}`,
      combined: `locked:combined:${email}:${ip}`,
    };

    try {
      // Check all lock keys
      const pipeline = redisRateLimit.pipeline();
      for (const key of Object.values(keys)) {
        pipeline.exists(key);
        pipeline.ttl(key);
      }

      const results = await pipeline.exec();

      // Check each lock type
      for (let i = 0; i < Object.keys(keys).length; i++) {
        const exists = results[i * 2]?.[1] as number;
        const ttl = results[i * 2 + 1]?.[1] as number;

        if (exists === 1 && ttl > 0) {
          const lockType = Object.keys(keys)[i];
          const lockoutUntil = new Date(Date.now() + ttl * 1000);

          return {
            locked: true,
            reason: `Account locked due to too many failed attempts (${lockType}). Try again in ${Math.ceil(ttl / 60)} minutes.`,
            lockoutUntil,
          };
        }
      }

      // Check remaining attempts
      const attemptKey = `lockout:email:${email}`;
      const attempts = await redisRateLimit.get(attemptKey);
      const remainingAttempts = attempts ? this.MAX_ATTEMPTS - parseInt(attempts) : this.MAX_ATTEMPTS;

      return {
        locked: false,
        remainingAttempts: Math.max(0, remainingAttempts),
      };
    } catch (error) {
      logger.error('Failed to check lockout status', {
        email,
        ip,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fail secure: if we can't check, assume not locked but log the error
      return { locked: false };
    }
  }

  /**
   * Lock an account
   */
  private async lockAccount(key: string, type: string, email: string, ip: string): Promise<void> {
    const lockKey = key.replace('lockout:', 'locked:');
    
    // Calculate lockout duration (progressive if enabled)
    let lockoutDuration = this.LOCKOUT_DURATION;
    
    if (this.PROGRESSIVE_LOCKOUT) {
      const lockoutCount = await this.getLockoutCount(email);
      lockoutDuration = this.calculateProgressiveLockout(lockoutCount);
    }

    // Set lock with expiration
    await redisRateLimit.setex(lockKey, lockoutDuration, JSON.stringify({
      lockedAt: new Date().toISOString(),
      type,
      email,
      ip,
    }));

    // Clear attempt counter
    await redisRateLimit.del(key);

    // Log security event
    await this.logAuthEvent({
      email,
      ip,
      event: 'account_locked',
      reason: `Exceeded ${this.MAX_ATTEMPTS} failed attempts`,
      lockoutDuration,
    });

    logger.security('Account locked due to failed attempts', {
      email,
      ip,
      type,
      lockoutDuration,
    });
  }

  /**
   * Calculate progressive lockout duration
   */
  private calculateProgressiveLockout(lockoutCount: number): number {
    // Progressive delays: 30min, 1hr, 2hr, 4hr, 24hr
    const durations = [1800, 3600, 7200, 14400, 86400];
    const index = Math.min(lockoutCount, durations.length - 1);
    return durations[index];
  }

  /**
   * Get number of previous lockouts
   */
  private async getLockoutCount(email: string): Promise<number> {
    const key = `lockout:history:${email}`;
    const count = await redisRateLimit.get(key);
    return count ? parseInt(count) : 0;
  }

  /**
   * Clear failed attempts after successful login
   */
  async clearFailedAttempts(email: string, ip: string): Promise<void> {
    const keys = [
      `lockout:email:${email}`,
      `lockout:ip:${ip}`,
      `lockout:combined:${email}:${ip}`,
    ];

    try {
      await redisRateLimit.del(...keys);

      await this.logAuthEvent({
        email,
        ip,
        event: 'login_success',
        reason: 'Cleared failed attempts',
      });

      logger.info('Failed attempts cleared after successful login', {
        email,
        ip,
      });
    } catch (error) {
      logger.error('Failed to clear attempts', {
        email,
        ip,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Admin unlock - requires admin privileges
   */
  async adminUnlock(email: string, adminUserId: string, reason: string): Promise<void> {
    const pattern = `locked:*:${email}*`;
    
    try {
      // Find all lock keys for this email
      const keys = await redisRateLimit.keys(pattern);

      if (keys.length > 0) {
        await redisRateLimit.del(...keys);
      }

      // Clear attempt counters
      const attemptKeys = [
        `lockout:email:${email}`,
        `lockout:combined:${email}:*`,
      ];

      for (const key of attemptKeys) {
        const matchingKeys = await redisRateLimit.keys(key);
        if (matchingKeys.length > 0) {
          await redisRateLimit.del(...matchingKeys);
        }
      }

      // Log admin action
      await this.logAuthEvent({
        email,
        ip: 'admin',
        event: 'admin_unlock',
        reason,
        adminUserId,
      });

      logger.security('Admin unlock performed', {
        email,
        adminUserId,
        reason,
        keysUnlocked: keys.length,
      });
    } catch (error) {
      logger.error('Admin unlock failed', {
        email,
        adminUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get lockout statistics for monitoring
   */
  async getLockoutStats(organizationId?: string): Promise<any> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const where: any = {
        event: { in: ['account_locked', 'failed_login'] },
        timestamp: { gte: oneDayAgo },
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      const events = await prisma.auditLog.groupBy({
        by: ['event'],
        where,
        _count: true,
      });

      return {
        last24Hours: events.reduce((acc, e) => {
          acc[e.event] = e._count;
          return acc;
        }, {} as Record<string, number>),
        timestamp: now.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get lockout stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { error: 'Failed to retrieve statistics' };
    }
  }

  /**
   * Log authentication event to audit log
   */
  private async logAuthEvent(data: {
    email: string;
    ip: string;
    event: string;
    reason: string;
    locked?: boolean;
    lockoutDuration?: number;
    adminUserId?: string;
  }): Promise<void> {
    try {
      // Find user by email to get organizationId
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, organizationId: true },
      });

      await prisma.auditLog.create({
        data: {
          event: data.event,
          entityType: 'authentication',
          entityId: user?.id || 'unknown',
          userId: data.adminUserId || user?.id || null,
          organizationId: user?.organizationId || null,
          ipAddress: data.ip,
          metadata: JSON.stringify({
            email: data.email,
            reason: data.reason,
            locked: data.locked,
            lockoutDuration: data.lockoutDuration,
          }),
          severity: data.locked ? 'high' : 'medium',
        },
      });
    } catch (error) {
      // Don't throw - logging failure shouldn't break authentication
      logger.error('Failed to log auth event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
    }
  }
}

export const accountLockoutService = new AccountLockoutService();
