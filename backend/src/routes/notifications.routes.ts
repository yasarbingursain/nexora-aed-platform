/**
 * Notification API Routes
 * User notification management endpoints
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { notificationQueueService } from '@/services/notification-queue.service';
import { logger } from '@/utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const {
      limit = '50',
      offset = '0',
      includeRead = 'false',
      severity,
      type,
    } = req.query;

    const result = await notificationQueueService.getNotifications(userId, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      includeRead: includeRead === 'true',
      severity: severity as string,
      type: type as string,
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to get notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Failed to retrieve notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get unread notifications count
 * GET /api/v1/notifications/unread/count
 */
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const notifications = await notificationQueueService.getUnreadNotifications(userId, 1);
    const stats = await notificationQueueService.getStatistics(userId);

    res.json({
      count: stats.unread,
      bySeverity: stats.bySeverity,
      byType: stats.byType,
    });
  } catch (error) {
    logger.error('Failed to get unread count', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Failed to retrieve unread count',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get notification statistics
 * GET /api/v1/notifications/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const stats = await notificationQueueService.getStatistics(userId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get notification statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await notificationQueueService.markAsRead(id, userId);

    if (success) {
      res.json({ message: 'Notification marked as read', id });
    } else {
      res.status(404).json({ error: 'Notification not found or already read' });
    }
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
      notificationId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Mark all notifications as read
 * POST /api/v1/notifications/read-all
 */
router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationQueueService.markAllAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      count,
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
