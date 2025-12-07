import { Request, Response } from 'express';
import { cacheService } from '@/services/cache.service';
import { logger } from '@/utils/logger';
import { AuthenticatedUser } from '@/middleware/auth.middleware';

/**
 * Cache Controller
 * Admin endpoints for cache management
 */
export class CacheController {
  /**
   * Get cache statistics
   * GET /api/v1/admin/cache/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      res.status(500).json({ error: 'Failed to retrieve cache statistics' });
    }
  }

  /**
   * Clear cache by pattern
   * DELETE /api/v1/admin/cache?pattern=threats:*
   */
  static async clearCache(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;
      const { pattern, namespace } = req.query;

      if (!pattern) {
        return res.status(400).json({ error: 'Pattern is required' });
      }

      const count = await cacheService.deletePattern(
        pattern as string,
        namespace as string
      );

      logger.info('Cache cleared by admin', {
        pattern,
        namespace,
        count,
        adminUserId: user.userId,
      });

      res.json({
        success: true,
        message: `Cleared ${count} cache entries`,
        count,
      });
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }

  /**
   * Flush all cache (dangerous - admin only)
   * DELETE /api/v1/admin/cache/flush
   */
  static async flushAll(req: Request, res: Response) {
    try {
      const user = req.user as AuthenticatedUser;

      await cacheService.flushAll();

      logger.security('All cache flushed by admin', {
        adminUserId: user.userId,
        organizationId: user.organizationId,
      });

      res.json({
        success: true,
        message: 'All cache flushed successfully',
      });
    } catch (error) {
      logger.error('Failed to flush cache', { error });
      res.status(500).json({ error: 'Failed to flush cache' });
    }
  }
}
