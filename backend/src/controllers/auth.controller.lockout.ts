import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { getClientIP, getUserAgent } from '@/utils/request-helpers';

/**
 * SECURITY FIX: CWE-307 - Improper Restriction of Excessive Authentication Attempts
 * 
 * Implements account lockout after 5 failed attempts for 15 minutes.
 * Complies with NIST 800-63B guidelines.
 */

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_RESET_MS = 60 * 60 * 1000; // 1 hour - time window for counting attempts

export class AuthControllerWithLockout {
  /**
   * User login with account lockout protection (CWE-307 fix)
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, mfaToken } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      // Generic error for non-existent users (prevent enumeration)
      if (!user || !user.isActive) {
        await AuthControllerWithLockout.recordFailedAttempt(email, req.ip || 'unknown');
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials',
        });
      }

      // SECURITY FIX: Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000
        );

        logger.warn('Login attempt on locked account', {
          email,
          ip: req.ip,
          remainingMinutes,
          userId: user.id,
        });

        return res.status(423).json({
          error: 'Account locked',
          message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
          lockedUntil: user.lockedUntil.toISOString(),
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        // SECURITY FIX: Record failed attempt and potentially lock account
        await AuthControllerWithLockout.handleFailedLogin(user.id, email, req.ip || 'unknown');

        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials',
        });
      }

      // SECURITY FIX: Reset failed attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLogin: null,
          lastLoginAt: new Date(),
        },
      });

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          return res.status(403).json({
            error: 'MFA required',
            message: 'Multi-factor authentication code required',
            requiresMfa: true,
          });
        }

        // Verify MFA token
        const isMfaValid = await AuthControllerWithLockout.verifyMfaToken(user.id, mfaToken);
        if (!isMfaValid) {
          await AuthControllerWithLockout.handleFailedLogin(user.id, email, req.ip || 'unknown');
          return res.status(401).json({
            error: 'Invalid MFA code',
            message: 'The multi-factor authentication code is incorrect',
          });
        }
      }

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          deviceInfo: getUserAgent(req),
        },
      });

      logger.info('User logged in', {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        ip: req.ip,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          mfaEnabled: user.mfaEnabled,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error('Login failed', { error });
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }

  /**
   * SECURITY FIX: Handle failed login attempt with progressive lockout
   */
  private static async handleFailedLogin(userId: string, email: string, ip: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        failedLoginAttempts: true, 
        lastFailedLogin: true,
        fullName: true,
      },
    });

    if (!user) return;

    // Reset counter if last attempt was > 1 hour ago
    const resetTime = Date.now() - LOCKOUT_RESET_MS;
    const shouldReset = user.lastFailedLogin && 
                       user.lastFailedLogin.getTime() < resetTime;

    const attempts = shouldReset ? 1 : user.failedLoginAttempts + 1;
    const shouldLock = attempts >= LOCKOUT_THRESHOLD;

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lastFailedLogin: new Date(),
        ...(shouldLock && {
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        }),
      },
    });

    // Log to audit system
    logger.warn('Failed login attempt', {
      userId,
      email,
      ip,
      attempts,
      locked: shouldLock,
    });

    // TODO (Sprint 2): Send alert email on lockout
    if (shouldLock) {
      (logger as any).security('Account lockout triggered', {
        userId,
        email,
        ip,
        attempts,
      });
    }
  }

  /**
   * SECURITY: Record failed attempt for non-existent user (prevent enumeration but log attack)
   */
  private static async recordFailedAttempt(email: string, ip: string) {
    (logger as any).security('Failed login attempt - unknown user', {
      email,
      ip,
    });
  }

  /**
   * Verify MFA token (simplified)
   */
  private static async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    // TODO: Implement real TOTP verification with speakeasy
    // For now, just check if token is 6 digits
    return /^\d{6}$/.test(token);
  }

  /**
   * Unlock account (admin only)
   */
  static async unlockAccount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { role, organizationId } = req.user;

      // Only admins can unlock accounts
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only administrators can unlock accounts',
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLogin: null,
        },
      });

      logger.info('Account unlocked by admin', {
        userId,
        unlockedBy: req.user.userId,
      });

      res.json({
        success: true,
        message: 'Account unlocked successfully',
      });
    } catch (error) {
      logger.error('Account unlock failed', { error });
      res.status(500).json({
        error: 'Unlock failed',
        message: 'An error occurred while unlocking the account',
      });
    }
  }
}
