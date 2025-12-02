import { prisma } from '@/config/database';
import { OrganizationStatus } from '@prisma/client';

export interface CreateOrganizationDto {
  name: string;
  domain?: string;
  subscriptionTier?: string;
  maxUsers?: number;
  maxIdentities?: number;
  settings?: any;
}

export interface UpdateOrganizationDto {
  name?: string;
  domain?: string;
  subscriptionTier?: string;
  maxUsers?: number;
  maxIdentities?: number;
  settings?: any;
}

export interface OrganizationFilters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export class OrganizationService {
  
  async getAllOrganizations(filters: OrganizationFilters) {
    const { page, limit, search, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (status) {
      where.status = status as OrganizationStatus;
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              identities: true,
              threats: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.count({ where })
    ]);

    return { organizations, total };
  }

  async getOrganizationById(id: string) {
    return await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            lastLoginAt: true
          }
        },
        identities: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeenAt: true
          },
          take: 10,
          orderBy: { lastSeenAt: 'desc' }
        },
        _count: {
          select: {
            users: true,
            identities: true,
            threats: true
          }
        }
      }
    });
  }

  async createOrganization(data: CreateOrganizationDto & { createdBy: string }) {
    return await prisma.organization.create({
      data: {
        name: data.name,
        domain: data.domain,
        status: OrganizationStatus.ACTIVE,
        subscriptionTier: data.subscriptionTier || 'free',
        maxUsers: data.maxUsers || 5,
        maxIdentities: data.maxIdentities || 100,
        settings: data.settings ? JSON.stringify(data.settings) : '{}'
      }
    });
  }

  async updateOrganization(id: string, data: UpdateOrganizationDto) {
    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.name) updateData.name = data.name;
    if (data.domain) updateData.domain = data.domain;
    if (data.subscriptionTier) updateData.subscriptionTier = data.subscriptionTier;
    if (data.maxUsers) updateData.maxUsers = data.maxUsers;
    if (data.maxIdentities) updateData.maxIdentities = data.maxIdentities;
    if (data.settings) updateData.settings = JSON.stringify(data.settings);

    return await prisma.organization.update({
      where: { id },
      data: updateData
    });
  }

  async deleteOrganization(id: string) {
    return await prisma.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.DELETED,
        deletedAt: new Date()
      }
    });
  }

  async suspendOrganization(id: string, reason: string) {
    return await prisma.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspensionReason: reason
      }
    });
  }

  async reactivateOrganization(id: string) {
    return await prisma.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null
      }
    });
  }

  async getOrganizationStats(id: string) {
    const [userCount, identityCount, threatCount, activeThreats] = await Promise.all([
      prisma.user.count({ where: { organizationId: id } }),
      prisma.identity.count({ where: { organizationId: id } }),
      prisma.threat.count({ 
        where: { 
          organizationId: id,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.threat.count({ 
        where: { 
          organizationId: id,
          status: 'open'
        }
      })
    ]);

    return {
      users: userCount,
      identities: identityCount,
      threats_30d: threatCount,
      active_threats: activeThreats
    };
  }
}

export const organizationService = new OrganizationService();
