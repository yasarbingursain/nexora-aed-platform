import { Router } from 'express';
import { CacheController } from '@/controllers/cache.controller';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';

const router = Router();

// All cache routes require admin authentication
router.use(requireAuth);
router.use(requireRole('admin'));

/**
 * @route   GET /api/v1/admin/cache/stats
 * @desc    Get cache statistics
 * @access  Private (Admin only)
 */
router.get('/stats', CacheController.getStats);

/**
 * @route   DELETE /api/v1/admin/cache
 * @desc    Clear cache by pattern
 * @access  Private (Admin only)
 * @query   pattern: string, namespace: string (optional)
 */
router.delete('/', CacheController.clearCache);

/**
 * @route   DELETE /api/v1/admin/cache/flush
 * @desc    Flush all cache (dangerous)
 * @access  Private (Admin only)
 */
router.delete('/flush', CacheController.flushAll);

export default router;
