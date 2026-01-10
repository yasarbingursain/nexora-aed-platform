import { prisma } from '@/config/database';
import Redis from 'ioredis';
import { ABAC_RULES, LEGACY_ROLE_MAPPING } from '@/config/permissions.catalog';

const redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/2');

const CACHE_TTL = 300;

export interface EffectivePermissions {
  permissions: string[];
  roles: { platform: string[]; org: string[] };
  teamIds: string[];
}

export class PermissionsService {
  static async getEffectivePermissions(
    userId: string,
    organizationId: string,
    mode: 'USER' | 'API_KEY' = 'USER'
  ): Promise<EffectivePermissions> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { permissionsVersion: true, role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const cacheKey = `perm:v${user.permissionsVersion}:${userId}:${organizationId}:${mode}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.computeEffectivePermissions(userId, organizationId, mode, user.role);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  }

  private static async computeEffectivePermissions(
    userId: string,
    organizationId: string,
    mode: 'USER' | 'API_KEY',
    legacyRole: string
  ): Promise<EffectivePermissions> {
    const permissionSet = new Set<string>();
    const platformRoles: string[] = [];
    const orgRoles: string[] = [];
    const teamIds: string[] = [];

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    for (const userRole of userRoles) {
      const role = userRole.role;
      
      if (role.scope === 'PLATFORM') {
        platformRoles.push(role.name);
      } else if (role.organizationId === organizationId) {
        orgRoles.push(role.name);
      }

      for (const rp of role.rolePermissions) {
        permissionSet.add(rp.permission.key);
      }

      if (role.parentRoleId) {
        const parentPerms = await this.getParentRolePermissions(role.parentRoleId);
        parentPerms.forEach(p => permissionSet.add(p));
      }
    }

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          where: { organizationId },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    for (const tm of teamMemberships) {
      if (tm.team) {
        teamIds.push(tm.team.id);
        for (const tp of tm.team.permissions) {
          permissionSet.add(tp.permission.key);
        }
      }
    }

    if (permissionSet.size === 0 && legacyRole) {
      const legacyMapping = LEGACY_ROLE_MAPPING[legacyRole as keyof typeof LEGACY_ROLE_MAPPING];
      if (legacyMapping) {
        legacyMapping.permissions.forEach(p => permissionSet.add(p));
        if (legacyMapping.scope === 'PLATFORM') {
          platformRoles.push(legacyRole);
        } else {
          orgRoles.push(legacyRole);
        }
      }
    }

    return {
      permissions: Array.from(permissionSet),
      roles: { platform: platformRoles, org: orgRoles },
      teamIds,
    };
  }

  private static async getParentRolePermissions(parentRoleId: string): Promise<string[]> {
    const role = await prisma.role.findUnique({
      where: { id: parentRoleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) return [];

    const permissions = role.rolePermissions.map(rp => rp.permission.key);

    if (role.parentRoleId) {
      const parentPerms = await this.getParentRolePermissions(role.parentRoleId);
      return [...permissions, ...parentPerms];
    }

    return permissions;
  }

  static async getApiKeyPermissions(apiKeyId: string): Promise<string[]> {
    const cacheKey = `apikey:perm:${apiKeyId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const scopes = await prisma.apiKeyScope.findMany({
      where: { apiKeyId },
      include: { permission: true },
    });

    const permissions = scopes.map(s => s.permission.key);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));

    return permissions;
  }

  static hasPermission(effectivePermissions: string[], requiredPermission: string): boolean {
    return effectivePermissions.includes(requiredPermission);
  }

  static hasAnyPermission(effectivePermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(p => effectivePermissions.includes(p));
  }

  static hasAllPermissions(effectivePermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(p => effectivePermissions.includes(p));
  }

  static applyABACRules(
    permission: string,
    effectivePermissions: EffectivePermissions,
    userRole?: string
  ): boolean {
    if (userRole === 'auditor' || effectivePermissions.roles.org.includes('Auditor')) {
      if (ABAC_RULES.AUDITOR_DENIALS.includes(permission)) {
        return false;
      }
    }

    return true;
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { permissionsVersion: { increment: 1 } },
    });
  }

  static async invalidateOrgCache(organizationId: string): Promise<void> {
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });

    await prisma.user.updateMany({
      where: { organizationId },
      data: { permissionsVersion: { increment: 1 } },
    });
  }

  static async invalidateApiKeyCache(apiKeyId: string): Promise<void> {
    const cacheKey = `apikey:perm:${apiKeyId}`;
    await redis.del(cacheKey);
  }
}
