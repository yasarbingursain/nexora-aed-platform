import { prisma } from '@/config/database';
import { Request } from 'express';

export interface IamAuditContext {
  actorUserId: string;
  organizationId?: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: any;
  after?: any;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export class IamAuditService {
  static async log(context: IamAuditContext): Promise<void> {
    try {
      await prisma.iamAuditLog.create({
        data: {
          actorUserId: context.actorUserId,
          organizationId: context.organizationId || null,
          action: context.action,
          targetType: context.targetType,
          targetId: context.targetId,
          before: context.before || null,
          after: context.after || null,
          requestId: context.requestId || null,
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });
    } catch (error) {
      console.error('IAM audit logging failed:', error);
    }
  }

  static async logFromRequest(
    req: Request,
    action: string,
    targetType: string,
    targetId: string,
    before?: any,
    after?: any
  ): Promise<void> {
    if (!req.auth) return;

    await this.log({
      actorUserId: req.auth.userId,
      organizationId: req.auth.organizationId,
      action,
      targetType,
      targetId,
      before,
      after,
      requestId: req.headers['x-request-id'] as string,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  static async logRoleChange(
    req: Request,
    userId: string,
    before: { roleIds: string[] },
    after: { roleIds: string[] }
  ): Promise<void> {
    await this.logFromRequest(req, 'USER_ROLE_CHANGED', 'user', userId, before, after);
  }

  static async logTeamChange(
    req: Request,
    userId: string,
    before: { teamIds: string[] },
    after: { teamIds: string[] }
  ): Promise<void> {
    await this.logFromRequest(req, 'USER_TEAM_CHANGED', 'user', userId, before, after);
  }

  static async logRoleCreated(req: Request, roleId: string, roleData: any): Promise<void> {
    await this.logFromRequest(req, 'ROLE_CREATED', 'role', roleId, null, roleData);
  }

  static async logRoleUpdated(req: Request, roleId: string, before: any, after: any): Promise<void> {
    await this.logFromRequest(req, 'ROLE_UPDATED', 'role', roleId, before, after);
  }

  static async logRoleDeleted(req: Request, roleId: string, roleData: any): Promise<void> {
    await this.logFromRequest(req, 'ROLE_DELETED', 'role', roleId, roleData, null);
  }

  static async logRolePermissionsChanged(
    req: Request,
    roleId: string,
    before: { permissions: string[] },
    after: { permissions: string[] }
  ): Promise<void> {
    await this.logFromRequest(req, 'ROLE_PERMISSIONS_CHANGED', 'role', roleId, before, after);
  }

  static async logTeamCreated(req: Request, teamId: string, teamData: any): Promise<void> {
    await this.logFromRequest(req, 'TEAM_CREATED', 'team', teamId, null, teamData);
  }

  static async logTeamUpdated(req: Request, teamId: string, before: any, after: any): Promise<void> {
    await this.logFromRequest(req, 'TEAM_UPDATED', 'team', teamId, before, after);
  }

  static async logTeamDeleted(req: Request, teamId: string, teamData: any): Promise<void> {
    await this.logFromRequest(req, 'TEAM_DELETED', 'team', teamId, teamData, null);
  }

  static async logTeamPermissionsChanged(
    req: Request,
    teamId: string,
    before: { permissions: string[] },
    after: { permissions: string[] }
  ): Promise<void> {
    await this.logFromRequest(req, 'TEAM_PERMISSIONS_CHANGED', 'team', teamId, before, after);
  }

  static async logApiKeyCreated(req: Request, apiKeyId: string, apiKeyData: any): Promise<void> {
    await this.logFromRequest(req, 'API_KEY_CREATED', 'apiKey', apiKeyId, null, apiKeyData);
  }

  static async logApiKeyScopesChanged(
    req: Request,
    apiKeyId: string,
    before: { scopes: string[] },
    after: { scopes: string[] }
  ): Promise<void> {
    await this.logFromRequest(req, 'API_KEY_SCOPES_CHANGED', 'apiKey', apiKeyId, before, after);
  }

  static async logApiKeyRotated(req: Request, apiKeyId: string): Promise<void> {
    await this.logFromRequest(req, 'API_KEY_ROTATED', 'apiKey', apiKeyId);
  }

  static async logApiKeyRevoked(req: Request, apiKeyId: string, apiKeyData: any): Promise<void> {
    await this.logFromRequest(req, 'API_KEY_REVOKED', 'apiKey', apiKeyId, apiKeyData, null);
  }

  static async logInviteCreated(req: Request, inviteId: string, inviteData: any): Promise<void> {
    await this.logFromRequest(req, 'INVITE_CREATED', 'invite', inviteId, null, inviteData);
  }

  static async logInviteAccepted(req: Request, inviteId: string, userId: string): Promise<void> {
    await this.logFromRequest(req, 'INVITE_ACCEPTED', 'invite', inviteId, null, { userId });
  }

  static async logUserSuspended(req: Request, userId: string, reason?: string): Promise<void> {
    await this.logFromRequest(req, 'USER_SUSPENDED', 'user', userId, null, { reason });
  }

  static async logUserReactivated(req: Request, userId: string): Promise<void> {
    await this.logFromRequest(req, 'USER_REACTIVATED', 'user', userId);
  }

  static async logUserRemoved(req: Request, userId: string, userData: any): Promise<void> {
    await this.logFromRequest(req, 'USER_REMOVED', 'user', userId, userData, null);
  }

  static async logImpersonationStarted(
    req: Request,
    sessionId: string,
    targetUserId: string,
    ticketId: string,
    reason: string
  ): Promise<void> {
    await this.logFromRequest(req, 'IMPERSONATION_STARTED', 'impersonationSession', sessionId, null, {
      targetUserId,
      ticketId,
      reason,
    });
  }

  static async logImpersonationEnded(req: Request, sessionId: string): Promise<void> {
    await this.logFromRequest(req, 'IMPERSONATION_ENDED', 'impersonationSession', sessionId);
  }

  static async getAuditLogs(
    organizationId: string,
    filters?: {
      actorUserId?: string;
      action?: string;
      targetType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = { organizationId };

    if (filters?.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters?.action) where.action = filters.action;
    if (filters?.targetType) where.targetType = filters.targetType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.iamAuditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.iamAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  static async exportAuditLogs(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = { organizationId };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.iamAuditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }
}
