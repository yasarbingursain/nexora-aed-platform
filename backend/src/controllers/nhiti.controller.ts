/**
 * NHITI Controller
 * PRODUCTION - Threat intelligence sharing with privacy preservation
 */

import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { nhitiServiceV2 as nhitiService } from '@/services/nhiti.service';

class NHITIController {
  /**
   * Share anonymized threat intelligence
   */
  async shareThreat(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { ioc_value, ioc_type, threat_category, severity, confidence } = req.body;

      if (!ioc_value || !ioc_type) {
        return res.status(400).json({ error: 'ioc_value and ioc_type are required' });
      }

      const result = await nhitiService.shareIndicator(organizationId, {
        ioc_value,
        ioc_type: ioc_type as any,
        threat_category: (threat_category || 'malware') as any,
        severity: (severity || 'medium') as any,
        confidence: confidence || 0.7,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to share threat intelligence', { error });
      res.status(500).json({ error: 'Failed to share threat intelligence' });
    }
  }

  /**
   * Get aggregated threat feed from NHITI network
   */
  async getThreatFeed(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        limit = 100, 
        severity, 
        threat_category,
        since_hours = 24 
      } = req.query;

      const feed = await nhitiService.getThreatFeed(organizationId, {
        limit: Number(limit),
        severity: severity as any,
        threat_category: threat_category as any,
        since_hours: Number(since_hours),
      });

      res.json({
        success: true,
        indicators: feed,
        total: feed.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get threat feed', { error });
      res.status(500).json({ error: 'Failed to get threat feed' });
    }
  }

  /**
   * Get NHITI network statistics
   */
  async getNetworkStats(req: Request, res: Response) {
    try {
      const stats = await nhitiService.getNetworkStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      logger.error('Failed to get network stats', { error });
      res.status(500).json({ error: 'Failed to get network stats' });
    }
  }

  /**
   * Query specific IOC in NHITI network
   */
  async queryIOC(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { ioc_value, ioc_type } = req.body;

      if (!ioc_value) {
        return res.status(400).json({ error: 'ioc_value is required' });
      }

      const result = await nhitiService.queryIOC(organizationId, ioc_value, ioc_type as any);

      res.json({
        success: true,
        found: !!result,
        indicator: result,
      });
    } catch (error) {
      logger.error('Failed to query IOC', { error });
      res.status(500).json({ error: 'Failed to query IOC' });
    }
  }
}

export const nhitiController = new NHITIController();
