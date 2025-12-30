/**
 * Workflow Remediation Service
 * Multi-Step Workflow Engine with Approval Gates & Rollback
 * 
 * Standards Compliance:
 * - NIST SP 800-61 (Incident Handling)
 * - ISO 27035 (Incident Management)
 * - SOAR Best Practices
 * 
 * Features:
 * - Multi-step workflow execution
 * - Human-in-the-loop approval gates
 * - Automatic rollback on failure
 * - Step-level timeout management
 * - Execution history and audit trail
 * - Parallel and sequential step execution
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { remediationExecutor, ActionType, ExecutionResult } from '@/services/remediation/executor.service';
import { rollbackService } from '@/services/remediation/rollback.service';
import { emailService } from './email.service';
import { notificationQueueService } from './notification-queue.service';
import { slackService } from './integrations/ticketing.service';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type WorkflowStatus = 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
type StepStatus = 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'skipped' | 'rolled_back';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'approval' | 'condition' | 'parallel' | 'notification';
  action?: {
    type: string;
    target: string;
    parameters: Record<string, any>;
    cloudProvider?: string;
    blastRadius?: 'low' | 'medium' | 'high' | 'critical';
  };
  approval?: {
    requiredApprovers: number;
    approverRoles: string[];
    timeoutMinutes: number;
    escalationEmail?: string;
  };
  condition?: {
    expression: string;
    onTrue: string; // step id
    onFalse: string; // step id
  };
  parallel?: {
    steps: string[]; // step ids to run in parallel
  };
  notification?: {
    channels: ('email' | 'slack' | 'webhook')[];
    template: string;
    recipients: string[];
  };
  timeout: number; // seconds
  retryCount: number;
  onFailure: 'stop' | 'continue' | 'rollback';
  rollbackAction?: {
    type: string;
    target: string;
    parameters: Record<string, any>;
  };
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  trigger: {
    type: 'manual' | 'threat_detected' | 'risk_threshold' | 'schedule';
    conditions?: Record<string, any>;
  };
  steps: WorkflowStep[];
  globalTimeout: number; // seconds
  rollbackOnFailure: boolean;
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  organizationId: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  context: Record<string, any>;
  stepResults: StepResult[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  triggeredBy: string;
  targetIdentityId?: string;
  targetThreatId?: string;
}

interface StepResult {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  rollbackData?: any;
  approvals?: ApprovalRecord[];
}

interface ApprovalRecord {
  approverId: string;
  approverEmail: string;
  status: ApprovalStatus;
  comment?: string;
  timestamp: Date;
}

interface ExecuteWorkflowInput {
  workflowId: string;
  organizationId: string;
  triggeredBy: string;
  context?: Record<string, any>;
  targetIdentityId?: string;
  targetThreatId?: string;
  dryRun?: boolean;
}

// ============================================================================
// WORKFLOW REMEDIATION SERVICE
// ============================================================================

export class WorkflowRemediationService extends EventEmitter {
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private pendingApprovals: Map<string, { executionId: string; stepId: string; expiresAt: Date }> = new Map();

  constructor() {
    super();
    this.startApprovalExpiryChecker();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(input: ExecuteWorkflowInput): Promise<WorkflowExecution> {
    const startTime = Date.now();

    try {
      // Get workflow definition
      const workflow = await this.getWorkflowDefinition(input.workflowId, input.organizationId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Create execution record
      const execution: WorkflowExecution = {
        id: this.generateExecutionId(),
        workflowId: input.workflowId,
        organizationId: input.organizationId,
        status: 'running',
        currentStepIndex: 0,
        context: {
          ...input.context,
          dryRun: input.dryRun ?? false,
          targetIdentityId: input.targetIdentityId,
          targetThreatId: input.targetThreatId,
        },
        stepResults: [],
        startedAt: new Date(),
        triggeredBy: input.triggeredBy,
        targetIdentityId: input.targetIdentityId,
        targetThreatId: input.targetThreatId,
      };

      // Store active execution
      this.activeExecutions.set(execution.id, execution);

      // Create audit log
      await this.createAuditLog(execution, 'workflow_started', {
        workflowName: workflow.name,
        stepCount: workflow.steps.length,
      });

      // Execute steps
      await this.executeSteps(execution, workflow);

      // Update final status
      const finalExecution = this.activeExecutions.get(execution.id)!;
      finalExecution.completedAt = new Date();

      // Persist execution
      await this.persistExecution(finalExecution);

      // Cleanup
      this.activeExecutions.delete(execution.id);

      logger.info('Workflow execution completed', {
        executionId: execution.id,
        workflowId: input.workflowId,
        status: finalExecution.status,
        durationMs: Date.now() - startTime,
      });

      return finalExecution;
    } catch (error) {
      logger.error('Workflow execution failed', {
        workflowId: input.workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeSteps(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    const steps = workflow.steps;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      execution.currentStepIndex = i;

      // Check if workflow was cancelled
      if (execution.status === 'cancelled') {
        break;
      }

      // Execute step
      const stepResult = await this.executeStep(execution, step, workflow);
      execution.stepResults.push(stepResult);

      // Handle step result
      if (stepResult.status === 'failed') {
        if (step.onFailure === 'stop') {
          execution.status = 'failed';
          execution.error = stepResult.error;
          break;
        } else if (step.onFailure === 'rollback') {
          execution.status = 'failed';
          execution.error = stepResult.error;
          await this.rollbackExecution(execution, workflow);
          break;
        }
        // 'continue' - proceed to next step
      } else if (stepResult.status === 'awaiting_approval') {
        execution.status = 'awaiting_approval';
        // Workflow pauses here until approval
        return;
      }
    }

    // All steps completed successfully
    if (execution.status === 'running') {
      execution.status = 'completed';
    }

    // Send notifications
    if (workflow.notifyOnComplete && execution.status === 'completed') {
      await this.sendNotification(execution, 'workflow_completed');
    }
    if (workflow.notifyOnFailure && execution.status === 'failed') {
      await this.sendNotification(execution, 'workflow_failed');
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    execution: WorkflowExecution,
    step: WorkflowStep,
    workflow: WorkflowDefinition
  ): Promise<StepResult> {
    const stepResult: StepResult = {
      stepId: step.id,
      stepName: step.name,
      status: 'running',
      startedAt: new Date(),
    };

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Step timeout')), step.timeout * 1000);
      });

      let result: any;

      switch (step.type) {
        case 'action':
          result = await Promise.race([
            this.executeActionStep(execution, step),
            timeoutPromise,
          ]);
          stepResult.result = result;
          stepResult.rollbackData = result.rollbackData;
          break;

        case 'approval':
          result = await this.executeApprovalStep(execution, step);
          if (result.status === 'pending') {
            stepResult.status = 'awaiting_approval';
            stepResult.approvals = result.approvals;
            return stepResult;
          }
          if (result.status === 'rejected') {
            throw new Error('Approval rejected');
          }
          stepResult.approvals = result.approvals;
          break;

        case 'condition':
          result = await this.executeConditionStep(execution, step);
          stepResult.result = result;
          break;

        case 'parallel':
          result = await Promise.race([
            this.executeParallelSteps(execution, step, workflow),
            timeoutPromise,
          ]);
          stepResult.result = result;
          break;

        case 'notification':
          result = await this.executeNotificationStep(execution, step);
          stepResult.result = result;
          break;
      }

      stepResult.status = 'completed';
      stepResult.completedAt = new Date();

      await this.createAuditLog(execution, 'step_completed', {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
      });

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error instanceof Error ? error.message : 'Unknown error';
      stepResult.completedAt = new Date();

      await this.createAuditLog(execution, 'step_failed', {
        stepId: step.id,
        stepName: step.name,
        error: stepResult.error,
      });

      // Retry logic
      if (step.retryCount > 0) {
        for (let retry = 0; retry < step.retryCount; retry++) {
          logger.info('Retrying step', { stepId: step.id, attempt: retry + 1 });
          await this.delay(1000 * (retry + 1)); // Exponential backoff

          try {
            const retryResult = await this.executeStep(execution, { ...step, retryCount: 0 }, workflow);
            if (retryResult.status === 'completed') {
              return retryResult;
            }
          } catch {
            // Continue to next retry
          }
        }
      }
    }

    return stepResult;
  }

  /**
   * Execute an action step
   */
  private async executeActionStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.action) {
      throw new Error('Action step missing action configuration');
    }

    const context = {
      organizationId: execution.organizationId,
      identityId: execution.targetIdentityId,
      threatId: execution.targetThreatId,
      workflowExecutionId: execution.id,
      dryRun: execution.context.dryRun,
    };

    const actions = [{
      type: step.action.type as ActionType,
      target: step.action.target,
      parameters: step.action.parameters,
      cloudProvider: step.action.cloudProvider as 'aws' | 'azure' | 'gcp' | undefined,
    }];

    const results = await remediationExecutor.executeActions(actions, context);
    const result = results[0];

    if (!result.success) {
      throw new Error(result.error || 'Action failed');
    }

    return {
      success: true,
      details: result.details,
      rollbackData: result.rollbackData,
    };
  }

  /**
   * Execute an approval step
   */
  private async executeApprovalStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.approval) {
      throw new Error('Approval step missing approval configuration');
    }

    const approvalId = this.generateApprovalId();
    const expiresAt = new Date(Date.now() + step.approval.timeoutMinutes * 60 * 1000);

    // Store pending approval
    this.pendingApprovals.set(approvalId, {
      executionId: execution.id,
      stepId: step.id,
      expiresAt,
    });

    // Create approval request in database
    await prisma.auditLog.create({
      data: {
        event: 'approval_requested',
        entityType: 'workflow_execution',
        entityId: execution.id,
        action: 'approval_request',
        organizationId: execution.organizationId,
        metadata: JSON.stringify({
          approvalId,
          stepId: step.id,
          stepName: step.name,
          requiredApprovers: step.approval.requiredApprovers,
          approverRoles: step.approval.approverRoles,
          expiresAt: expiresAt.toISOString(),
        }),
        severity: 'high',
      },
    });

    // Send notification to approvers
    await this.notifyApprovers(execution, step, approvalId);

    return {
      status: 'pending',
      approvalId,
      expiresAt,
      approvals: [],
    };
  }

  /**
   * Process approval response
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    approverEmail: string,
    approved: boolean,
    comment?: string
  ): Promise<{ success: boolean; workflowResumed: boolean }> {
    const pendingApproval = this.pendingApprovals.get(approvalId);
    if (!pendingApproval) {
      throw new Error('Approval not found or expired');
    }

    const execution = this.activeExecutions.get(pendingApproval.executionId);
    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    // Record approval
    const currentStep = execution.stepResults.find(r => r.stepId === pendingApproval.stepId);
    if (currentStep) {
      currentStep.approvals = currentStep.approvals || [];
      currentStep.approvals.push({
        approverId,
        approverEmail,
        status: approved ? 'approved' : 'rejected',
        comment,
        timestamp: new Date(),
      });
    }

    // Create audit log
    await this.createAuditLog(execution, approved ? 'approval_granted' : 'approval_rejected', {
      approvalId,
      approverId,
      comment,
    });

    if (!approved) {
      // Rejection - fail the workflow
      execution.status = 'failed';
      execution.error = `Approval rejected by ${approverEmail}: ${comment || 'No reason provided'}`;
      this.pendingApprovals.delete(approvalId);
      return { success: true, workflowResumed: false };
    }

    // Check if we have enough approvals
    const workflow = await this.getWorkflowDefinition(execution.workflowId, execution.organizationId);
    const step = workflow?.steps.find(s => s.id === pendingApproval.stepId);
    
    if (step?.approval && currentStep?.approvals) {
      const approvedCount = currentStep.approvals.filter(a => a.status === 'approved').length;
      
      if (approvedCount >= step.approval.requiredApprovers) {
        // Resume workflow
        this.pendingApprovals.delete(approvalId);
        execution.status = 'running';
        
        // Continue execution from next step
        if (workflow) {
          const stepIndex = workflow.steps.findIndex(s => s.id === pendingApproval.stepId);
          if (stepIndex >= 0 && stepIndex < workflow.steps.length - 1) {
            // Execute remaining steps
            const remainingSteps = workflow.steps.slice(stepIndex + 1);
            for (const nextStep of remainingSteps) {
              const stepResult = await this.executeStep(execution, nextStep, workflow);
              execution.stepResults.push(stepResult);
              
              if (stepResult.status === 'failed' && nextStep.onFailure === 'stop') {
                execution.status = 'failed';
                break;
              }
            }
            
            if (execution.status === 'running') {
              execution.status = 'completed';
            }
          } else {
            execution.status = 'completed';
          }
        }
        
        return { success: true, workflowResumed: true };
      }
    }

    return { success: true, workflowResumed: false };
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.condition) {
      throw new Error('Condition step missing condition configuration');
    }

    // Simple expression evaluation
    const result = this.evaluateCondition(step.condition.expression, execution.context);
    
    return {
      expression: step.condition.expression,
      result,
      nextStep: result ? step.condition.onTrue : step.condition.onFalse,
    };
  }

  /**
   * Execute parallel steps
   */
  private async executeParallelSteps(
    execution: WorkflowExecution,
    step: WorkflowStep,
    workflow: WorkflowDefinition
  ): Promise<any> {
    if (!step.parallel) {
      throw new Error('Parallel step missing parallel configuration');
    }

    const parallelSteps = step.parallel.steps
      .map(stepId => workflow.steps.find(s => s.id === stepId))
      .filter((s): s is WorkflowStep => s !== undefined);

    const results = await Promise.allSettled(
      parallelSteps.map(s => this.executeStep(execution, s, workflow))
    );

    return {
      parallelResults: results.map((r, i) => ({
        stepId: parallelSteps[i].id,
        status: r.status,
        result: r.status === 'fulfilled' ? r.value : undefined,
        error: r.status === 'rejected' ? r.reason : undefined,
      })),
    };
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.notification) {
      throw new Error('Notification step missing notification configuration');
    }

    const results: any[] = [];

    for (const channel of step.notification.channels) {
      try {
        await this.sendChannelNotification(channel, step.notification.template, {
          execution,
          recipients: step.notification.recipients,
        });
        results.push({ channel, success: true });
      } catch (error) {
        results.push({ channel, success: false, error: (error as Error).message });
      }
    }

    return { notifications: results };
  }

  /**
   * Rollback execution
   */
  private async rollbackExecution(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    logger.info('Starting workflow rollback', { executionId: execution.id });

    // Rollback completed steps in reverse order
    const completedSteps = execution.stepResults
      .filter(r => r.status === 'completed' && r.rollbackData)
      .reverse();

    for (const stepResult of completedSteps) {
      const step = workflow.steps.find(s => s.id === stepResult.stepId);
      
      if (step?.rollbackAction) {
        try {
          await remediationExecutor.executeActions([{
            type: step.rollbackAction.type as ActionType,
            target: step.rollbackAction.target,
            parameters: {
              ...step.rollbackAction.parameters,
              rollbackData: stepResult.rollbackData,
            },
          }], {
            organizationId: execution.organizationId,
            dryRun: execution.context.dryRun,
          });

          stepResult.status = 'rolled_back';

          await this.createAuditLog(execution, 'step_rolled_back', {
            stepId: step.id,
            stepName: step.name,
          });
        } catch (error) {
          logger.error('Rollback failed for step', {
            stepId: step.id,
            error: (error as Error).message,
          });
        }
      }
    }

    execution.status = 'rolled_back';
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string, userId: string, reason: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    execution.status = 'cancelled';
    execution.error = `Cancelled by ${userId}: ${reason}`;
    execution.completedAt = new Date();

    await this.createAuditLog(execution, 'workflow_cancelled', {
      cancelledBy: userId,
      reason,
    });

    // Clean up pending approvals
    for (const [approvalId, approval] of this.pendingApprovals) {
      if (approval.executionId === executionId) {
        this.pendingApprovals.delete(approvalId);
      }
    }

    return true;
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string, organizationId: string): Promise<WorkflowExecution | null> {
    // Check active executions first
    const active = this.activeExecutions.get(executionId);
    if (active && active.organizationId === organizationId) {
      return active;
    }

    // Check persisted executions
    const persisted = await prisma.action.findFirst({
      where: {
        id: executionId,
        organizationId,
        type: 'workflow_execution',
      },
    });

    if (persisted) {
      return JSON.parse(persisted.result || '{}') as WorkflowExecution;
    }

    return null;
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    organizationId: string,
    options: { page?: number; limit?: number; status?: WorkflowStatus; workflowId?: string }
  ): Promise<{ data: any[]; pagination: any }> {
    const { page = 1, limit = 20, status, workflowId } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      type: 'workflow_execution',
    };

    if (status) {
      where.status = status;
    }
    if (workflowId) {
      where.playbookId = workflowId;
    }

    const [executions, total] = await Promise.all([
      prisma.action.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.action.count({ where }),
    ]);

    return {
      data: executions.map(e => ({
        id: e.id,
        workflowId: e.playbookId,
        status: e.status,
        createdAt: e.createdAt,
        completedAt: e.completedAt,
        result: e.result ? JSON.parse(e.result) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getWorkflowDefinition(workflowId: string, organizationId: string): Promise<WorkflowDefinition | null> {
    const playbook = await prisma.playbook.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!playbook) return null;

    // Parse playbook into workflow definition
    const trigger = JSON.parse(playbook.trigger);
    const actions = JSON.parse(playbook.actions);

    return {
      id: playbook.id,
      name: playbook.name,
      description: playbook.description || '',
      version: '1.0.0',
      trigger,
      steps: actions.map((action: any, index: number) => ({
        id: `step-${index}`,
        name: action.name || `Step ${index + 1}`,
        type: action.requiresApproval ? 'approval' : 'action',
        action: action.requiresApproval ? undefined : action,
        approval: action.requiresApproval ? {
          requiredApprovers: 1,
          approverRoles: ['admin', 'analyst'],
          timeoutMinutes: 60,
        } : undefined,
        timeout: action.timeout || 300,
        retryCount: action.retryCount || 0,
        onFailure: action.blastRadius === 'critical' ? 'rollback' : 'stop',
      })),
      globalTimeout: 3600,
      rollbackOnFailure: true,
      notifyOnComplete: true,
      notifyOnFailure: true,
    };
  }

  private async persistExecution(execution: WorkflowExecution): Promise<void> {
    await prisma.action.create({
      data: {
        id: execution.id,
        type: 'workflow_execution',
        status: execution.status,
        organizationId: execution.organizationId,
        playbookId: execution.workflowId,
        identityId: execution.targetIdentityId,
        threatId: execution.targetThreatId,
        parameters: JSON.stringify(execution.context),
        result: JSON.stringify(execution),
        executedAt: execution.startedAt,
        completedAt: execution.completedAt,
      },
    });
  }

  private async createAuditLog(execution: WorkflowExecution, event: string, metadata: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        event,
        entityType: 'workflow_execution',
        entityId: execution.id,
        action: 'execute',
        organizationId: execution.organizationId,
        userId: execution.triggeredBy,
        metadata: JSON.stringify({
          ...metadata,
          workflowId: execution.workflowId,
          targetIdentityId: execution.targetIdentityId,
          targetThreatId: execution.targetThreatId,
        }),
        severity: 'medium',
      },
    });
  }

  private async notifyApprovers(execution: WorkflowExecution, step: WorkflowStep, approvalId: string): Promise<void> {
    if (!step.approval) return;

    try {
      // Get workflow details
      const workflow = await this.getWorkflowDefinition(execution.workflowId, execution.organizationId);
      if (!workflow) return;

      // Get approvers based on roles
      const approvers = await prisma.user.findMany({
        where: {
          organizationId: execution.organizationId,
          role: { in: step.approval.approverRoles },
        },
        select: { id: true, email: true, fullName: true },
      });

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + step.approval.timeoutMinutes * 60 * 1000);
      const expiresIn = `${step.approval.timeoutMinutes} minutes`;

      // Generate approval URLs
      const baseUrl = process.env.FRONTEND_URL || 'https://app.nexora.io';
      const approveUrl = `${baseUrl}/workflows/approvals/${approvalId}/approve`;
      const rejectUrl = `${baseUrl}/workflows/approvals/${approvalId}/reject`;

      // Prepare workflow details
      const details: Record<string, any> = {
        'Workflow': workflow.name,
        'Step': step.name,
        'Triggered By': execution.triggeredBy,
        'Organization': execution.organizationId,
      };

      if (execution.targetIdentityId) {
        details['Target Identity'] = execution.targetIdentityId;
      }
      if (execution.targetThreatId) {
        details['Related Threat'] = execution.targetThreatId;
      }

      // Determine blast radius
      const blastRadius = step.action?.blastRadius || 'medium';

      // Send email to each approver
      for (const approver of approvers) {
        if (emailService.isConfigured()) {
          await emailService.sendWorkflowApproval(
            approver.email,
            approver.fullName || 'User',
            workflow.name,
            workflow.description,
            blastRadius,
            approveUrl,
            rejectUrl,
            expiresIn,
            details
          );
        }

        // Also queue notification in system
        await notificationQueueService.queueNotification({
          userId: approver.id,
          organizationId: execution.organizationId,
          type: 'workflow_approval',
          severity: blastRadius === 'critical' ? 'critical' : blastRadius === 'high' ? 'high' : 'medium',
          title: `Approval Required: ${workflow.name}`,
          message: `${step.name} requires your approval. Expires in ${expiresIn}.`,
          data: {
            approvalId,
            executionId: execution.id,
            workflowId: execution.workflowId,
            stepId: step.id,
            expiresAt: expiresAt.toISOString(),
          },
          actionUrl: approveUrl,
          expiresAt,
          sendEmail: false, // Already sent via emailService
          sendWebSocket: true,
        });
      }

      logger.info('Approval notifications sent', {
        executionId: execution.id,
        stepId: step.id,
        approvalId,
        approverCount: approvers.length,
      });
    } catch (error) {
      logger.error('Failed to send approval notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionId: execution.id,
        stepId: step.id,
      });
    }
  }

  private async sendNotification(execution: WorkflowExecution, type: string): Promise<void> {
    try {
      const workflow = await this.getWorkflowDefinition(execution.workflowId, execution.organizationId);
      if (!workflow) return;

      // Get user who triggered the workflow
      const user = await prisma.user.findUnique({
        where: { id: execution.triggeredBy },
        select: { email: true, fullName: true },
      });

      if (!user) return;

      const baseUrl = process.env.FRONTEND_URL || 'https://app.nexora.io';
      const actionUrl = `${baseUrl}/workflows/executions/${execution.id}`;

      let title: string;
      let message: string;
      let severity: 'low' | 'medium' | 'high' | 'critical';

      if (type === 'workflow_completed') {
        title = `Workflow Completed: ${workflow.name}`;
        message = `The workflow "${workflow.name}" has completed successfully.`;
        severity = 'low';
      } else if (type === 'workflow_failed') {
        title = `Workflow Failed: ${workflow.name}`;
        message = `The workflow "${workflow.name}" has failed. Error: ${execution.error || 'Unknown error'}`;
        severity = 'high';
      } else {
        title = `Workflow Notification: ${workflow.name}`;
        message = `Workflow "${workflow.name}" - ${type}`;
        severity = 'medium';
      }

      // Send email notification
      if (emailService.isConfigured()) {
        await emailService.sendSecurityAlert(
          user.email,
          user.fullName || 'User',
          severity,
          title,
          message,
          actionUrl,
          {
            'Workflow': workflow.name,
            'Execution ID': execution.id,
            'Status': execution.status,
            'Duration': execution.completedAt 
              ? `${Math.round((execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000)}s`
              : 'In progress',
          }
        );
      }

      // Queue notification
      await notificationQueueService.queueNotification({
        userId: execution.triggeredBy,
        organizationId: execution.organizationId,
        type: 'system_notification',
        severity,
        title,
        message,
        data: {
          executionId: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
        },
        actionUrl,
        sendEmail: false, // Already sent
        sendWebSocket: true,
      });

      logger.info('Workflow notification sent', {
        executionId: execution.id,
        type,
        recipient: user.email,
      });
    } catch (error) {
      logger.error('Failed to send workflow notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionId: execution.id,
        type,
      });
    }
  }

  private async sendChannelNotification(channel: string, template: string, data: any): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          if (emailService.isConfigured() && data.recipients) {
            for (const recipient of data.recipients) {
              await emailService.send({
                to: recipient,
                subject: `Nexora Workflow: ${data.execution?.workflowName || 'Notification'}`,
                text: template,
                html: `<p>${template}</p>`,
                priority: 'normal',
              });
            }
          }
          break;

        case 'slack':
          if (slackService.isConfigured()) {
            await slackService.sendMessage(template);
          }
          break;

        case 'webhook':
          if (process.env.WEBHOOK_URL) {
            await fetch(process.env.WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel,
                template,
                data,
                timestamp: new Date().toISOString(),
              }),
            });
          }
          break;
      }

      logger.info('Channel notification sent', { channel, template });
    } catch (error) {
      logger.error('Channel notification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        channel,
      });
    }
  }

  private evaluateCondition(expression: string, context: Record<string, any>): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    try {
      const fn = new Function('context', `with(context) { return ${expression}; }`);
      return fn(context);
    } catch {
      return false;
    }
  }

  private startApprovalExpiryChecker(): void {
    setInterval(() => {
      const now = new Date();
      for (const [approvalId, approval] of this.pendingApprovals) {
        if (approval.expiresAt < now) {
          this.handleExpiredApproval(approvalId, approval);
        }
      }
    }, 60000); // Check every minute
  }

  private async handleExpiredApproval(approvalId: string, approval: { executionId: string; stepId: string }): Promise<void> {
    const execution = this.activeExecutions.get(approval.executionId);
    if (!execution) return;

    try {
      execution.status = 'failed';
      execution.error = 'Approval timeout expired';
      
      // Get workflow and step details
      const workflow = await this.getWorkflowDefinition(execution.workflowId, execution.organizationId);
      const step = workflow?.steps.find(s => s.id === approval.stepId);

      // Send escalation notification if configured
      if (step?.approval?.escalationEmail && emailService.isConfigured()) {
        await emailService.send({
          to: step.approval.escalationEmail,
          subject: `[ESCALATION] Approval Timeout: ${workflow?.name || 'Workflow'}`,
          html: `
            <h2>⚠️ Approval Request Timeout - Escalation Required</h2>
            <p>An approval request has expired without response.</p>
            <h3>Details:</h3>
            <ul>
              <li><strong>Workflow:</strong> ${workflow?.name || 'Unknown'}</li>
              <li><strong>Step:</strong> ${step?.name || 'Unknown'}</li>
              <li><strong>Execution ID:</strong> ${execution.id}</li>
              <li><strong>Timeout Duration:</strong> ${step?.approval?.timeoutMinutes || 'Unknown'} minutes</li>
              <li><strong>Original Approvers:</strong> ${step?.approval?.approverRoles?.join(', ') || 'Unknown'}</li>
            </ul>
            <p><strong>Action Required:</strong> The workflow has been automatically cancelled. Please review and take appropriate action.</p>
            <p>View details: ${process.env.FRONTEND_URL || 'https://app.nexora.io'}/workflows/executions/${execution.id}</p>
          `,
          text: `
            ESCALATION: Approval Request Timeout
            
            An approval request has expired without response.
            
            Workflow: ${workflow?.name || 'Unknown'}
            Step: ${step?.name || 'Unknown'}
            Execution ID: ${execution.id}
            Timeout Duration: ${step?.approval?.timeoutMinutes || 'Unknown'} minutes
            Original Approvers: ${step?.approval?.approverRoles?.join(', ') || 'Unknown'}
            
            The workflow has been automatically cancelled. Please review and take appropriate action.
          `,
          priority: 'high',
        });

        logger.info('Approval timeout escalation sent', {
          executionId: execution.id,
          approvalId,
          escalationEmail: step.approval.escalationEmail,
        });
      }

      // Notify original approvers
      if (step?.approval) {
        const approvers = await prisma.user.findMany({
          where: {
            organizationId: execution.organizationId,
            role: { in: step.approval.approverRoles },
          },
          select: { id: true, email: true, fullName: true },
        });

        for (const approver of approvers) {
          await notificationQueueService.queueNotification({
            userId: approver.id,
            organizationId: execution.organizationId,
            type: 'system_notification',
            severity: 'high',
            title: `Approval Timeout: ${workflow?.name || 'Workflow'}`,
            message: `Your approval request for "${step.name}" has expired. The workflow has been cancelled.`,
            data: {
              approvalId,
              executionId: execution.id,
              workflowId: execution.workflowId,
              stepId: approval.stepId,
            },
            sendEmail: true,
            sendWebSocket: true,
          });
        }
      }

      await this.createAuditLog(execution, 'approval_expired', {
        approvalId,
        stepId: approval.stepId,
        escalationSent: !!step?.approval?.escalationEmail,
      });
    } catch (error) {
      logger.error('Failed to handle expired approval', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionId: execution.id,
        approvalId,
      });
    }

    this.pendingApprovals.delete(approvalId);
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateApprovalId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workflowRemediationService = new WorkflowRemediationService();
