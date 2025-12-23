/**
 * Notification Queue Service
 * Persistent Notification Storage for Offline Users
 * 
 * Features:
 * - Store notifications for offline users
 * - Mark as read/unread
 * - Notification expiry
 * - Priority-based delivery
 * - Batch retrieval
 * - Real-time delivery via WebSocket when user comes online
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { emailService } from './email.service';
import { Server as SocketIOServer } from 'socket.io';

// ============================================================================
// INTERFACES
// ============================================================================

export interface NotificationInput {
  userId: string;
  organizationId: string;
  type: 'security_alert' | 'api_key_rotation' | 'password_change' | 'account_lockout' | 'workflow_approval' | 'system_notification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
  sendEmail?: boolean;
  sendWebSocket?: boolean;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  emailSent: boolean;
  websocketSent: boolean;
  error?: string;
}

// ============================================================================
// NOTIFICATION QUEUE SERVICE
// ============================================================================

export class NotificationQueueService {
  private io?: SocketIOServer;

  setWebSocketServer(io: SocketIOServer): void {
    this.io = io;
    logger.info('WebSocket server attached to notification queue service');
  }

  /**
   * Queue a notification for a user
   */
  async queueNotification(input: NotificationInput): Promise<NotificationResult> {
    try {
      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          data: input.data ? JSON.stringify(input.data) : null,
          actionUrl: input.actionUrl,
          read: false,
          expiresAt: input.expiresAt,
        },
      });

      logger.info('Notification queued', {
        notificationId: notification.id,
        userId: input.userId,
        type: input.type,
        severity: input.severity,
      });

      let emailSent = false;
      let websocketSent = false;

      // Send via WebSocket if user is online
      if (input.sendWebSocket !== false && this.io) {
        try {
          this.io.to(`user:${input.userId}`).emit('notification', {
            id: notification.id,
            type: input.type,
            severity: input.severity,
            title: input.title,
            message: input.message,
            data: input.data,
            actionUrl: input.actionUrl,
            createdAt: notification.createdAt,
          });
          websocketSent = true;
          logger.debug('WebSocket notification sent', { notificationId: notification.id });
        } catch (error) {
          logger.error('WebSocket notification failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            notificationId: notification.id,
          });
        }
      }

      // Send email for high/critical severity or if explicitly requested
      if (
        (input.sendEmail !== false && (input.severity === 'high' || input.severity === 'critical')) ||
        input.sendEmail === true
      ) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true, fullName: true },
          });

          if (user && emailService.isConfigured()) {
            await emailService.sendSecurityAlert(
              user.email,
              user.fullName || 'User',
              input.severity,
              input.title,
              input.message,
              input.actionUrl,
              input.data
            );
            emailSent = true;
            logger.info('Email notification sent', { notificationId: notification.id, to: user.email });
          }
        } catch (error) {
          logger.error('Email notification failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            notificationId: notification.id,
          });
        }
      }

      return {
        success: true,
        notificationId: notification.id,
        emailSent,
        websocketSent,
      };
    } catch (error) {
      logger.error('Failed to queue notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: input.userId,
        type: input.type,
      });

      return {
        success: false,
        emailSent: false,
        websocketSent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string, limit: number = 50) {
    return prisma.notification.findMany({
      where: {
        userId,
        read: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get all notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      includeRead?: boolean;
      severity?: string;
      type?: string;
    } = {}
  ) {
    const where: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (!options.includeRead) {
      where.read = false;
    }

    if (options.severity) {
      where.severity = options.severity;
    }

    if (options.type) {
      where.type = options.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { read: 'asc' },
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(n => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
      total,
      unread: notifications.filter(n => !n.read).length,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      logger.debug('Notification marked as read', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
      });
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      logger.info('All notifications marked as read', { userId, count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return 0;
    }
  }

  /**
   * Delete expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info('Expired notifications cleaned up', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getStatistics(userId: string) {
    const [total, unread, bySeverity, byType] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      prisma.notification.groupBy({
        by: ['severity'],
        where: {
          userId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        _count: true,
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: {
          userId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        _count: true,
      }),
    ]);

    return {
      total,
      unread,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Send notification to multiple users
   */
  async broadcastNotification(
    userIds: string[],
    organizationId: string,
    type: NotificationInput['type'],
    severity: NotificationInput['severity'],
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      const result = await this.queueNotification({
        userId,
        organizationId,
        type,
        severity,
        title,
        message,
        data,
        actionUrl,
      });

      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info('Broadcast notification completed', {
      userIds: userIds.length,
      success,
      failed,
      type,
      severity,
    });

    return { success, failed };
  }

  /**
   * Start cleanup job for expired notifications
   */
  startCleanupJob(intervalMinutes: number = 60): NodeJS.Timeout {
    const interval = setInterval(async () => {
      await this.cleanupExpiredNotifications();
    }, intervalMinutes * 60 * 1000);

    logger.info('Notification cleanup job started', { intervalMinutes });
    return interval;
  }
}

export const notificationQueueService = new NotificationQueueService();
