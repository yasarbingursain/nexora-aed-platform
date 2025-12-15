import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

/**
 * Customer Analytics Controller
 * Demo implementation for frontend integration
 */

class CustomerAnalyticsController {
  async getDashboard(req: Request, res: Response) {
    try {
      const { range = '30d' } = req.query;
      
      res.json({
        metrics: {
          threatsDetected: 847,
          threatsChange: -23,
          autoResolved: 99.2,
          autoResolvedChange: 2,
          medianTTR: 1.2,
          ttrChange: -340,
          costPerRequest: 0.02,
        },
        threatTrends: [
          { date: 'Oct 1', critical: 5, high: 12, medium: 23, low: 15 },
          { date: 'Oct 8', critical: 3, high: 10, medium: 20, low: 12 },
          { date: 'Oct 15', critical: 4, high: 15, medium: 25, low: 18 },
          { date: 'Oct 22', critical: 2, high: 8, medium: 18, low: 10 },
          { date: 'Oct 29', critical: 3, high: 12, medium: 22, low: 14 },
        ],
        attackVectors: [
          { name: 'Scope Escalation', percentage: 45, count: 380 },
          { name: 'Token Replay', percentage: 28, count: 237 },
          { name: 'Geographic Anomaly', percentage: 18, count: 152 },
          { name: 'Velocity Spike', percentage: 9, count: 78 },
        ],
        mitreAttack: [
          { tactic: 'Initial Access', coverage: 85 },
          { tactic: 'Execution', coverage: 92 },
          { tactic: 'Persistence', coverage: 78 },
          { tactic: 'Privilege Escalation', coverage: 88 },
          { tactic: 'Defense Evasion', coverage: 75 },
          { tactic: 'Discovery', coverage: 90 },
        ],
        roi: {
          nexoraCostAnnual: 60000,
          threatsAutoRemediated: 841,
          costPerManualResponse: 500,
          avoidedLaborCost: 420500,
          avgDataBreachCost: 4880000,
          threatsPrevented: 15,
          estimatedRiskReduction: 732000,
          totalValue: 1152500,
          roi: 19.2,
        },
      });
    } catch (error) {
      logger.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  async exportReport(req: Request, res: Response) {
    try {
      const { format = 'pdf' } = req.query;
      logger.info(`Exporting analytics report in ${format} format`);
      
      // Return mock blob data
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 
                                    format === 'csv' ? 'text/csv' : 
                                    'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=nexora-analytics.${format}`);
      res.send('Mock export data');
    } catch (error) {
      logger.error('Error exporting report:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }

  async getROI(req: Request, res: Response) {
    try {
      res.json({
        nexoraCostAnnual: 60000,
        threatsAutoRemediated: 841,
        costPerManualResponse: 500,
        avoidedLaborCost: 420500,
        avgDataBreachCost: 4880000,
        threatsPrevented: 15,
        estimatedRiskReduction: 732000,
        totalValue: 1152500,
        roi: 19.2,
      });
    } catch (error) {
      logger.error('Error getting ROI:', error);
      res.status(500).json({ error: 'Failed to get ROI' });
    }
  }

  async getTrends(req: Request, res: Response) {
    try {
      res.json({
        trends: [
          { date: 'Oct 1', critical: 5, high: 12, medium: 23, low: 15 },
          { date: 'Oct 8', critical: 3, high: 10, medium: 20, low: 12 },
          { date: 'Oct 15', critical: 4, high: 15, medium: 25, low: 18 },
          { date: 'Oct 22', critical: 2, high: 8, medium: 18, low: 10 },
          { date: 'Oct 29', critical: 3, high: 12, medium: 22, low: 14 },
        ],
      });
    } catch (error) {
      logger.error('Error getting trends:', error);
      res.status(500).json({ error: 'Failed to get trends' });
    }
  }

  async getMLAnomalies(req: Request, res: Response) {
    try {
      const organizationId = (req as any).tenant?.organizationId || (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(401).json({ error: 'No organization context' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;

      const observations = await prisma.observation.findMany({
        where: {
          organizationId,
          observationType: 'anomaly',
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      const anomalies = observations.map((obs) => {
        let parsed: any = {};
        try {
          parsed = obs.data ? JSON.parse(obs.data) : {};
        } catch {
          parsed = {};
        }

        const riskLevel = (parsed.risk_level || 'medium') as 'low' | 'medium' | 'high' | 'critical';
        const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
        const contributingFactors = Array.isArray(parsed.contributing_factors)
          ? parsed.contributing_factors
          : [];
        const modelVersion = typeof parsed.model_version === 'string' ? parsed.model_version : 'unknown';
        const anomalyScore =
          typeof obs.anomalyScore === 'number'
            ? obs.anomalyScore
            : typeof parsed.anomaly_score === 'number'
              ? parsed.anomaly_score
              : 0;

        return {
          id: obs.id,
          identityId: obs.identityId,
          organizationId: obs.organizationId,
          riskLevel,
          anomalyScore,
          confidence,
          contributingFactors,
          modelVersion,
          timestamp: obs.timestamp,
        };
      });

      res.json({ anomalies });
    } catch (error) {
      logger.error('Error getting ML anomalies:', error);
      res.status(500).json({ error: 'Failed to get ML anomalies' });
    }
  }
}

export const customerAnalyticsController = new CustomerAnalyticsController();
