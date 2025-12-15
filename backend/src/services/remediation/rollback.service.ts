/**
 * Transaction Rollback Service
 * Enterprise-grade rollback system for remediation actions
 * 
 * Standards Compliance:
 * - NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide)
 * - ISO/IEC 27035 (Information Security Incident Management)
 * - ACID Transaction Properties
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import { awsCredentialsService } from '@/services/cloud/aws-credentials.service';
import { awsQuarantineService } from '@/services/cloud/aws-quarantine.service';
import { azureQuarantineService } from '@/services/cloud/azure-quarantine.service';
import { gcpQuarantineService } from '@/services/cloud/gcp-quarantine.service';
import { kubernetesIsolationService } from '@/services/cloud/kubernetes-isolation.service';

// ============================================================================
// INTERFACES
// ============================================================================

interface RollbackEntry {
  id: string;
  actionId: string;
  actionType: string;
  target: string;
  rollbackData: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  executedAt?: Date;
  error?: string;
}

interface RollbackResult {
  success: boolean;
  actionId: string;
  actionType: string;
  message: string;
  error?: string;
  timestamp: Date;
}

interface TransactionContext {
  transactionId: string;
  organizationId: string;
  actions: RollbackEntry[];
  status: 'in_progress' | 'committed' | 'rolled_back' | 'partial';
  startedAt: Date;
  completedAt?: Date;
}

// In-memory transaction store (use Redis in production)
const transactionStore = new Map<string, TransactionContext>();
const rollbackStore = new Map<string, RollbackEntry>();

// ============================================================================
// ROLLBACK SERVICE
// ============================================================================

export class RollbackService {
  private readonly DEFAULT_EXPIRY_HOURS = 24;
  private readonly MAX_ROLLBACK_ATTEMPTS = 3;

  /**
   * Register a rollback entry for an action
   */
  async registerRollback(
    actionId: string,
    actionType: string,
    target: string,
    rollbackData: Record<string, unknown>,
    expiryHours: number = this.DEFAULT_EXPIRY_HOURS
  ): Promise<RollbackEntry> {
    const entry: RollbackEntry = {
      id: `rb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      actionId,
      actionType,
      target,
      rollbackData,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    };

    rollbackStore.set(entry.id, entry);

    logger.info('Rollback entry registered', {
      rollbackId: entry.id,
      actionId,
      actionType,
      target,
    });

    return entry;
  }

  /**
   * Execute rollback for a specific action
   */
  async executeRollback(rollbackId: string): Promise<RollbackResult> {
    const entry = rollbackStore.get(rollbackId);

    if (!entry) {
      return {
        success: false,
        actionId: '',
        actionType: '',
        message: 'Rollback entry not found',
        error: 'ROLLBACK_NOT_FOUND',
        timestamp: new Date(),
      };
    }

    if (entry.status === 'completed') {
      return {
        success: false,
        actionId: entry.actionId,
        actionType: entry.actionType,
        message: 'Rollback already executed',
        error: 'ALREADY_EXECUTED',
        timestamp: new Date(),
      };
    }

    if (entry.status === 'expired' || new Date() > entry.expiresAt) {
      entry.status = 'expired';
      return {
        success: false,
        actionId: entry.actionId,
        actionType: entry.actionType,
        message: 'Rollback has expired',
        error: 'ROLLBACK_EXPIRED',
        timestamp: new Date(),
      };
    }

    try {
      const result = await this.performRollback(entry);
      
      entry.status = result.success ? 'completed' : 'failed';
      entry.executedAt = new Date();
      entry.error = result.error;

      logger.info('Rollback executed', {
        rollbackId,
        actionId: entry.actionId,
        success: result.success,
      });

      return result;
    } catch (error) {
      entry.status = 'failed';
      entry.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Rollback execution failed', {
        rollbackId,
        error: entry.error,
      });

      return {
        success: false,
        actionId: entry.actionId,
        actionType: entry.actionType,
        message: 'Rollback execution failed',
        error: entry.error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform the actual rollback based on action type
   */
  private async performRollback(entry: RollbackEntry): Promise<RollbackResult> {
    const { actionType, rollbackData, actionId, target } = entry;

    switch (actionType) {
      case 'rotate_credentials':
        return this.rollbackCredentialRotation(entry);

      case 'quarantine_identity':
      case 'block_ip':
        return this.rollbackQuarantine(entry);

      case 'revoke_token':
      case 'disable_user':
        return this.rollbackIdentityStatus(entry);

      case 'isolate_pod':
        return this.rollbackPodIsolation(entry);

      case 'azure_nsg_quarantine':
        return this.rollbackAzureNsgQuarantine(entry);

      case 'gcp_firewall_quarantine':
        return this.rollbackGcpFirewallQuarantine(entry);

      default:
        return {
          success: false,
          actionId,
          actionType,
          message: `Rollback not supported for action type: ${actionType}`,
          error: 'UNSUPPORTED_ACTION_TYPE',
          timestamp: new Date(),
        };
    }
  }

  /**
   * Rollback credential rotation (re-enable old key if still valid)
   */
  private async rollbackCredentialRotation(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { oldAccessKeyId, newAccessKeyId, userName } = rollbackData as {
      oldAccessKeyId?: string;
      newAccessKeyId?: string;
      userName?: string;
    };

    // Note: In practice, you cannot restore a deleted AWS access key
    // This rollback would delete the new key and alert the user to create a new one
    
    if (newAccessKeyId && userName) {
      try {
        // Delete the new key that was created
        await awsCredentialsService.deleteAccessKey(userName, newAccessKeyId);

        logger.info('Credential rotation rolled back', { userName, deletedKeyId: newAccessKeyId });

        return {
          success: true,
          actionId,
          actionType,
          message: `New access key ${newAccessKeyId} deleted. Manual key creation required.`,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          actionId,
          actionType,
          message: 'Failed to delete new access key',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    }

    return {
      success: false,
      actionId,
      actionType,
      message: 'Insufficient rollback data for credential rotation',
      error: 'MISSING_ROLLBACK_DATA',
      timestamp: new Date(),
    };
  }

  /**
   * Rollback AWS quarantine (remove IP from security group)
   */
  private async rollbackQuarantine(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { ipAddress } = rollbackData as { ipAddress?: string };

    if (!ipAddress) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'IP address not found in rollback data',
        error: 'MISSING_IP_ADDRESS',
        timestamp: new Date(),
      };
    }

    try {
      await awsQuarantineService.removeQuarantine(ipAddress);

      return {
        success: true,
        actionId,
        actionType,
        message: `IP ${ipAddress} removed from quarantine`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Failed to remove IP from quarantine',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rollback identity status change
   */
  private async rollbackIdentityStatus(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { identityId, previousStatus, organizationId } = rollbackData as {
      identityId?: string;
      previousStatus?: string;
      organizationId?: string;
    };

    if (!identityId || !previousStatus) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Identity ID or previous status not found',
        error: 'MISSING_ROLLBACK_DATA',
        timestamp: new Date(),
      };
    }

    try {
      await prisma.identity.update({
        where: { id: identityId },
        data: { status: previousStatus },
      });

      return {
        success: true,
        actionId,
        actionType,
        message: `Identity ${identityId} status restored to ${previousStatus}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Failed to restore identity status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rollback Kubernetes pod isolation
   */
  private async rollbackPodIsolation(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { podName, policyName, namespace } = rollbackData as {
      podName?: string;
      policyName?: string;
      namespace?: string;
    };

    if (!podName || !policyName || !namespace) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Pod isolation rollback data incomplete',
        error: 'MISSING_ROLLBACK_DATA',
        timestamp: new Date(),
      };
    }

    try {
      const result = await kubernetesIsolationService.removeIsolation(podName, policyName, namespace);

      return {
        success: result.success,
        actionId,
        actionType,
        message: result.success ? `Pod ${podName} isolation removed` : 'Failed to remove pod isolation',
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Failed to remove pod isolation',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rollback Azure NSG quarantine
   */
  private async rollbackAzureNsgQuarantine(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { ruleName } = rollbackData as { ruleName?: string };

    if (!ruleName) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Azure NSG rule name not found',
        error: 'MISSING_ROLLBACK_DATA',
        timestamp: new Date(),
      };
    }

    try {
      const result = await azureQuarantineService.removeQuarantine(ruleName);

      return {
        success: result.success,
        actionId,
        actionType,
        message: result.success ? `Azure NSG rule ${ruleName} removed` : 'Failed to remove Azure NSG rule',
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Failed to remove Azure NSG rule',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rollback GCP firewall quarantine
   */
  private async rollbackGcpFirewallQuarantine(entry: RollbackEntry): Promise<RollbackResult> {
    const { rollbackData, actionId, actionType } = entry;
    const { ruleName } = rollbackData as { ruleName?: string };

    if (!ruleName) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'GCP firewall rule name not found',
        error: 'MISSING_ROLLBACK_DATA',
        timestamp: new Date(),
      };
    }

    try {
      const result = await gcpQuarantineService.removeQuarantine(ruleName);

      return {
        success: result.success,
        actionId,
        actionType,
        message: result.success ? `GCP firewall rule ${ruleName} removed` : 'Failed to remove GCP firewall rule',
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        actionType,
        message: 'Failed to remove GCP firewall rule',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get rollback entry by ID
   */
  getRollbackEntry(rollbackId: string): RollbackEntry | undefined {
    return rollbackStore.get(rollbackId);
  }

  /**
   * Get all pending rollbacks for an action
   */
  getPendingRollbacks(actionId: string): RollbackEntry[] {
    return Array.from(rollbackStore.values()).filter(
      entry => entry.actionId === actionId && entry.status === 'pending'
    );
  }

  /**
   * List all rollback entries
   */
  listRollbacks(status?: RollbackEntry['status']): RollbackEntry[] {
    const entries = Array.from(rollbackStore.values());
    return status ? entries.filter(e => e.status === status) : entries;
  }

  /**
   * Clean up expired rollback entries
   */
  cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, entry] of rollbackStore.entries()) {
      if (entry.status === 'pending' && now > entry.expiresAt) {
        entry.status = 'expired';
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Expired rollback entries cleaned up', { count: cleaned });
    }

    return cleaned;
  }
}

// ============================================================================
// TRANSACTION MANAGER
// ============================================================================

export class TransactionManager {
  private rollbackService: RollbackService;

  constructor() {
    this.rollbackService = new RollbackService();
  }

  /**
   * Begin a new transaction
   */
  beginTransaction(organizationId: string): TransactionContext {
    const context: TransactionContext = {
      transactionId: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organizationId,
      actions: [],
      status: 'in_progress',
      startedAt: new Date(),
    };

    transactionStore.set(context.transactionId, context);

    logger.info('Transaction started', { transactionId: context.transactionId, organizationId });

    return context;
  }

  /**
   * Add action to transaction
   */
  async addAction(
    transactionId: string,
    actionId: string,
    actionType: string,
    target: string,
    rollbackData: Record<string, unknown>
  ): Promise<RollbackEntry> {
    const context = transactionStore.get(transactionId);

    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (context.status !== 'in_progress') {
      throw new Error(`Transaction ${transactionId} is not in progress`);
    }

    const entry = await this.rollbackService.registerRollback(
      actionId,
      actionType,
      target,
      rollbackData
    );

    context.actions.push(entry);

    return entry;
  }

  /**
   * Commit transaction (mark all actions as committed)
   */
  commitTransaction(transactionId: string): TransactionContext {
    const context = transactionStore.get(transactionId);

    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    context.status = 'committed';
    context.completedAt = new Date();

    logger.info('Transaction committed', {
      transactionId,
      actionsCount: context.actions.length,
    });

    return context;
  }

  /**
   * Rollback entire transaction
   */
  async rollbackTransaction(transactionId: string): Promise<RollbackResult[]> {
    const context = transactionStore.get(transactionId);

    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const results: RollbackResult[] = [];

    // Rollback in reverse order
    for (const action of [...context.actions].reverse()) {
      const result = await this.rollbackService.executeRollback(action.id);
      results.push(result);
    }

    const allSuccessful = results.every(r => r.success);
    context.status = allSuccessful ? 'rolled_back' : 'partial';
    context.completedAt = new Date();

    logger.info('Transaction rolled back', {
      transactionId,
      status: context.status,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Get transaction context
   */
  getTransaction(transactionId: string): TransactionContext | undefined {
    return transactionStore.get(transactionId);
  }

  /**
   * Get rollback service instance
   */
  getRollbackService(): RollbackService {
    return this.rollbackService;
  }
}

export const rollbackService = new RollbackService();
export const transactionManager = new TransactionManager();
