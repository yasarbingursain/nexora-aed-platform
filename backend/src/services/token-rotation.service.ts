import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * SPRINT 2: Refresh Token Rotation Service
 * 
 * Implements token rotation to prevent replay attacks.
 * Each refresh generates a new token and invalidates the old one.
 * 
 * Security Standards:
 * - OWASP A07:2021 - Identification and Authentication Failures
 * - CWE-294: Authentication Bypass by Capture-replay
 * - RFC 6749 Section 10.4 - Refresh Token Protection
 * - NIST SP 800-63B - Token Binding
 */

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

interface AccessTokenPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

export class TokenRotationService {
  /**
   * Refresh access token with automatic rotation
   * Prevents token replay attacks by versioning
   */
  static async refreshWithRotation(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      // Verify refresh token signature
      let payload: RefreshTokenPayload;
      try {
        payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      } catch (error) {
        logger.warn('Invalid refresh token signature', {
          error: error instanceof Error ? error.message : 'Unknown',
          ip: req.ip,
        });
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Fetch session with user data
      const session = await prisma.userSession.findUnique({
        where: { id: payload.sessionId },
        include: {
          user: {
            include: { organization: true },
          },
        },
      });

      // Validate session exists and is active
      if (!session || !session.isActive) {
        logger.warn('Session not found or inactive', {
          sessionId: payload.sessionId,
          userId: payload.userId,
        });
        res.status(401).json({ error: 'Session expired or invalid' });
        return;
      }

      // Check session expiration
      if (session.expiresAt < new Date()) {
        logger.info('Session expired', {
          sessionId: session.id,
          userId: session.userId,
          expiredAt: session.expiresAt,
        });

        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false },
        });

        res.status(401).json({ error: 'Session expired' });
        return;
      }

      // CRITICAL: Verify token version to prevent replay attacks
      if (session.tokenVersion !== payload.tokenVersion) {
        logger.security('Token replay attack detected', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          expectedVersion: session.tokenVersion,
          receivedVersion: payload.tokenVersion,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        // Immediately invalidate session on replay attempt
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false },
        });

        res.status(401).json({
          error: 'Token replay detected',
          message: 'Session has been terminated for security reasons',
        });
        return;
      }

      // Verify user is still active
      if (!session.user.isActive) {
        logger.warn('Inactive user attempted token refresh', {
          userId: session.user.id,
          sessionId: session.id,
        });
        res.status(401).json({ error: 'User account is inactive' });
        return;
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: session.user.id,
          email: session.user.email,
          organizationId: session.user.organizationId,
          role: session.user.role,
        } as AccessTokenPayload,
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
      );

      // Increment token version for rotation
      const newTokenVersion = session.tokenVersion + 1;

      // Generate new refresh token with incremented version
      const newRefreshToken = jwt.sign(
        {
          userId: session.user.id,
          sessionId: session.id,
          tokenVersion: newTokenVersion,
        } as RefreshTokenPayload,
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
      );

      // Update session with new token and version
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          sessionToken: newRefreshToken,
          tokenVersion: newTokenVersion,
          lastRefreshedAt: new Date(),
          lastActivity: new Date(),
        },
      });

      logger.info('Token rotated successfully', {
        userId: session.user.id,
        sessionId: session.id,
        oldVersion: payload.tokenVersion,
        newVersion: newTokenVersion,
        ip: req.ip,
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900, // 15 minutes in seconds
      });
    } catch (error) {
      logger.error('Token rotation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'Unable to refresh authentication token',
      });
    }
  }

  /**
   * Revoke all user sessions (force re-login)
   * Used when password changes or security breach detected
   */
  static async revokeAllSessions(userId: string): Promise<number> {
    try {
      const result = await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: { isActive: false },
      });

      logger.security('All user sessions revoked', {
        userId,
        sessionsRevoked: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to revoke sessions', { userId, error });
      throw error;
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    try {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false },
      });

      logger.info('Session revoked', { sessionId });
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });
      throw error;
    }
  }

  /**
   * Clean up expired sessions (run as cron job)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              isActive: false,
              createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
            },
          ],
        },
      });

      logger.info('Expired sessions cleaned up', {
        sessionsDeleted: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup sessions', { error });
      throw error;
    }
  }

  /**
   * Get active sessions for user
   */
  static async getActiveSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }
}
