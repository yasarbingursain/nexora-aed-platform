import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permissions.middleware';
import { prisma } from '@/config/database';
import { IamAuditService } from '@/services/iam-audit.service';
import { PermissionsService } from '@/services/permissions.service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authenticate);

router.get('/users', requirePermission('org.users.read'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              select: { id: true, name: true, scope: true },
            },
          },
        },
        teamMembers: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/invites', requirePermission('org.users.invite'), async (req, res) => {
  try {
    const { email, roleId, teamIds } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        organizationId: req.auth!.organizationId,
        email,
        tokenHash,
        expiresAt,
        invitedByUserId: req.auth!.userId,
        defaultRoleId: roleId,
      },
    });

    await IamAuditService.logInviteCreated(req, invite.id, { email, roleId, teamIds });

    res.json({ invite: { ...invite, token } });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

router.post('/invites/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { fullName, password } = req.body;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await prisma.invite.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        acceptedAt: null,
      },
      include: { organization: true },
    });

    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: invite.email,
        fullName,
        passwordHash,
        organizationId: invite.organizationId,
        role: 'viewer',
      },
    });

    if (invite.defaultRoleId) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: invite.defaultRoleId,
        },
      });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    res.json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

router.patch('/users/:id', requirePermission('org.users.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, roleIds, teamIds } = req.body;

    const user = await prisma.user.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (fullName) {
      await prisma.user.update({
        where: { id },
        data: { fullName },
      });
    }

    if (roleIds) {
      const currentRoles = await prisma.userRole.findMany({
        where: { userId: id },
        select: { roleId: true },
      });

      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
      });

      await PermissionsService.invalidateUserCache(id);
      await IamAuditService.logRoleChange(
        req,
        id,
        { roleIds: currentRoles.map(r => r.roleId) },
        { roleIds }
      );
    }

    if (teamIds) {
      const currentTeams = await prisma.teamMember.findMany({
        where: { userId: id },
        select: { teamId: true },
      });

      await prisma.teamMember.deleteMany({ where: { userId: id } });
      await prisma.teamMember.createMany({
        data: teamIds.map((teamId: string) => ({ userId: id, teamId })),
      });

      await PermissionsService.invalidateUserCache(id);
      await IamAuditService.logTeamChange(
        req,
        id,
        { teamIds: currentTeams.map(t => t.teamId) },
        { teamIds }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/users/:id/suspend', requirePermission('org.users.suspend'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await IamAuditService.logUserSuspended(req, id, reason);

    res.json({ success: true });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

router.post('/users/:id/reactivate', requirePermission('org.users.suspend'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await IamAuditService.logUserReactivated(req, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

router.delete('/users/:id', requirePermission('org.users.remove'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    await IamAuditService.logUserRemoved(req, id, user);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

router.get('/roles', requirePermission('org.roles.read'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { scope: 'PLATFORM' },
          { organizationId: req.auth!.organizationId },
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/roles', requirePermission('org.roles.manage'), async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    const role = await prisma.role.create({
      data: {
        scope: 'ORG',
        organizationId: req.auth!.organizationId,
        name,
        description,
        isSystem: false,
      },
    });

    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    await IamAuditService.logRoleCreated(req, role.id, { name, description, permissionIds });

    res.json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.patch('/roles/:id', requirePermission('org.roles.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const role = await prisma.role.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot modify system role' });
    }

    const before = { ...role };

    if (name || description) {
      await prisma.role.update({
        where: { id },
        data: { name, description },
      });
    }

    if (permissionIds) {
      const currentPerms = await prisma.rolePermission.findMany({
        where: { roleId: id },
        select: { permissionId: true },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: id,
          permissionId,
        })),
      });

      await IamAuditService.logRolePermissionsChanged(
        req,
        id,
        { permissions: currentPerms.map(p => p.permissionId) },
        { permissions: permissionIds }
      );
    }

    const usersWithRole = await prisma.userRole.findMany({
      where: { roleId: id },
      select: { userId: true },
    });

    for (const { userId } of usersWithRole) {
      await PermissionsService.invalidateUserCache(userId);
    }

    await IamAuditService.logRoleUpdated(req, id, before, { name, description });

    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/roles/:id', requirePermission('org.roles.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system role' });
    }

    await prisma.role.delete({ where: { id } });
    await IamAuditService.logRoleDeleted(req, id, role);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.get('/teams', requirePermission('org.teams.read'), async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.post('/teams', requirePermission('org.teams.manage'), async (req, res) => {
  try {
    const { name, description, memberIds, permissionIds } = req.body;

    const team = await prisma.team.create({
      data: {
        organizationId: req.auth!.organizationId,
        name,
        description,
      },
    });

    if (memberIds && memberIds.length > 0) {
      await prisma.teamMember.createMany({
        data: memberIds.map((userId: string) => ({
          teamId: team.id,
          userId,
        })),
      });
    }

    if (permissionIds && permissionIds.length > 0) {
      await prisma.teamPermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          teamId: team.id,
          permissionId,
        })),
      });
    }

    await IamAuditService.logTeamCreated(req, team.id, { name, description, memberIds, permissionIds });

    res.json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.patch('/teams/:id', requirePermission('org.teams.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, memberIds, permissionIds } = req.body;

    const team = await prisma.team.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const before = { ...team };

    if (name || description) {
      await prisma.team.update({
        where: { id },
        data: { name, description },
      });
    }

    if (memberIds) {
      await prisma.teamMember.deleteMany({ where: { teamId: id } });
      await prisma.teamMember.createMany({
        data: memberIds.map((userId: string) => ({
          teamId: id,
          userId,
        })),
      });

      for (const userId of memberIds) {
        await PermissionsService.invalidateUserCache(userId);
      }
    }

    if (permissionIds) {
      const currentPerms = await prisma.teamPermission.findMany({
        where: { teamId: id },
        select: { permissionId: true },
      });

      await prisma.teamPermission.deleteMany({ where: { teamId: id } });
      await prisma.teamPermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          teamId: id,
          permissionId,
        })),
      });

      const members = await prisma.teamMember.findMany({
        where: { teamId: id },
        select: { userId: true },
      });

      for (const { userId } of members) {
        await PermissionsService.invalidateUserCache(userId);
      }

      await IamAuditService.logTeamPermissionsChanged(
        req,
        id,
        { permissions: currentPerms.map(p => p.permissionId) },
        { permissions: permissionIds }
      );
    }

    await IamAuditService.logTeamUpdated(req, id, before, { name, description });

    res.json({ success: true });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/teams/:id', requirePermission('org.teams.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findFirst({
      where: { id, organizationId: req.auth!.organizationId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await prisma.team.delete({ where: { id } });
    await IamAuditService.logTeamDeleted(req, id, team);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.get('/api-keys', requirePermission('org.api_keys.read'), async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        scopes: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/api-keys', requirePermission('org.api_keys.manage'), async (req, res) => {
  try {
    const { name, permissionIds, expiresAt } = req.body;

    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        organizationId: req.auth!.organizationId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    if (permissionIds && permissionIds.length > 0) {
      await prisma.apiKeyScope.createMany({
        data: permissionIds.map((permissionId: string) => ({
          apiKeyId: apiKey.id,
          permissionId,
        })),
      });
    }

    await IamAuditService.logApiKeyCreated(req, apiKey.id, { name, permissionIds });

    res.json({ apiKey: { ...apiKey, key } });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.patch('/api-keys/:id/scopes', requirePermission('org.api_keys.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    const currentScopes = await prisma.apiKeyScope.findMany({
      where: { apiKeyId: id },
      select: { permissionId: true },
    });

    await prisma.apiKeyScope.deleteMany({ where: { apiKeyId: id } });
    await prisma.apiKeyScope.createMany({
      data: permissionIds.map((permissionId: string) => ({
        apiKeyId: id,
        permissionId,
      })),
    });

    await PermissionsService.invalidateApiKeyCache(id);
    await IamAuditService.logApiKeyScopesChanged(
      req,
      id,
      { scopes: currentScopes.map(s => s.permissionId) },
      { scopes: permissionIds }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update API key scopes error:', error);
    res.status(500).json({ error: 'Failed to update API key scopes' });
  }
});

router.post('/api-keys/:id/rotate', requirePermission('org.api_keys.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    await prisma.apiKey.update({
      where: { id },
      data: { keyHash },
    });

    await PermissionsService.invalidateApiKeyCache(id);
    await IamAuditService.logApiKeyRotated(req, id);

    res.json({ key });
  } catch (error) {
    console.error('Rotate API key error:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

router.post('/api-keys/:id/revoke', requirePermission('org.api_keys.manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await prisma.apiKey.findUnique({ where: { id } });

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    await PermissionsService.invalidateApiKeyCache(id);
    await IamAuditService.logApiKeyRevoked(req, id, apiKey);

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

router.get('/audit/iam', requirePermission('org.audit.read'), async (req, res) => {
  try {
    const { actorUserId, action, targetType, startDate, endDate, limit, offset } = req.query;

    const result = await IamAuditService.getAuditLogs(req.auth!.organizationId, {
      actorUserId: actorUserId as string,
      action: action as string,
      targetType: targetType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Get IAM audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/audit/export', requirePermission('org.audit.export'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const logs = await IamAuditService.exportAuditLogs(req.auth!.organizationId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ logs });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
