import { Request, Response } from 'express';
import { organizationService } from '@/services/organization.service';
import { userService } from '@/services/user.service';
import { metricsService } from '@/services/metrics.service';
import { billingService } from '@/services/billing.service';
import { auditService } from '@/services/audit.service';
import { logger } from '@/utils/logger';

export class AdminController {
  
  // Organization Management
  async getAllOrganizations(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await organizationService.getAllOrganizations({
        page,
        limit,
        search,
        status
      });

      res.json({
        success: true,
        data: result.organizations,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching organizations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organizations'
      });
    }
  }

  async getOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organization = await organizationService.getOrganizationById(id);
      
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }

      // Get additional details
      const [stats, metrics] = await Promise.all([
        organizationService.getOrganizationStats(id),
        metricsService.getOrganizationMetrics(id)
      ]);

      res.json({
        success: true,
        data: {
          ...organization,
          stats,
          metrics
        }
      });
    } catch (error) {
      logger.error('Error fetching organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization'
      });
    }
  }

  async createOrganization(req: Request, res: Response) {
    try {
      const organizationData = req.body;
      const adminId = req.user!.userId;

      const organization = await organizationService.createOrganization({
        ...organizationData,
        createdBy: adminId
      });

      // Log admin action
      await auditService.logAdminAction({
        adminId,
        action: 'CREATE_ORGANIZATION',
        resourceType: 'organization',
        resourceId: organization.id,
        details: organizationData,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      logger.error('Error creating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create organization'
      });
    }
  }

  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const adminId = req.user!.userId;

      const organization = await organizationService.updateOrganization(id, updateData);

      await auditService.logAdminAction({
        adminId,
        action: 'UPDATE_ORGANIZATION',
        resourceType: 'organization',
        resourceId: id,
        details: updateData,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      logger.error('Error updating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update organization'
      });
    }
  }

  async deleteOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      await organizationService.deleteOrganization(id);

      await auditService.logAdminAction({
        adminId,
        action: 'DELETE_ORGANIZATION',
        resourceType: 'organization',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Organization deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete organization'
      });
    }
  }

  async suspendOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      await organizationService.suspendOrganization(id, reason);

      await auditService.logAdminAction({
        adminId,
        action: 'SUSPEND_ORGANIZATION',
        resourceType: 'organization',
        resourceId: id,
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Organization suspended successfully'
      });
    } catch (error) {
      logger.error('Error suspending organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend organization'
      });
    }
  }

  async reactivateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      await organizationService.reactivateOrganization(id);

      await auditService.logAdminAction({
        adminId,
        action: 'REACTIVATE_ORGANIZATION',
        resourceType: 'organization',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Organization reactivated successfully'
      });
    } catch (error) {
      logger.error('Error reactivating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate organization'
      });
    }
  }

  // System Metrics
  async getSystemMetrics(req: Request, res: Response) {
    try {
      const metrics = await metricsService.getSystemMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error fetching system metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system metrics'
      });
    }
  }

  async getSystemHealth(req: Request, res: Response) {
    try {
      const health = await metricsService.getSystemHealth();
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health'
      });
    }
  }

  // Billing Management
  async getBillingOverview(req: Request, res: Response) {
    try {
      const overview = await billingService.getBillingOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Error fetching billing overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch billing overview'
      });
    }
  }

  async getOrganizationBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const billing = await billingService.getOrganizationBilling(id);
      res.json({
        success: true,
        data: billing
      });
    } catch (error) {
      logger.error('Error fetching organization billing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization billing'
      });
    }
  }

  // User Management
  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await userService.getAllUsers({ page, limit, search });

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }

  async suspendUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      await userService.suspendUser(id, reason);

      await auditService.logAdminAction({
        adminId,
        action: 'SUSPEND_USER',
        resourceType: 'user',
        resourceId: id,
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'User suspended successfully'
      });
    } catch (error) {
      logger.error('Error suspending user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend user'
      });
    }
  }

  async reactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      await userService.reactivateUser(id);

      await auditService.logAdminAction({
        adminId,
        action: 'REACTIVATE_USER',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'User reactivated successfully'
      });
    } catch (error) {
      logger.error('Error reactivating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate user'
      });
    }
  }

  // Security & Audit
  async getSecurityEvents(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const severity = req.query.severity as string;

      const result = await auditService.getSecurityEvents({ page, limit, severity });

      res.json({
        success: true,
        data: result.events,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching security events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security events'
      });
    }
  }

  async getAuditLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      const result = await auditService.getAuditLogs({ page, limit, action, userId });

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  }
}

export const adminController = new AdminController();
