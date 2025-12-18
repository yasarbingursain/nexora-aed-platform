import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { AuthenticatedUser } from '@/middleware/auth.middleware';
import { getClientIP, getUserAgent } from '@/utils/request-helpers';
import { accountLockoutService } from '@/services/account-lockout.service';
import { logger } from '@/utils/logger';

export class AuthController {
  // Register new organization and first user
  static async register(req: Request, res: Response): Promise<Response | void> {
    try {
      const { organizationName, email, password, fullName } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email already exists',
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create organization and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization with 7-day trial
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            subscriptionTier: 'free',
            maxUsers: 5,
            maxIdentities: 100,
            trialEndsAt,
            paymentStatus: 'trial',
          },
        });

        // Create first user (admin)
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            role: 'admin',
            organizationId: organization.id,
          },
        });

        return { organization, user };
      });

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          userId: result.user.id,
          organizationId: result.organization.id,
          email: result.user.email,
          role: result.user.role,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: result.user.id },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Create user session
      await prisma.userSession.create({
        data: {
          userId: result.user.id,
          sessionToken: accessToken,
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          deviceInfo: getUserAgent(req),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      res.status(201).json({
        message: 'Organization and user created successfully',
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          subscriptionTier: result.organization.subscriptionTier,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create account. Please try again.',
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, password, mfaToken } = req.body;
      const clientIp = getClientIP(req);

      // SECURITY: Check if account is locked (CWE-307)
      const lockStatus = await accountLockoutService.isLocked(email, clientIp);
      if (lockStatus.locked) {
        logger.warn('Login attempt on locked account', {
          email,
          ip: clientIp,
          lockoutUntil: lockStatus.lockoutUntil,
        });

        res.status(423).json({
          error: 'Account locked',
          message: lockStatus.reason,
          lockedUntil: lockStatus.lockoutUntil,
        });
        return;
      }

      // Find user with organization
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (!user || !user.isActive) {
        // SECURITY: Record failed attempt
        await accountLockoutService.recordFailedAttempt(email, clientIp, 'user_not_found');
        
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials',
          remainingAttempts: lockStatus.remainingAttempts ? lockStatus.remainingAttempts - 1 : undefined,
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // SECURITY: Record failed attempt
        await accountLockoutService.recordFailedAttempt(email, clientIp, 'invalid_password');
        
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials',
          remainingAttempts: lockStatus.remainingAttempts ? lockStatus.remainingAttempts - 1 : undefined,
        });
        return;
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          res.status(200).json({
            requiresMfa: true,
            message: 'MFA token required',
          });
          return;
        }

        const isValidMfa = speakeasy.totp.verify({
          secret: user.mfaSecret!,
          encoding: 'base32',
          token: mfaToken,
          window: 2, // Allow 2 time steps before/after
        });

        if (!isValidMfa) {
          // SECURITY: Record failed MFA attempt
          await accountLockoutService.recordFailedAttempt(email, clientIp, 'invalid_mfa');
          
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid MFA token',
            remainingAttempts: lockStatus.remainingAttempts ? lockStatus.remainingAttempts - 1 : undefined,
          });
          return;
        }
      }

      // SECURITY: Clear failed attempts on successful authentication
      await accountLockoutService.clearFailedAttempts(email, clientIp);

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          email: user.email,
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
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Update last login and create session
      await Promise.all([
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }),
        prisma.userSession.create({
          data: {
            userId: user.id,
            sessionToken: accessToken,
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            deviceInfo: getUserAgent(req),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          subscriptionTier: user.organization.subscriptionTier,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Unable to authenticate. Please try again.',
      });
    }
  }

  // Refresh access token
  static async refresh(req: Request, res: Response): Promise<Response | void> {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };

      // Check if refresh token exists in database
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            include: { organization: true },
          },
        },
      });

      if (!tokenRecord || !tokenRecord.user.isActive) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: 'Refresh token is invalid or expired',
        });
        return;
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: tokenRecord.user.id,
          organizationId: tokenRecord.user.organizationId,
          email: tokenRecord.user.email,
          role: tokenRecord.user.role,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
      );

      res.json({
        message: 'Token refreshed successfully',
        accessToken,
        user: {
          id: tokenRecord.user.id,
          email: tokenRecord.user.email,
          fullName: tokenRecord.user.fullName,
          role: tokenRecord.user.role,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Unable to refresh token. Please login again.',
      });
    }
  }

  // Logout user
  static async logout(req: Request, res: Response): Promise<Response | void> {
    try {
      const { refreshToken } = req.body;
      const user = req.user as AuthenticatedUser;

      // Remove refresh token from database
      if (refreshToken) {
        await prisma.refreshToken.deleteMany({
          where: {
            token: refreshToken,
            userId: user.userId,
          },
        });
      }

      // Deactivate user sessions
      await prisma.userSession.updateMany({
        where: {
          userId: user.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: 'Unable to logout. Please try again.',
      });
    }
  }

  // Setup MFA
  static async setupMfa(req: Request, res: Response): Promise<Response | void> {
    try {
      const user = req.user as AuthenticatedUser;

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `Nexora (${user.email})`,
        issuer: 'Nexora AED Platform',
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Store secret temporarily (not enabled until verified)
      await prisma.user.update({
        where: { id: user.userId },
        data: { mfaSecret: secret.base32 },
      });

      res.json({
        message: 'MFA setup initiated',
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
      });
    } catch (error) {
      console.error('MFA setup error:', error);
      res.status(500).json({
        error: 'MFA setup failed',
        message: 'Unable to setup MFA. Please try again.',
      });
    }
  }

  // Verify and enable MFA
  static async verifyMfa(req: Request, res: Response): Promise<Response | void> {
    try {
      const { token } = req.body;
      const user = req.user as AuthenticatedUser;

      // Get user's MFA secret
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { mfaSecret: true },
      });

      if (!userData?.mfaSecret) {
        res.status(400).json({
          error: 'MFA not setup',
          message: 'MFA secret not found. Please setup MFA first.',
        });
        return;
      }

      // Verify MFA token
      const isValid = speakeasy.totp.verify({
        secret: userData.mfaSecret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid MFA token',
          message: 'The provided MFA token is invalid.',
        });
      }

      // Enable MFA
      await prisma.user.update({
        where: { id: user.userId },
        data: { mfaEnabled: true },
      });

      res.json({
        message: 'MFA enabled successfully',
        mfaEnabled: true,
      });
    } catch (error) {
      console.error('MFA verification error:', error);
      res.status(500).json({
        error: 'MFA verification failed',
        message: 'Unable to verify MFA. Please try again.',
      });
    }
  }

  // Disable MFA
  static async disableMfa(req: Request, res: Response): Promise<Response | void> {
    try {
      const user = req.user as AuthenticatedUser;

      await prisma.user.update({
        where: { id: user.userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
        },
      });

      res.json({
        message: 'MFA disabled successfully',
        mfaEnabled: false,
      });
    } catch (error) {
      console.error('MFA disable error:', error);
      res.status(500).json({
        error: 'MFA disable failed',
        message: 'Unable to disable MFA. Please try again.',
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      const user = req.user as AuthenticatedUser;

      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          organization: true,
          sessions: {
            where: { isActive: true },
            orderBy: { lastActivity: 'desc' },
            take: 5,
          },
        },
      });

      if (!userData) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found',
        });
      }

      res.json({
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          mfaEnabled: userData.mfaEnabled,
          lastLoginAt: userData.lastLoginAt,
          createdAt: userData.createdAt,
        },
        organization: {
          id: userData.organization.id,
          name: userData.organization.name,
          subscriptionTier: userData.organization.subscriptionTier,
          maxUsers: userData.organization.maxUsers,
          maxIdentities: userData.organization.maxIdentities,
        },
        activeSessions: userData.sessions.map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          lastActivity: session.lastActivity,
          createdAt: session.createdAt,
        })),
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Unable to fetch profile. Please try again.',
      });
    }
  }

  // Forgot Password - Request password reset
  static async forgotPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, fullName: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: resetTokenExpiry,
        },
      });

      // Generate reset URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

      // TODO: Send email with reset link
      // For now, log the reset URL (in production, send via email service)
      console.log(`Password reset requested for ${email}. Reset URL: ${resetUrl}`);

      // In production, integrate with email service like SendGrid, AWS SES, etc.
      // await emailService.sendPasswordResetEmail(user.email, user.fullName, resetUrl);

      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Password reset request failed',
        message: 'Unable to process password reset request. Please try again.',
      });
    }
  }

  // Reset Password - Set new password using reset token
  static async resetPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { token, newPassword } = req.body;

      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'Password reset token is invalid or has expired. Please request a new one.',
        });
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Invalidate all existing sessions
      await prisma.userSession.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      });

      res.json({
        message: 'Password has been reset successfully. Please login with your new password.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'Unable to reset password. Please try again.',
      });
    }
  }

  // Change Password - For authenticated users
  static async changePassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const authUser = req.user as AuthenticatedUser;

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found.',
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect.',
        });
      }

      // Ensure new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'Same password',
          message: 'New password must be different from current password.',
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Optionally invalidate other sessions (keep current session active)
      // await prisma.userSession.updateMany({
      //   where: { userId: user.id, sessionToken: { not: req.headers.authorization?.split(' ')[1] } },
      //   data: { isActive: false },
      // });

      res.json({
        message: 'Password changed successfully.',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Password change failed',
        message: 'Unable to change password. Please try again.',
      });
    }
  }
}
