import { prisma } from '@/config/database';

export class BillingService {
  
  async getBillingOverview() {
    const organizations = await prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            identities: true
          }
        }
      }
    });

    const tierPricing: Record<string, number> = {
      'free': 0,
      'foundation': 2500,
      'professional': 3500,
      'enterprise': 4500
    };

    let totalRevenue = 0;
    const billingData = organizations.map(org => {
      const monthlyRevenue = tierPricing[org.subscriptionTier] || 0;
      totalRevenue += monthlyRevenue;
      
      return {
        organizationId: org.id,
        organizationName: org.name,
        tier: org.subscriptionTier,
        monthlyRevenue,
        users: org._count.users,
        identities: org._count.identities,
        nextBillingDate: this.getNextBillingDate(org.createdAt)
      };
    });

    return {
      totalCustomers: organizations.length,
      monthlyRevenue: totalRevenue,
      annualRevenue: totalRevenue * 12,
      organizations: billingData
    };
  }

  async getOrganizationBilling(organizationId: string) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            identities: true
          }
        }
      }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const tierPricing: Record<string, number> = {
      'free': 0,
      'foundation': 2500,
      'professional': 3500,
      'enterprise': 4500
    };

    const monthlyRevenue = tierPricing[organization.subscriptionTier] || 0;

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      tier: organization.subscriptionTier,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      users: organization._count.users,
      identities: organization._count.identities,
      maxUsers: organization.maxUsers,
      maxIdentities: organization.maxIdentities,
      billingCycle: 'monthly',
      nextBillingDate: this.getNextBillingDate(organization.createdAt),
      paymentStatus: 'active'
    };
  }

  private getNextBillingDate(createdAt: Date): string {
    const now = new Date();
    const nextBilling = new Date(createdAt);
    
    while (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    return nextBilling.toISOString();
  }
}

export const billingService = new BillingService();
