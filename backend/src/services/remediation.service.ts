import { remediationRepository } from '@/repositories/remediation.repository';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type {
  CreatePlaybookInput,
  UpdatePlaybookInput,
  ExecutePlaybookInput,
  ListPlaybooksQuery,
  ListActionsQuery,
} from '@/validators/remediation.validator';

/**
 * SECURITY FIX: CWE-502 - Deserialization of Untrusted Data
 * 
 * Strict Zod schemas prevent malicious JSON injection attacks.
 * All JSON.parse() operations are validated before use.
 */

// Playbook Action Schema - Strictly typed
const PlaybookActionSchema = z.object({
  type: z.enum(['rotate', 'quarantine', 'notify', 'block', 'isolate', 'escalate']),
  target: z.string().min(1).max(255),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  timeout: z.number().int().positive().max(3600).optional(), // Max 1 hour
  retryCount: z.number().int().min(0).max(5).optional(),
}).strict(); // Reject unknown properties

const PlaybookActionsSchema = z.array(PlaybookActionSchema).min(1).max(20);

// Playbook Trigger Schema - Strictly typed
const PlaybookTriggerSchema = z.object({
  type: z.enum(['threat_severity', 'risk_level', 'time_based', 'manual']),
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  threshold: z.number().optional(),
}).strict();

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

    // SECURITY: Validate trigger on read
    let trigger;
    try {
      trigger = PlaybookTriggerSchema.parse(JSON.parse(playbook.trigger));
    } catch (error) {
      logger.error('Corrupted playbook trigger detected', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid playbook trigger data');
    }

    // SECURITY: Validate actions on read
    let actions;
    try {
      actions = PlaybookActionsSchema.parse(JSON.parse(playbook.actions));
    } catch (error) {
      logger.error('Corrupted playbook actions detected', { 
        id, 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid playbook actions data');
    }

    return {
      ...playbook,
      trigger,
      actions,
    };
  }

  async createPlaybook(organizationId: string, data: CreatePlaybookInput) {
    // SECURITY: Validate trigger before storing
    const validatedTrigger = PlaybookTriggerSchema.parse(data.trigger);
    
    // SECURITY: Validate actions before storing
    const validatedActions = PlaybookActionsSchema.parse(data.actions);

    const playbookData: Prisma.PlaybookCreateInput = {
      name: data.name,
      description: data.description || null,
      trigger: JSON.stringify(validatedTrigger),
      actions: JSON.stringify(validatedActions),
      isActive: data.isActive ?? true,
      organization: { connect: { id: organizationId } },
    };

    const playbook = await remediationRepository.createPlaybook(playbookData);
    
    logger.info('Playbook created with validated schema', {
      id: playbook.id,
      organizationId,
      name: playbook.name,
      actionCount: validatedActions.length,
    });
    
    return {
      ...playbook,
      trigger: validatedTrigger,
      actions: validatedActions,
    };
  }

  async updatePlaybook(id: string, organizationId: string, data: UpdatePlaybookInput) {
    await this.getPlaybookById(id, organizationId);

    const updateData: Prisma.PlaybookUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    };

    // SECURITY: Validate trigger if provided
    if (data.trigger) {
      const validatedTrigger = PlaybookTriggerSchema.parse(data.trigger);
      updateData.trigger = JSON.stringify(validatedTrigger);
    }

    // SECURITY: Validate actions if provided
    if (data.actions) {
      const validatedActions = PlaybookActionsSchema.parse(data.actions);
      updateData.actions = JSON.stringify(validatedActions);
    }

    await remediationRepository.updatePlaybook(id, organizationId, updateData);
    
    logger.info('Playbook updated with validated schema', {
      id,
      organizationId,
      changes: Object.keys(data),
    });
    
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

    logger.info('Playbook execution initiated', {
      playbookId: data.playbookId,
      organizationId,
      dryRun: data.dryRun !== false,
      identityId: data.identityId,
      threatId: data.threatId,
    });

    // PRODUCTION: Real remediation execution
    const { remediationExecutor } = await import('@/services/remediation/executor.service');

    const executionContext = {
      organizationId,
      identityId: data.identityId,
      threatId: data.threatId,
      playbookId: data.playbookId,
      dryRun: data.dryRun !== false,
    };

    // Convert playbook actions to remediation actions
    const actions = playbook.actions.map((action: any) => ({
      type: action.type,
      target: action.target,
      parameters: action.parameters || {},
      cloudProvider: action.cloudProvider,
      requiresApproval: action.requiresApproval,
      blastRadius: action.blastRadius,
    }));

    // Execute actions
    const actionResults = await remediationExecutor.executeActions(actions, executionContext);

    const allSuccessful = actionResults.every(r => r.success);
    const executionMode = data.dryRun !== false ? 'dry-run' : 'production';

    logger.info('Playbook execution completed', {
      playbookId: data.playbookId,
      organizationId,
      executionMode,
      totalActions: actionResults.length,
      successful: actionResults.filter(r => r.success).length,
      failed: actionResults.filter(r => !r.success).length,
    });

    return {
      success: allSuccessful,
      playbook: {
        id: playbook.id,
        name: playbook.name,
      },
      executionMode,
      actionResults,
      timestamp: new Date().toISOString(),
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
