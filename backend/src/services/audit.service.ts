import { prisma } from '@/config/database';

export interface AdminActionLog {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
}

export interface SecurityEventData {
  type: string;
  severity: string;
  description: string;
  sourceIp?: string;
  userId?: string;
  organizationId?: string;
  details?: any;
}

export class AuditService {
  
  async logAdminAction(data: AdminActionLog) {
    return await prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details ? JSON.stringify(data.details) : '{}',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        organizationId: data.organizationId
      }
    });
  }

  async getAuditLogs(filters: {
    page: number;
    limit: number;
    action?: string;
    userId?: string;
  }) {
    const { page, limit, action, userId } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.adminId = userId;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.adminAuditLog.count({ where })
    ]);

    return { logs, total };
  }

  async logSecurityEvent(data: SecurityEventData) {
    return await prisma.securityEvent.create({
      data: {
        type: data.type,
        severity: data.severity,
        description: data.description,
        sourceIp: data.sourceIp,
        userId: data.userId,
        organizationId: data.organizationId,
        details: data.details ? JSON.stringify(data.details) : '{}'
      }
    });
  }

  async getSecurityEvents(filters: {
    page: number;
    limit: number;
    severity?: string;
  }) {
    const { page, limit, severity } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (severity) where.severity = severity;

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.securityEvent.count({ where })
    ]);

    return { events, total };
  }

  async resolveSecurityEvent(eventId: string, resolvedBy: string) {
    return await prisma.securityEvent.update({
      where: { id: eventId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date()
      }
    });
  }
}

export const auditService = new AuditService();
