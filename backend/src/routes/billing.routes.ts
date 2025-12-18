/**
 * Billing Routes
 * Handles subscription management, checkout, and webhooks
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { stripeService } from '@/services/stripe.service';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * GET /api/v1/billing/status
 * Get current subscription status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
        paymentStatus: true,
        trialEndsAt: true,
        maxUsers: true,
        maxIdentities: true,
        createdAt: true,
      },
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Calculate trial days remaining
    let trialDaysRemaining = null;
    if (org.paymentStatus === 'trial' && org.trialEndsAt) {
      const now = new Date();
      trialDaysRemaining = Math.max(
        0,
        Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    // Get usage counts
    const [userCount, identityCount] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.identity.count({ where: { organizationId } }),
    ]);

    res.json({
      subscription: {
        tier: org.subscriptionTier,
        status: org.paymentStatus,
        trialEndsAt: org.trialEndsAt,
        trialDaysRemaining,
      },
      limits: {
        maxUsers: org.maxUsers,
        maxIdentities: org.maxIdentities,
      },
      usage: {
        users: userCount,
        identities: identityCount,
      },
    });
  } catch (error) {
    logger.error('Failed to get billing status', { error });
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

/**
 * POST /api/v1/billing/checkout
 * Create a Stripe checkout session
 */
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tier } = req.body;
    if (!tier || !['foundation', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const session = await stripeService.createCheckoutSession(
      organizationId,
      tier,
      `${frontendUrl}/settings/billing/success`,
      `${frontendUrl}/settings/billing/cancel`
    );

    if (!session) {
      return res.status(503).json({ error: 'Billing service unavailable' });
    }
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error('Failed to create checkout session', { error });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/v1/billing/portal
 * Create a Stripe customer portal session
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const session = await stripeService.createPortalSession(
      organizationId,
      `${frontendUrl}/settings/billing`
    );

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Failed to create portal session', { error });
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * POST /api/v1/billing/cancel
 * Cancel subscription at period end
 */
router.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await stripeService.cancelSubscription(organizationId);

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/v1/billing/webhook
 * Handle Stripe webhooks (no auth required - verified by signature)
 */
router.post(
  '/webhook',
  // Raw body needed for signature verification
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      // req.body should be raw buffer for webhook verification
      const result = await stripeService.handleWebhook(req.body, signature);

      res.json(result);
    } catch (error) {
      logger.error('Webhook error', { error });
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

/**
 * GET /api/v1/billing/plans
 * Get available pricing plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  const plans = [
    {
      id: 'foundation',
      name: 'Foundation',
      description: 'Essential NHI security for growing teams',
      price: 2500,
      annualPrice: 30000,
      currency: 'USD',
      interval: 'month',
      features: [
        'AED - Autonomous Entity Defense',
        'Up to 500 identities',
        '25 team members',
        'Basic NHII visibility',
        'Standard threat detection',
        'Email support',
        '7-day free trial',
      ],
      limits: {
        maxUsers: 25,
        maxIdentities: 500,
      },
      valueProps: [
        'Prevents lateral movement via non-human identities',
        'Reduces dwell time (hours → minutes)',
        'Complete visibility of service accounts, API keys, tokens',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Complete NHI protection with advanced detection',
      price: 3500,
      annualPrice: 42000,
      currency: 'USD',
      interval: 'month',
      features: [
        'Everything in Foundation',
        'Up to 2,000 identities',
        '100 team members',
        'Full NHII + OSINT correlation',
        'ML behavioral detection',
        'Breach intelligence alerts',
        'Compliance reports (SOC2, ISO)',
        'Priority support',
      ],
      limits: {
        maxUsers: 100,
        maxIdentities: 2000,
      },
      recommended: true,
      valueProps: [
        'Detects compromised identities before attackers use them',
        'Correlates internal assets with real-world threat activity',
        'Turns breach intel into action',
        'Security teams act faster with less reliance on senior analysts',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Maximum protection with dedicated support',
      price: 4500,
      annualPrice: 54000,
      currency: 'USD',
      interval: 'month',
      features: [
        'Everything in Professional',
        'Unlimited identities',
        'Unlimited team members',
        'PQC-ready architecture',
        'SSO integration',
        'Custom integrations',
        'Dedicated success manager',
        'SLA guarantee',
        'Architecture reviews',
      ],
      limits: {
        maxUsers: -1,
        maxIdentities: -1,
      },
      valueProps: [
        'Long-term security posture with PQC readiness',
        'Future-proof buying decision',
        'Reduces ongoing operating expense, not just risk',
      ],
    },
  ];

  const addOns = [
    {
      id: 'autonomous_response',
      name: 'Autonomous Response Pack',
      description: 'Automated key rotation, service account quarantine, workflow orchestration',
      price: 1000,
      currency: 'USD',
      interval: 'month',
    },
    {
      id: 'compliance_audit',
      name: 'Compliance & Audit Pack',
      description: 'Evidence exports, audit-ready reporting, policy mappings (SOC2, ISO)',
      price: 750,
      currency: 'USD',
      interval: 'month',
    },
    {
      id: 'advanced_threat_intel',
      name: 'Advanced Threat Intelligence',
      description: 'Premium feeds, deeper correlation, custom alerts',
      price: 500,
      currency: 'USD',
      interval: 'month',
    },
    {
      id: 'enterprise_support',
      name: 'Enterprise Support / SLA',
      description: 'Faster response, dedicated channel, architecture reviews',
      price: 1000,
      currency: 'USD',
      interval: 'month',
    },
  ];

  res.json({ plans, addOns });
});

export default router;
