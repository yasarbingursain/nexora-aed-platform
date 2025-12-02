import { Request, Response } from 'express';
import { remediationService } from '@/services/remediation.service';
import { logger } from '@/utils/logger';

export class RemediationController {
  private getOrganizationId(req: Request): string {
    const organizationId = req.tenant?.organizationId;
    if (!organizationId) throw new Error('No organization context');
    return organizationId as string;
  }

  // PLAYBOOKS
  async listPlaybooks(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const result = await remediationService.listPlaybooks(organizationId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to list playbooks', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error', message: 'Failed to list playbooks' });
    }
  }

  async getPlaybookById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const playbook = await remediationService.getPlaybookById(id, organizationId);
      res.status(200).json(playbook);
    } catch (error) {
      if (error instanceof Error && error.message === 'Playbook not found') {
        res.status(404).json({ error: 'Not found', message: 'Playbook not found' });
        return;
      }
      logger.error('Failed to get playbook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createPlaybook(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const playbook = await remediationService.createPlaybook(organizationId, req.body);
      res.status(201).json(playbook);
    } catch (error) {
      logger.error('Failed to create playbook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePlaybook(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const playbook = await remediationService.updatePlaybook(id, organizationId, req.body);
      res.status(200).json(playbook);
    } catch (error) {
      if (error instanceof Error && error.message === 'Playbook not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      logger.error('Failed to update playbook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deletePlaybook(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const result = await remediationService.deletePlaybook(id, organizationId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Playbook not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      logger.error('Failed to delete playbook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async executePlaybook(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const result = await remediationService.executePlaybook(organizationId, req.body);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to execute playbook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ACTIONS
  async listActions(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const result = await remediationService.listActions(organizationId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to list actions', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActionById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const action = await remediationService.getActionById(id, organizationId);
      res.status(200).json(action);
    } catch (error) {
      if (error instanceof Error && error.message === 'Action not found') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      logger.error('Failed to get action', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const remediationController = new RemediationController();
