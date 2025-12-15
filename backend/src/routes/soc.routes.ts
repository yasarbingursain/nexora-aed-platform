/**
 * SOC (Security Operations Center) Routes
 * Enterprise-grade API endpoints for SOC operations
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { honeyTokenService } from '@/services/deception/honey-token.service';
import { identityLineageService, morphingDetectionService } from '@/services/identity/lineage.service';
import { forensicTimelineService } from '@/services/forensics/timeline.service';
import { rollbackService, transactionManager } from '@/services/remediation/rollback.service';
import { ticketingService } from '@/services/integrations/ticketing.service';
import { kubernetesIsolationService } from '@/services/cloud/kubernetes-isolation.service';
import { azureQuarantineService } from '@/services/cloud/azure-quarantine.service';
import { gcpQuarantineService } from '@/services/cloud/gcp-quarantine.service';
import { logger } from '@/utils/logger';

const router = Router();

// ============================================================================
// HONEY TOKEN ENDPOINTS
// ============================================================================

/**
 * Create a new honey token
 */
router.post('/honey-tokens', requireAuth, requireRole(['admin', 'security_analyst']), async (req: Request, res: Response) => {
  try {
    const { type, name, description, deploymentLocation, expiresInDays, metadata } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const token = await honeyTokenService.createToken({
      type,
      name,
      description,
      organizationId,
      deploymentLocation,
      expiresInDays,
      metadata,
    });

    res.status(201).json({
      success: true,
      token: {
        id: token.id,
        type: token.type,
        name: token.name,
        value: token.value, // Only returned on creation
        status: token.status,
        expiresAt: token.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Failed to create honey token', { error });
    res.status(500).json({ error: 'Failed to create honey token' });
  }
});

/**
 * List honey tokens
 */
router.get('/honey-tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const status = req.query.status as string | undefined;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const tokens = honeyTokenService.listTokens(organizationId, status as any);
    const stats = honeyTokenService.getStats(organizationId);

    res.json({
      tokens: tokens.map(t => ({
        id: t.id,
        type: t.type,
        name: t.name,
        status: t.status,
        triggerCount: t.triggerCount,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      })),
      stats,
    });
  } catch (error) {
    logger.error('Failed to list honey tokens', { error });
    res.status(500).json({ error: 'Failed to list honey tokens' });
  }
});

/**
 * Get honey token alerts
 */
router.get('/honey-tokens/:tokenId/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const alerts = honeyTokenService.getAlerts(tokenId);

    res.json({ alerts });
  } catch (error) {
    logger.error('Failed to get honey token alerts', { error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * Disable honey token
 */
router.post('/honey-tokens/:tokenId/disable', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const success = await honeyTokenService.disableToken(tokenId);

    res.json({ success });
  } catch (error) {
    logger.error('Failed to disable honey token', { error });
    res.status(500).json({ error: 'Failed to disable token' });
  }
});

/**
 * Rotate honey token
 */
router.post('/honey-tokens/:tokenId/rotate', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const newToken = await honeyTokenService.rotateToken(tokenId);

    if (!newToken) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      success: true,
      token: {
        id: newToken.id,
        value: newToken.value,
        status: newToken.status,
      },
    });
  } catch (error) {
    logger.error('Failed to rotate honey token', { error });
    res.status(500).json({ error: 'Failed to rotate token' });
  }
});

// ============================================================================
// IDENTITY LINEAGE ENDPOINTS
// ============================================================================

/**
 * Get identity lineage graph
 */
router.get('/lineage/:identityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { identityId } = req.params;
    const graph = await identityLineageService.getLineageGraph(identityId);

    res.json({ graph });
  } catch (error) {
    logger.error('Failed to get identity lineage', { error });
    res.status(500).json({ error: 'Failed to get lineage' });
  }
});

/**
 * Get identity ancestors
 */
router.get('/lineage/:identityId/ancestors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { identityId } = req.params;
    const ancestors = await identityLineageService.getAncestors(identityId);

    res.json({ ancestors });
  } catch (error) {
    logger.error('Failed to get identity ancestors', { error });
    res.status(500).json({ error: 'Failed to get ancestors' });
  }
});

/**
 * Analyze identity drift
 */
router.get('/drift/:identityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { identityId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const analysis = await morphingDetectionService.analyzeDrift(identityId, organizationId);

    res.json({ analysis });
  } catch (error) {
    logger.error('Failed to analyze drift', { error });
    res.status(500).json({ error: 'Failed to analyze drift' });
  }
});

/**
 * Get morphing history
 */
router.get('/morphing/:identityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { identityId } = req.params;
    const history = morphingDetectionService.getMorphingHistory(identityId);

    res.json({ history });
  } catch (error) {
    logger.error('Failed to get morphing history', { error });
    res.status(500).json({ error: 'Failed to get morphing history' });
  }
});

// ============================================================================
// FORENSIC TIMELINE ENDPOINTS
// ============================================================================

/**
 * Build forensic timeline
 */
router.post('/timeline', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { startDate, endDate, eventTypes, categories, severities, actorId, targetId, limit, offset } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const timeline = await forensicTimelineService.buildTimeline({
      organizationId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventTypes,
      categories,
      severities,
      actorId,
      targetId,
      limit: limit || 100,
      offset: offset || 0,
    });

    res.json({ timeline });
  } catch (error) {
    logger.error('Failed to build timeline', { error });
    res.status(500).json({ error: 'Failed to build timeline' });
  }
});

