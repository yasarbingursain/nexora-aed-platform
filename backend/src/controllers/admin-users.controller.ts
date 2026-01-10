import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { AuthenticatedUser } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';
import { emailService } from '@/services/email.service';

/**
 * Admin User Management Controller
 * 
 * SECURITY: All endpoints require admin role
 * Handles CRUD operations for user management
 */

export class AdminUsersController {
  /**
   * List all users in organization
   * GET /api/v1/auth/users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { page = 1, limit = 20, role, isActive, search } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Build filter
      const where: any = {
        organizationId: authUser.organizationId,
      };

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { fullName: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Execute query with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            mfaEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to list users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list users',
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/auth/users/:id
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { id } = req.params;

      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: authUser.organizationId,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          sessions: {
            where: { isActive: true },
            select: {
              id: true,
              deviceInfo: true,
              ipAddress: true,
              lastActivity: true,
              createdAt: true,
            },
            orderBy: { lastActivity: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Failed to get user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id,
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve user',
      });
    }
  }

  /**
   * Create new user
   * POST /api/v1/auth/users
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { email, fullName, role = 'user', password, sendWelcomeEmail = true } = req.body;

      // Validate input
      if (!email || !fullName || !password) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email, full name, and password are required',
        });
        return;
      }

      // Validate role
      const validRoles = ['user', 'analyst', 'admin'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          error: 'Validation error',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email already exists',
        });
        return;
      }

      // Check user limit for organization
      const organization = await prisma.organization.findUnique({
        where: { id: authUser.organizationId },
        select: { maxUsers: true },
      });

      if (organization) {
        const currentUserCount = await prisma.user.count({
          where: { organizationId: authUser.organizationId },
        });

        if (currentUserCount >= organization.maxUsers) {
          res.status(403).json({
            error: 'Limit exceeded',
            message: `Organization has reached maximum user limit (${organization.maxUsers})`,
          });
          return;
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email,
          fullName,
          role,
          passwordHash,
          organizationId: authUser.organizationId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Send welcome email
      if (sendWelcomeEmail && emailService.isConfigured()) {
        try {
          await emailService.sendEmail({
            to: email,
            subject: 'Welcome to Nexora AED Platform',
            html: `
              <h2>Welcome to Nexora AED Platform</h2>
              <p>Hello ${fullName},</p>
              <p>Your account has been created by an administrator.</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Role:</strong> ${role}</p>
              <p>Please log in and change your password immediately.</p>
              <p>If you have any questions, please contact your administrator.</p>
            `,
            metadata: {
              type: 'welcome',
              userId: newUser.id,
              organizationId: authUser.organizationId,
            },
          });
        } catch (emailError) {
          logger.warn('Failed to send welcome email', {
            userId: newUser.id,
            email,
            error: emailError,
          });
        }
      }

      logger.info('User created by admin', {
        userId: newUser.id,
        email,
        role,
        createdBy: authUser.userId,
        organizationId: authUser.organizationId,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser,
      });
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create user',
      });
    }
  }

  /**
   * Update user
   * PATCH /api/v1/auth/users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { id } = req.params;
      const { fullName, role, isActive } = req.body;

      // Verify user exists and belongs to organization
      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: authUser.organizationId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      // Prevent self-demotion from admin
      if (id === authUser.userId && role && role !== 'admin') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot change your own admin role',
        });
        return;
      }

      // Validate role if provided
      if (role) {
        const validRoles = ['user', 'analyst', 'admin'];
        if (!validRoles.includes(role)) {
          res.status(400).json({
            error: 'Validation error',
            message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          });
          return;
        }
      }

      // Build update data
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      logger.info('User updated by admin', {
        userId: id,
        updatedFields: Object.keys(updateData),
        updatedBy: authUser.userId,
        organizationId: authUser.organizationId,
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Failed to update user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id,
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update user',
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/auth/users/:id
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { id } = req.params;

      // Verify user exists and belongs to organization
      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: authUser.organizationId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      // Prevent self-deletion
      if (id === authUser.userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot delete your own account',
        });
        return;
      }

      // Soft delete: deactivate user instead of hard delete
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          // Invalidate all sessions
          sessions: {
            updateMany: {
              where: { isActive: true },
              data: { isActive: false },
            },
          },
        },
      });

      logger.info('User deleted by admin', {
        userId: id,
        email: user.email,
        deletedBy: authUser.userId,
        organizationId: authUser.organizationId,
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id,
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete user',
      });
    }
  }

  /**
   * Reset user password (admin action)
   * POST /api/v1/auth/users/:id/reset-password
   */
  static async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { id } = req.params;
      const { newPassword, sendEmail = true } = req.body;

      if (!newPassword) {
        res.status(400).json({
          error: 'Validation error',
          message: 'New password is required',
        });
        return;
      }

      // Verify user exists and belongs to organization
      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: authUser.organizationId,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear lockout
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Invalidate all sessions
      await prisma.userSession.updateMany({
        where: { userId: id },
        data: { isActive: false },
      });

      // Send notification email
      if (sendEmail && emailService.isConfigured()) {
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: 'Password Reset by Administrator',
            html: `
              <h2>Password Reset Notification</h2>
              <p>Hello ${user.fullName},</p>
              <p>Your password has been reset by an administrator.</p>
              <p>Please log in with your new password and change it immediately.</p>
              <p>All active sessions have been terminated for security.</p>
              <p>If you did not request this change, please contact your administrator immediately.</p>
            `,
            metadata: {
              type: 'password_reset',
              userId: id,
              organizationId: authUser.organizationId,
            },
          });
        } catch (emailError) {
          logger.warn('Failed to send password reset email', {
            userId: id,
            email: user.email,
            error: emailError,
          });
        }
      }

      logger.info('User password reset by admin', {
        userId: id,
        email: user.email,
        resetBy: authUser.userId,
        organizationId: authUser.organizationId,
      });

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Failed to reset user password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id,
        organizationId: (req.user as AuthenticatedUser)?.organizationId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reset password',
      });
    }
  }
}
