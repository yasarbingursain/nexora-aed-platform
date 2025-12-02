import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * Tenant Context Middleware
 * 
 * CRITICAL: Enforces multi-tenant isolation
 * - Extracts organizationId from JWT (set by auth middleware)
 * - Validates organization exists
 * - Adds tenant context to request
 * - MUST run AFTER auth middleware
 * - MUST run BEFORE all controllers
 * 
 * Security: Prevents cross-tenant data access
 */

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        organizationId: string;
        organization: {
          id: string;
          name: string;
          subscriptionTier: string;
          maxUsers: number;
          maxIdentities: number;
        };
      };
    }
  }
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract organizationId from JWT (set by auth middleware)
    const organizationId = req.user?.organizationId;

    // Validate organizationId exists
    if (!organizationId) {
      logger.warn('Tenant middleware: No organization context in JWT', {
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: 'No organization context',
        message: 'User is not associated with an organization',
      });
      return;
    }

    // Query organization from database
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        maxUsers: true,
        maxIdentities: true,
      },
    });

    // Validate organization exists
    if (!organization) {
      logger.error('Tenant middleware: Organization not found', {
        organizationId,
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
      });
      res.status(403).json({
        error: 'Organization not found',
        message: 'The organization associated with this user does not exist',
      });
      return;
    }

    // Add tenant context to request
    req.tenant = {
      organizationId,
      organization,
    };

    // Log tenant context (debug only)
    logger.debug('Tenant context established', {
      organizationId,
      organizationName: organization.name,
      userId: req.user?.userId,
      path: req.path,
      method: req.method,
    });

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error('Tenant middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.userId,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to establish tenant context',
    });
  }
};

/**
 * Usage in routes:
 * 
 * import { requireAuth } from '@/middleware/auth.middleware';
 * import { tenantMiddleware } from '@/middleware/tenant.middleware';
 * 
 * // Apply to all protected routes
 * router.get('/api/v1/identities', 
 *   requireAuth,           // First: Verify JWT
 *   tenantMiddleware,      // Second: Establish tenant context
 *   getIdentities          // Third: Execute controller
 * );
 * 
 * // In controller, all queries MUST use tenant context:
 * const identities = await prisma.identity.findMany({
 *   where: {
 *     organizationId: req.tenant.organizationId  // REQUIRED!
 *   }
 * });
 */
