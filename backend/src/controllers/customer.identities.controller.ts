import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

/**
 * Customer Identity Controller
 * Demo implementation for frontend integration
 */

function generateDemoIdentities(count: number) {
  const identities = [];
  const types = ['api_key', 'service_account', 'ai_agent', 'ssh_key', 'oauth_token'];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)] as 'api_key' | 'service_account' | 'ai_agent' | 'ssh_key' | 'oauth_token';
    identities.push({
      id: `identity_${Date.now()}_${i}`,
      name: `${type.replace('_', '-')}-${i}`,
      type,
      owner: `team-${Math.floor(Math.random() * 5)}@company.com`,
      riskScore: Math.floor(Math.random() * 100),
      lastSeen: new Date(Date.now() - Math.random() * 3600000),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
      lastRotation: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000 * 7) : null,
      status: ['active', 'inactive', 'suspended'][Math.floor(Math.random() * 3)],
    });
  }
  
  return identities;
}

class CustomerIdentityController {
  async list(req: Request, res: Response) {
    try {
      const { page = 1, limit = 25 } = req.query;
      const allIdentities = generateDemoIdentities(200);
      
      const total = allIdentities.length;
      const skip = (Number(page) - 1) * Number(limit);
      const identities = allIdentities.slice(skip, skip + Number(limit));
      
      const summary = {
        apiKeys: allIdentities.filter(i => i.type === 'api_key').length,
        serviceAccounts: allIdentities.filter(i => i.type === 'service_account').length,
        aiAgents: allIdentities.filter(i => i.type === 'ai_agent').length,
        sshKeys: allIdentities.filter(i => i.type === 'ssh_key').length,
        oauthTokens: allIdentities.filter(i => i.type === 'oauth_token').length,
      };
      
      res.json({
        identities,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        summary,
      });
    } catch (error) {
      logger.error('Error listing identities:', error);
      res.status(500).json({ error: 'Failed to list identities' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const identity = generateDemoIdentities(1)[0];
      
      res.json({
        ...identity,
        id,
        totalEvents: 28457,
        eventsGrowth: 12,
        baselineBehavior: {
          resources: [
            { path: '/api/invoices', percentage: 99.8 },
            { path: '/api/customers', percentage: 0.2 },
          ],
          scopes: ['read:invoices', 'read:customers'],
          regions: [{ region: 'US-East-1', percentage: 100 }],
          activityHours: '09:00-17:00 UTC (95%)',
        },
        recentAnomalies: [
          {
            timestamp: new Date(Date.now() - 3600000),
            description: 'Scope escalation attempt',
            riskScore: 0.92,
          },
        ],
      });
    } catch (error) {
      logger.error('Error getting identity:', error);
      res.status(500).json({ error: 'Failed to get identity' });
    }
  }

  async rotate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Identity ${id} credentials rotated`);
      res.json({ success: true, message: 'Credentials rotated successfully' });
    } catch (error) {
      logger.error('Error rotating identity:', error);
      res.status(500).json({ error: 'Failed to rotate identity' });
    }
  }

  async suspend(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Identity ${id} suspended`);
      res.json({ success: true, message: 'Identity suspended successfully' });
    } catch (error) {
      logger.error('Error suspending identity:', error);
      res.status(500).json({ error: 'Failed to suspend identity' });
    }
  }

  async reactivate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Identity ${id} reactivated`);
      res.json({ success: true, message: 'Identity reactivated successfully' });
    } catch (error) {
      logger.error('Error reactivating identity:', error);
      res.status(500).json({ error: 'Failed to reactivate identity' });
    }
  }
}

export const customerIdentityController = new CustomerIdentityController();
