import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permissions.middleware';
import { prisma } from '@/config/database';
import { IamAuditService } from '@/services/iam-audit.service';

const router = Router();

router.use(authenticate);

router.get('/organizations', requirePermission('platform.orgs.read'), async (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { domain: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: { users: true, identities: true, threats: true },
          },
        },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    res.json({ organizations, total });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

router.patch('/organizations/:id', requirePermission('platform.orgs.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subscriptionTier, maxUsers, maxIdentities, settings } = req.body;

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name,
        subscriptionTier,
        maxUsers,
        maxIdentities,
        settings,
      },
    });

    res.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

router.post('/organizations/:id/suspend', requirePermission('platform.orgs.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.organization.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Suspend organization error:', error);
    res.status(500).json({ error: 'Failed to suspend organization' });
  }
});

router.post('/organizations/:id/reactivate', requirePermission('platform.orgs.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reactivate organization error:', error);
    res.status(500).json({ error: 'Failed to reactivate organization' });
  }
});

router.get('/users', requirePermission('platform.users.read'), async (req, res) => {
  try {
    const { organizationId, search, limit, offset } = req.query;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          organizationId: true,
          createdAt: true,
          organization: {
            select: { id: true, name: true },
          },
        },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id', requirePermission('platform.users.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    await prisma.user.update({
      where: { id },
      data: { isActive, role },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/audit', requirePermission('platform.audit.read'), async (req, res) => {
  try {
    const { organizationId, actorUserId, action, startDate, endDate, limit, offset } = req.query;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (actorUserId) where.actorUserId = actorUserId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.iamAuditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, email: true, fullName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.iamAuditLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    console.error('Get platform audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/security-events', requirePermission('platform.security.read'), async (req, res) => {
  try {
    const { severity, resolved, limit, offset } = req.query;

    const where: any = {};
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.securityEvent.count({ where }),
    ]);

    res.json({ events, total });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

router.post('/impersonations', requirePermission('platform.support.impersonate'), async (req, res) => {
  try {
    const { targetUserId, ticketId, reason, durationMinutes } = req.body;

    if (!ticketId || !reason) {
      return res.status(400).json({ error: 'Ticket ID and reason are required' });
    }

    const maxDuration = 30;
    const duration = Math.min(durationMinutes || 30, maxDuration);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const session = await prisma.impersonationSession.create({
      data: {
        supportUserId: req.auth!.userId,
        targetUserId,
        organizationId: targetUser.organizationId,
        ticketId,
        reason,
        expiresAt: new Date(Date.now() + duration * 60 * 1000),
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    });

    await IamAuditService.logImpersonationStarted(req, session.id, targetUserId, ticketId, reason);

    res.json({ session });
  } catch (error) {
    console.error('Start impersonation error:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

router.get('/impersonations', requirePermission('platform.support.impersonate'), async (req, res) => {
  try {
    const { active, supportUserId, targetUserId, limit, offset } = req.query;

    const where: any = {};
    if (active === 'true') {
      where.expiresAt = { gt: new Date() };
      where.endedAt = null;
    }
    if (supportUserId) where.supportUserId = supportUserId;
    if (targetUserId) where.targetUserId = targetUserId;

    const [sessions, total] = await Promise.all([
      prisma.impersonationSession.findMany({
        where,
        include: {
          supportUser: {
            select: { id: true, email: true, fullName: true },
          },
          targetUser: {
            select: { id: true, email: true, fullName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.impersonationSession.count({ where }),
    ]);

    res.json({ sessions, total });
  } catch (error) {
    console.error('Get impersonation sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch impersonation sessions' });
  }
});

router.post('/impersonations/:id/end', requirePermission('platform.support.impersonate'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.impersonationSession.update({
      where: { id },
      data: { endedAt: new Date() },
    });

    await IamAuditService.logImpersonationEnded(req, id);

    res.json({ success: true });
  } catch (error) {
    console.error('End impersonation error:', error);
    res.status(500).json({ error: 'Failed to end impersonation' });
  }
});

export default router;
