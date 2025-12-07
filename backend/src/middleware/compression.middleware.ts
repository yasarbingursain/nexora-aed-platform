import compression from 'compression';
import { Request, Response } from 'express';

/**
 * PERFORMANCE: Response Compression Middleware
 * 
 * Compresses HTTP responses using gzip/deflate:
 * - Reduces bandwidth by 60-80%
 * - Faster response times
 * - Better user experience
 * 
 * Compression thresholds:
 * - Minimum size: 1KB
 * - Compression level: 6 (balanced)
 * - Skip already compressed content
 */

export const compressionMiddleware = compression({
  // Compression level (0-9, 6 is default balanced)
  level: 6,

  // Only compress responses larger than 1KB
  threshold: 1024,

  // Filter function to determine what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress already compressed content
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType) {
      const skipTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-gzip',
        'application/x-compress',
        'application/x-compressed',
      ];

      if (skipTypes.some(type => contentType.includes(type))) {
        return false;
      }
    }

    // Use compression filter
    return compression.filter(req, res);
  },
});