/**
 * Export forensic timeline
 */
router.post('/timeline/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { format, startDate, endDate } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const exportData = await forensicTimelineService.exportTimeline(
      {
        organizationId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      format || 'json'
    );

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=timeline-${Date.now()}.${format || 'json'}`);
    res.send(exportData);
  } catch (error) {
    logger.error('Failed to export timeline', { error });
    res.status(500).json({ error: 'Failed to export timeline' });
  }
});

// ============================================================================
// ROLLBACK ENDPOINTS
// ============================================================================

/**
 * List pending rollbacks
 */
router.get('/rollbacks', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const rollbacks = rollbackService.listRollbacks(status as any);

    res.json({ rollbacks });
  } catch (error) {
    logger.error('Failed to list rollbacks', { error });
    res.status(500).json({ error: 'Failed to list rollbacks' });
  }
});

/**
 * Execute rollback
 */
router.post('/rollbacks/:rollbackId/execute', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { rollbackId } = req.params;
    const result = await rollbackService.executeRollback(rollbackId);

    res.json({ result });
  } catch (error) {
    logger.error('Failed to execute rollback', { error });
    res.status(500).json({ error: 'Failed to execute rollback' });
  }
});

/**
 * Rollback entire transaction
 */
router.post('/transactions/:transactionId/rollback', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const results = await transactionManager.rollbackTransaction(transactionId);

    res.json({ results });
  } catch (error) {
    logger.error('Failed to rollback transaction', { error });
    res.status(500).json({ error: 'Failed to rollback transaction' });
  }
});

// ============================================================================
// CLOUD ISOLATION ENDPOINTS
// ============================================================================

/**
 * Isolate Kubernetes pod
 */
router.post('/isolate/kubernetes', requireAuth, requireRole(['admin', 'security_analyst']), async (req: Request, res: Response) => {
  try {
    const { podName, namespace, reason } = req.body;

    if (!podName) {
      return res.status(400).json({ error: 'Pod name required' });
    }

    const result = await kubernetesIsolationService.isolatePod(podName, namespace, reason || 'Manual isolation');

    res.json({ result });
  } catch (error) {
    logger.error('Failed to isolate pod', { error });
    res.status(500).json({ error: 'Failed to isolate pod' });
  }
});

/**
 * Remove Kubernetes pod isolation
 */
router.post('/isolate/kubernetes/remove', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { podName, policyName, namespace } = req.body;

    const result = await kubernetesIsolationService.removeIsolation(podName, policyName, namespace);

    res.json({ result });
  } catch (error) {
    logger.error('Failed to remove pod isolation', { error });
    res.status(500).json({ error: 'Failed to remove isolation' });
  }
});

/**
 * List isolated pods
 */
router.get('/isolate/kubernetes/pods', requireAuth, async (req: Request, res: Response) => {
  try {
    const namespace = req.query.namespace as string | undefined;
    const pods = await kubernetesIsolationService.listIsolatedPods(namespace);

    res.json({ pods });
  } catch (error) {
    logger.error('Failed to list isolated pods', { error });
    res.status(500).json({ error: 'Failed to list pods' });
  }
});

/**
 * Azure NSG quarantine
 */
router.post('/isolate/azure', requireAuth, requireRole(['admin', 'security_analyst']), async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address required' });
    }

    const result = await azureQuarantineService.quarantineIP(ipAddress, reason || 'Manual quarantine');

    res.json({ result });
  } catch (error) {
    logger.error('Failed to quarantine Azure IP', { error });
    res.status(500).json({ error: 'Failed to quarantine' });
  }
});

/**
 * GCP firewall quarantine
 */
router.post('/isolate/gcp', requireAuth, requireRole(['admin', 'security_analyst']), async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address required' });
    }

    const result = await gcpQuarantineService.quarantineIP(ipAddress, reason || 'Manual quarantine');

    res.json({ result });
  } catch (error) {
    logger.error('Failed to quarantine GCP IP', { error });
    res.status(500).json({ error: 'Failed to quarantine' });
  }
});

// ============================================================================
// TICKETING ENDPOINTS
// ============================================================================

/**
 * Create incident ticket
 */
router.post('/tickets', requireAuth, requireRole(['admin', 'security_analyst']), async (req: Request, res: Response) => {
  try {
    const { title, description, priority, category, assignee } = req.body;

    const results = await ticketingService.createAndNotify({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'security',
      assignee,
      metadata: {
        organizationId: req.user?.organizationId,
        createdBy: req.user?.userId,
      },
    });

    res.json({ results });
  } catch (error) {
    logger.error('Failed to create ticket', { error });
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ============================================================================
// CLOUD STATUS ENDPOINTS
// ============================================================================

/**
 * Get cloud integration status
 */
router.get('/cloud/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = {
      kubernetes: kubernetesIsolationService.isConfigured(),
      azure: azureQuarantineService.isConfigured(),
      gcp: gcpQuarantineService.isConfigured(),
    };

    res.json({ status });
  } catch (error) {
    logger.error('Failed to get cloud status', { error });
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
