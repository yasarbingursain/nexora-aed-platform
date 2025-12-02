import { remediationRepository } from '@/repositories/remediation.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import type {
  CreatePlaybookInput,
  UpdatePlaybookInput,
  ExecutePlaybookInput,
  ListPlaybooksQuery,
  ListActionsQuery,
} from '@/validators/remediation.validator';

/**
 * Remediation Service
 * 
 * Business logic for remediation playbooks and actions
 */

export class RemediationService {
  // ============ PLAYBOOKS ============

  async listPlaybooks(organizationId: string, query: ListPlaybooksQuery) {
    const { page = 1, limit = 20, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PlaybookWhereInput = {
      organizationId,
    };

    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [playbooks, total] = await Promise.all([
      remediationRepository.findAllPlaybooks(organizationId, { skip, take: limit, where }),
      remediationRepository.countPlaybooks(organizationId, where),
    ]);

    return {
      data: playbooks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPlaybookById(id: string, organizationId: string) {
    const playbook = await remediationRepository.findPlaybookById(id, organizationId);
    if (!playbook) throw new Error('Playbook not found');
    return playbook;
  }

  async createPlaybook(organizationId: string, data: CreatePlaybookInput) {
    const playbookData: Prisma.PlaybookCreateInput = {
      name: data.name,
      description: data.description || null,
      trigger: JSON.stringify(data.trigger || {}),
      actions: JSON.stringify(data.actions),
      isActive: data.isActive ?? true,
      organization: { connect: { id: organizationId } },
    };

    const playbook = await remediationRepository.createPlaybook(playbookData);
    logger.info('Playbook created', { id: playbook.id, organizationId, name: playbook.name });
    return playbook;
  }

  async updatePlaybook(id: string, organizationId: string, data: UpdatePlaybookInput) {
    await this.getPlaybookById(id, organizationId);

    const updateData: Prisma.PlaybookUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.trigger && { trigger: JSON.stringify(data.trigger) }),
      ...(data.actions && { actions: JSON.stringify(data.actions) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    };

    await remediationRepository.updatePlaybook(id, organizationId, updateData);
    logger.info('Playbook updated', { id, organizationId });
    return this.getPlaybookById(id, organizationId);
  }

  async deletePlaybook(id: string, organizationId: string) {
    await this.getPlaybookById(id, organizationId);
    await remediationRepository.deletePlaybook(id, organizationId);
    logger.info('Playbook deleted', { id, organizationId });
    return { success: true, message: 'Playbook deleted successfully' };
  }

  async executePlaybook(organizationId: string, data: ExecutePlaybookInput) {
    const playbook = await this.getPlaybookById(data.playbookId, organizationId);

    if (!playbook.isActive) {
      throw new Error('Playbook is not active');
    }

    const actionData: Prisma.ActionCreateInput = {
      type: 'playbook_execution',
      status: data.dryRun ? 'completed' : 'pending',
      parameters: JSON.stringify(data.parameters || {}),
      organization: { connect: { id: organizationId } },
      playbook: { connect: { id: data.playbookId } },
      ...(data.identityId && { identity: { connect: { id: data.identityId } } }),
      ...(data.threatId && { threat: { connect: { id: data.threatId } } }),
    };

    const action = await remediationRepository.createAction(actionData);

    logger.info('Playbook execution initiated', {
      actionId: action.id,
      playbookId: data.playbookId,
      organizationId,
      dryRun: data.dryRun,
    });

    return {
      success: true,
      message: data.dryRun ? 'Dry run completed' : 'Execution initiated',
      action,
    };
  }

  // ============ ACTIONS ============

  async listActions(organizationId: string, query: ListActionsQuery) {
    const { page = 1, limit = 20, type, status, identityId, threatId, playbookId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ActionWhereInput = { organizationId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (identityId) where.identityId = identityId;
    if (threatId) where.threatId = threatId;
    if (playbookId) where.playbookId = playbookId;

    const orderBy: Prisma.ActionOrderByWithRelationInput = { createdAt: 'desc' };

    const [actions, total] = await Promise.all([
      remediationRepository.findAllActions(organizationId, { skip, take: limit, where, orderBy }),
      remediationRepository.countActions(organizationId, where),
    ]);

    return {
      data: actions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getActionById(id: string, organizationId: string) {
    const action = await remediationRepository.findActionById(id, organizationId);
    if (!action) throw new Error('Action not found');
    return action;
  }
}

export const remediationService = new RemediationService();
