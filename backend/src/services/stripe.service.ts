/**
 * Stripe Integration Service
 * Handles payment processing, subscriptions, and webhooks
 * 
 * Features:
 * - Checkout session creation
 * - Subscription management
 * - Webhook handling
 * - Customer portal
 * - Invoice management
 */

import Stripe from 'stripe';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// Initialize Stripe with API version (graceful handling for development without real keys)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = stripeKey.startsWith('sk_') 
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null;

if (!stripe) {
  logger.warn('Stripe not configured - billing features will be disabled');
}

// Price IDs for each tier (configure in Stripe Dashboard)
const PRICE_IDS = {
  foundation: process.env.STRIPE_PRICE_FOUNDATION || 'price_foundation',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

// Tier configuration
const TIER_CONFIG = {
  foundation: {
    maxUsers: 25,
    maxIdentities: 500,
    price: 250000, // $2,500.00 in cents
    annualPrice: 3000000, // $30,000.00 in cents
  },
  professional: {
    maxUsers: 100,
    maxIdentities: 2000,
    price: 350000, // $3,500.00 in cents
    annualPrice: 4200000, // $42,000.00 in cents
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxIdentities: -1, // unlimited
    price: 450000, // $4,500.00 in cents
    annualPrice: 5400000, // $54,000.00 in cents
  },
};

export class StripeService {
  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(
    organizationId: string,
    tier: keyof typeof PRICE_IDS,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session | null> {
    if (!stripe) {
      logger.warn('Stripe not configured - checkout disabled');
      throw new Error('Billing is not configured. Please contact support.');
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, stripeCustomerId: true },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const priceId = PRICE_IDS[tier];
      if (!priceId) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          organizationId,
          tier,
        },
        subscription_data: {
          metadata: {
            organizationId,
            tier,
          },
        },
        allow_promotion_codes: true,
      };

      // Use existing customer if available
      if (org.stripeCustomerId) {
        sessionConfig.customer = org.stripeCustomerId;
      } else {
        sessionConfig.customer_creation = 'always';
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      logger.info('Checkout session created', {
        organizationId,
        tier,
        sessionId: session.id,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create checkout session', {
        organizationId,
        tier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a customer portal session for managing subscription
   */
  async createPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { stripeCustomerId: true },
      });

      if (!org?.stripeCustomerId) {
        throw new Error('No Stripe customer found for organization');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: returnUrl,
      });

      logger.info('Portal session created', {
        organizationId,
        sessionId: session.id,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create portal session', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<{ received: boolean; type: string }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw new Error('Webhook signature verification failed');
    }

    logger.info('Webhook received', { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.debug('Unhandled webhook event', { type: event.type });
    }

    return { received: true, type: event.type };
  }

  /**
   * Handle successful checkout completion
   */
  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const { organizationId, tier } = session.metadata || {};

    if (!organizationId) {
      logger.error('No organizationId in checkout session metadata');
      return;
    }

    const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.foundation;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        subscriptionTier: tier || 'foundation',
        paymentStatus: 'active',
        trialEndsAt: null, // Clear trial
        maxUsers: tierConfig.maxUsers,
        maxIdentities: tierConfig.maxIdentities,
      },
    });

    logger.info('Checkout completed - organization updated', {
      organizationId,
      tier,
      customerId: session.customer,
      subscriptionId: session.subscription,
    });
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const { organizationId, tier } = subscription.metadata || {};

    if (!organizationId) {
      logger.warn('No organizationId in subscription metadata');
      return;
    }

    let paymentStatus = 'active';
    if (subscription.status === 'past_due') {
      paymentStatus = 'past_due';
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      paymentStatus = 'canceled';
    } else if (subscription.status === 'trialing') {
      paymentStatus = 'trial';
    }

    const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.foundation;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionTier: tier || 'foundation',
        paymentStatus,
        maxUsers: tierConfig.maxUsers,
        maxIdentities: tierConfig.maxIdentities,
      },
    });

    logger.info('Subscription updated', {
      organizationId,
      subscriptionId: subscription.id,
      status: subscription.status,
      paymentStatus,
    });
  }

  /**
   * Handle subscription deletion/cancellation
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const { organizationId } = subscription.metadata || {};

    if (!organizationId) {
      logger.warn('No organizationId in subscription metadata');
      return;
    }

    // Downgrade to free tier
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeSubscriptionId: null,
        subscriptionTier: 'free',
        paymentStatus: 'canceled',
        maxUsers: 5,
        maxIdentities: 100,
      },
    });

    logger.info('Subscription deleted - downgraded to free', {
      organizationId,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      logger.warn('No organization found for customer', { customerId });
      return;
    }

    // Ensure payment status is active
    if (org.paymentStatus !== 'active') {
      await prisma.organization.update({
        where: { id: org.id },
        data: { paymentStatus: 'active' },
      });
    }

    logger.info('Payment succeeded', {
      organizationId: org.id,
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      logger.warn('No organization found for customer', { customerId });
      return;
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { paymentStatus: 'past_due' },
    });

    logger.warn('Payment failed', {
      organizationId: org.id,
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
    });

    // TODO: Send email notification about failed payment
  }

  /**
   * Get subscription details for an organization
   */
  async getSubscription(organizationId: string): Promise<{
    tier: string;
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  } | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          subscriptionTier: true,
          paymentStatus: true,
          stripeSubscriptionId: true,
        },
      });

      if (!org) {
        return null;
      }

      let subscriptionDetails: any = {
        tier: org.subscriptionTier,
        status: org.paymentStatus,
      };

      // Get additional details from Stripe if subscription exists
      if (org.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        subscriptionDetails.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        subscriptionDetails.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      }

      return subscriptionDetails;
    } catch (error) {
      logger.error('Failed to get subscription', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(organizationId: string): Promise<boolean> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { stripeSubscriptionId: true },
      });

      if (!org?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info('Subscription scheduled for cancellation', {
        organizationId,
        subscriptionId: org.stripeSubscriptionId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const stripeService = new StripeService();
