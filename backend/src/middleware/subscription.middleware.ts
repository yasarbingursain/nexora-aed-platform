/**
 * Subscription Middleware
 * Enforces trial expiration and subscription status checks
 * 
 * Features:
 * - 7-day trial enforcement
 * - Payment status validation
 * - Tier-based feature gating
 * - Grace period handling
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// Tier limits configuration - Enterprise pricing: $2,500 / $3,500 / $4,500 per month
const TIER_LIMITS = {
  free: {
    maxUsers: 5,
    maxIdentities: 50,
    features: ['basic_dashboard', 'basic_threats', 'basic_identities'],
  },
  foundation: {
    maxUsers: 25,
    maxIdentities: 500,
    features: [
      'basic_dashboard',
      'basic_threats',
      'basic_identities',
      'aed_defense',
      'nhii_visibility',
      'standard_detection',
      'email_support',
    ],
  },
  professional: {
    maxUsers: 100,
    maxIdentities: 2000,
    features: [
      'basic_dashboard',
      'basic_threats',
      'basic_identities',
      'aed_defense',
      'nhii_visibility',
      'ml_detection',
      'osint_correlation',
      'breach_intelligence',
      'compliance_reports',
      'nhiti_network',
      'priority_support',
    ],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxIdentities: -1, // unlimited
    features: [
      'basic_dashboard',
      'basic_threats',
      'basic_identities',
      'aed_defense',
      'nhii_visibility',
      'ml_detection',
      'osint_correlation',
      'breach_intelligence',
      'compliance_reports',
      'nhiti_network',
      'pqc_architecture',
      'sso_integration',
      'custom_integrations',
      'dedicated_support',
      'sla_guarantee',
      'architecture_reviews',
      'api_access',
    ],
  },
};

/**
 * Check subscription status and trial expiration
 * Returns 402 Payment Required if trial expired or payment past due
 */
export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    
    // Skip for unauthenticated requests (handled by auth middleware)
    if (!organizationId) {
      next();
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        trialEndsAt: true,
        paymentStatus: true,
        subscriptionTier: true,
        maxUsers: true,
        maxIdentities: true,
      },
    });

    if (!org) {
      res.status(404).json({
        error: 'Organization not found',
        message: 'Your organization could not be found.',
      });
      return;
    }

    const now = new Date();

    // Check trial expiration
    if (org.paymentStatus === 'trial' && org.trialEndsAt) {
      if (now > org.trialEndsAt) {
        logger.warn('Trial expired', {
          organizationId: org.id,
          organizationName: org.name,
          trialEndsAt: org.trialEndsAt,
        });

        res.status(402).json({
          error: 'Trial expired',
          code: 'TRIAL_EXPIRED',
          message: 'Your 7-day free trial has ended. Please upgrade to continue using Nexora.',
          upgradeUrl: '/pricing',
          trialEndedAt: org.trialEndsAt,
        });
        return;
      }

      // Add trial info to request for UI display
      const daysRemaining = Math.ceil(
        (org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      req.trialInfo = {
        isTrialing: true,
        daysRemaining,
        trialEndsAt: org.trialEndsAt,
      };
    }

    // Check for past due payments
    if (org.paymentStatus === 'past_due') {
      logger.warn('Payment past due', {
        organizationId: org.id,
        organizationName: org.name,
      });

      res.status(402).json({
        error: 'Payment required',
        code: 'PAYMENT_PAST_DUE',
        message: 'Your payment is past due. Please update your payment method to continue.',
        billingUrl: '/settings/billing',
      });
      return;
    }

    // Check for canceled subscription
    if (org.paymentStatus === 'canceled') {
      logger.warn('Subscription canceled', {
        organizationId: org.id,
        organizationName: org.name,
      });

      res.status(402).json({
        error: 'Subscription canceled',
        code: 'SUBSCRIPTION_CANCELED',
        message: 'Your subscription has been canceled. Please resubscribe to continue.',
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Add subscription info to request
    req.subscription = {
      tier: org.subscriptionTier,
      paymentStatus: org.paymentStatus,
      maxUsers: org.maxUsers,
      maxIdentities: org.maxIdentities,
    };

    next();
  } catch (error) {
    logger.error('Subscription check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });
    next(error);
  }
};

/**
 * Check if a specific feature is available for the organization's tier
 */
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tier = req.subscription?.tier || 'free';
      const tierConfig = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

      if (!tierConfig.features.includes(feature)) {
        logger.warn('Feature not available for tier', {
          feature,
          tier,
          organizationId: req.user?.organizationId,
        });

        res.status(403).json({
          error: 'Feature not available',
          code: 'FEATURE_NOT_AVAILABLE',
          message: `The "${feature}" feature is not available on your current plan.`,
          currentTier: tier,
          upgradeUrl: '/pricing',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check user limit for organization
 */
export const checkUserLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      next();
      return;
    }

    const [org, userCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { maxUsers: true, subscriptionTier: true },
      }),
      prisma.user.count({
        where: { organizationId },
      }),
    ]);

    if (!org) {
      next();
      return;
    }

    // -1 means unlimited
    if (org.maxUsers !== -1 && userCount >= org.maxUsers) {
      res.status(403).json({
        error: 'User limit reached',
        code: 'USER_LIMIT_REACHED',
        message: `Your organization has reached the maximum of ${org.maxUsers} users.`,
        currentCount: userCount,
        maxAllowed: org.maxUsers,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check identity limit for organization
 */
export const checkIdentityLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      next();
      return;
    }

    const [org, identityCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { maxIdentities: true, subscriptionTier: true },
      }),
      prisma.identity.count({
        where: { organizationId },
      }),
    ]);

    if (!org) {
      next();
      return;
    }

    // -1 means unlimited
    if (org.maxIdentities !== -1 && identityCount >= org.maxIdentities) {
      res.status(403).json({
        error: 'Identity limit reached',
        code: 'IDENTITY_LIMIT_REACHED',
        message: `Your organization has reached the maximum of ${org.maxIdentities} identities.`,
        currentCount: identityCount,
        maxAllowed: org.maxIdentities,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      trialInfo?: {
        isTrialing: boolean;
        daysRemaining: number;
        trialEndsAt: Date;
      };
      subscription?: {
        tier: string;
        paymentStatus: string;
        maxUsers: number;
        maxIdentities: number;
      };
    }
  }
}
