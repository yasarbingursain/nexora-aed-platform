import { prisma } from '@/config/database';

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
}

export class UserService {
  
  async getAllUsers(filters: UserFilters) {
    const { page, limit, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return { users, total };
  }

  async getUsersByOrganization(organizationId: string) {
    return await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async suspendUser(userId: string, reason: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false
      }
    });
  }

  async reactivateUser(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true
      }
    });
  }
}

export const userService = new UserService();
