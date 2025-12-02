import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

/**
 * Customer Threat Controller
 * Handles customer-facing threat management operations
 * Using demo data for frontend integration
 */

// Demo threat data generator
function generateDemoThreats(count: number, severity?: string) {
  const threats = [];
  const severities = ['critical', 'high', 'medium', 'low'];
  const entityTypes = ['ai_agent', 'api_key', 'service_account', 'ssh_key'];
  const statuses = ['active', 'investigating', 'resolved'];
  
  for (let i = 0; i < count; i++) {
    const sev = severity || severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    threats.push({
      id: `threat_${Date.now()}_${i}`,
      severity: sev,
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      entityName: `nhi:${entityTypes[Math.floor(Math.random() * entityTypes.length)]}:entity-${i}`,
      entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
      riskScore: sev === 'critical' ? 0.85 + Math.random() * 0.15 :
                 sev === 'high' ? 0.70 + Math.random() * 0.15 :
                 sev === 'medium' ? 0.50 + Math.random() * 0.20 :
                 0.20 + Math.random() * 0.30,
      mlConfidence: 0.70 + Math.random() * 0.25,
      reasons: [
        'Scope drift detected',
        'Geographic anomaly',
        'Token lineage broken',
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      mlBreakdown: {
        graph: Math.random() * 0.5,
        temporal: Math.random() * 0.3,
        morphing: Math.random() * 0.25,
        statistical: Math.random() * 0.15,
      },
      status,
      details: 'Detailed threat information',
    });
  }
  
  return threats;
}

class CustomerThreatController {
  /**
   * GET /api/v1/customer/threats
   * List threats with pagination and filtering
   */
  async list(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        severity,
        status,
        search,
      } = req.query;

      const take = Number(limit);
      
      // Generate demo threats
      let allThreats = generateDemoThreats(100);
      
      // Filter by severity
      if (severity && severity !== 'all') {
        allThreats = allThreats.filter(t => t.severity === severity);
      }
      
      // Filter by status
      if (status) {
        allThreats = allThreats.filter(t => t.status === status);
      }
      
      // Filter by search
      if (search) {
        const searchLower = (search as string).toLowerCase();
        allThreats = allThreats.filter(t => 
          t.entityName.toLowerCase().includes(searchLower) ||
          (t.entityType && t.entityType.toLowerCase().includes(searchLower))
        );
      }

      const total = allThreats.length;
      const skip = (Number(page) - 1) * take;
      const threats = allThreats.slice(skip, skip + take);

      // Calculate stats
      const stats = {
        critical: allThreats.filter(t => t.severity === 'critical' && t.status !== 'resolved').length,
        high: allThreats.filter(t => t.severity === 'high' && t.status !== 'resolved').length,
        medium: allThreats.filter(t => t.severity === 'medium' && t.status !== 'resolved').length,
        low: allThreats.filter(t => t.severity === 'low' && t.status !== 'resolved').length,
        resolved: allThreats.filter(t => t.status === 'resolved').length,
      };

      res.json({
        threats,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
        stats,
      });
    } catch (error) {
      logger.error('Error listing threats:', error);
      res.status(500).json({ error: 'Failed to list threats' });
    }
  }

  /**
   * GET /api/v1/customer/threats/:id
   * Get threat details
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const threats = generateDemoThreats(1);
      const threat = { ...threats[0], id };

      res.json(threat);
    } catch (error) {
      logger.error('Error getting threat:', error);
      res.status(500).json({ error: 'Failed to get threat' });
    }
  }

  /**
   * POST /api/v1/customer/threats/:id/quarantine
   * Quarantine threat entity
   */
  async quarantine(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Threat ${id} quarantined`);
      res.json({ success: true, message: 'Threat quarantined successfully' });
    } catch (error) {
      logger.error('Error quarantining threat:', error);
      res.status(500).json({ error: 'Failed to quarantine threat' });
    }
  }

  /**
   * POST /api/v1/customer/threats/:id/rotate
   * Rotate credentials for threat entity
   */
  async rotateCredentials(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Credentials rotated for threat ${id}`);
      res.json({ success: true, message: 'Credentials rotated successfully' });
    } catch (error) {
      logger.error('Error rotating credentials:', error);
      res.status(500).json({ error: 'Failed to rotate credentials' });
    }
  }

  /**
   * POST /api/v1/customer/threats/:id/dismiss
   * Dismiss threat as false positive
   */
  async dismiss(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Threat ${id} dismissed`);
      res.json({ success: true, message: 'Threat dismissed successfully' });
    } catch (error) {
      logger.error('Error dismissing threat:', error);
      res.status(500).json({ error: 'Failed to dismiss threat' });
    }
  }
}

export const customerThreatController = new CustomerThreatController();
