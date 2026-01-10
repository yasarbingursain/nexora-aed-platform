import { identityRepository } from '@/repositories/identities.repository';
import { logger } from '@/utils/logger';
import { encryptionService } from '@/utils/encryption.service';
import { Prisma } from '@prisma/client';
import type {
  CreateIdentityInput,
  UpdateIdentityInput,
  ListIdentitiesQuery,
  RotateCredentialsInput,
  QuarantineIdentityInput,
} from '@/validators/identities.validator';

/**
 * Identity Service
 * 
 * Business logic for identity management
 * - All operations scoped to organizationId
 * - Handles business rules and validation
 * - Calls repository for database operations
 */

export class IdentityService {
  /**
   * List identities with pagination and filtering
   */
  async list(organizationId: string, query: ListIdentitiesQuery) {
    const { page = 1, limit = 20, type, provider, status, riskLevel, owner, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.IdentityWhereInput = {
      organizationId,  // CRITICAL: Always filter by org
    };

    if (type) where.type = type;
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    if (owner) where.owner = owner;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { owner: { contains: search } },
      ];
    }

    // Build order by
    const orderBy: Prisma.IdentityOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [identities, total] = await Promise.all([
      identityRepository.findAll(organizationId, { skip, take: limit, where, orderBy }),
      identityRepository.count(organizationId, where),
    ]);

    logger.info('Identities listed', {
      organizationId,
      count: identities.length,
      total,
      page,
      limit,
    });

    return {
      data: identities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get identity by ID
   */
  async getById(id: string, organizationId: string) {
    const identity = await identityRepository.findById(id, organizationId);

    if (!identity) {
      logger.warn('Identity not found', { id, organizationId });
      throw new Error('Identity not found');
    }

    logger.info('Identity retrieved', { id, organizationId, name: identity.name });

    return identity;
  }

  /**
   * Create new identity
   */
  async create(organizationId: string, data: CreateIdentityInput) {
    const credentials = data.credentials
      ? {
          ...data.credentials,
          value: data.credentials.encrypted
            ? data.credentials.value
            : encryptionService.encrypt(data.credentials.value),
          encrypted: true,
        }
      : {};

    // Prepare identity data
    const identityData: Prisma.IdentityCreateInput = {
      name: data.name,
      type: data.type,
      provider: data.provider,
      externalId: data.externalId || null,
      owner: data.owner || null,
      description: data.description || null,
      tags: data.tags?.join(',') || '',
      credentials: JSON.stringify(credentials),
      metadata: JSON.stringify(data.metadata || {}),
      rotationInterval: data.rotationInterval || null,
      organization: {
        connect: { id: organizationId },
      },
    };

    const identity = await identityRepository.create(identityData);

    logger.info('Identity created', {
      id: identity.id,
      organizationId,
      name: identity.name,
      type: identity.type,
      provider: identity.provider,
    });

    // Record creation activity
    await identityRepository.recordActivity(
      identity.id,
      'identity_created',
      'system',
      { name: identity.name, type: identity.type }
    );

    return identity;
  }

  /**
   * Update identity
   */
  async update(id: string, organizationId: string, data: UpdateIdentityInput) {
    // Verify identity exists
    const existing = await this.getById(id, organizationId);

    // Prepare update data
    const updateData: Prisma.IdentityUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.status && { status: data.status }),
      ...(data.riskLevel && { riskLevel: data.riskLevel }),
      ...(data.owner && { owner: data.owner }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.tags && { tags: data.tags.join(',') }),
      ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
      ...(data.rotationInterval && { rotationInterval: data.rotationInterval }),
      updatedAt: new Date(),
    };

    await identityRepository.update(id, organizationId, updateData);

    logger.info('Identity updated', {
      id,
      organizationId,
      changes: Object.keys(data),
    });

    // Record update activity
    await identityRepository.recordActivity(
      id,
      'identity_updated',
      'system',
      { changes: Object.keys(data) }
    );

    return this.getById(id, organizationId);
  }

  /**
   * Delete identity
   */
  async delete(id: string, organizationId: string) {
    // Verify identity exists
    await this.getById(id, organizationId);

    await identityRepository.delete(id, organizationId);

    logger.info('Identity deleted', { id, organizationId });

    return { success: true, message: 'Identity deleted successfully' };
  }

  /**
   * Rotate credentials
   */
  async rotateCredentials(id: string, organizationId: string, data: RotateCredentialsInput) {
    // Verify identity exists
    const identity = await this.getById(id, organizationId);

    logger.info('Rotating credentials', {
      id,
      organizationId,
      strategy: data.rotationStrategy,
    });

    // Update last rotated timestamp
    await identityRepository.update(id, organizationId, {
      lastRotatedAt: new Date(),
      updatedAt: new Date(),
    });

    // Record rotation activity
    await identityRepository.recordActivity(
      id,
      'credentials_rotated',
      'system',
      {
        strategy: data.rotationStrategy,
        notifyOwner: data.notifyOwner,
        scheduledDate: data.scheduledDate,
      }
    );

    // PRODUCTION: Real AWS credential rotation
    const rotatedIdentity = await this.getById(id, organizationId);
    
    if (rotatedIdentity.type === 'api_key' && rotatedIdentity.metadata) {
      try {
        const { awsCredentialsService } = await import('@/services/cloud/aws-credentials.service');
        
        if (awsCredentialsService.isConfigured()) {
          const metadata = rotatedIdentity.metadata as any;
          const userName = metadata.awsUserName;
          const oldKeyId = metadata.awsAccessKeyId;
          
          if (userName) {
            const newCredentials = await awsCredentialsService.rotateAccessKey(userName, oldKeyId);
            
            // Update identity metadata with new credentials
            await identityRepository.update(id, organizationId, {
              metadata: {
                ...metadata,
                awsAccessKeyId: newCredentials.accessKeyId,
                awsSecretAccessKey: newCredentials.secretAccessKey,
                lastRotated: new Date().toISOString(),
              },
            });
            
            logger.info('AWS credentials rotated successfully', { id, organizationId, userName });
          }
        } else {
          logger.warn('AWS credentials service not configured, rotation simulated', { id, organizationId });
        }
      } catch (error) {
        logger.error('AWS credential rotation failed', { id, organizationId, error });
        throw error;
      }
    }

    logger.info('Credentials rotated', { id, organizationId });

    return {
      success: true,
      message: 'Credentials rotation initiated',
      identity: await this.getById(id, organizationId),
    };
  }

  /**
   * Quarantine identity
   */
  async quarantine(id: string, organizationId: string, data: QuarantineIdentityInput) {
    // Verify identity exists
    const identity = await this.getById(id, organizationId);

    // Update status to quarantined
    await identityRepository.updateStatus(id, organizationId, 'quarantined');

    // Update risk level to critical
    await identityRepository.updateRiskLevel(id, organizationId, 'critical');

    logger.warn('Identity quarantined', {
      id,
      organizationId,
      reason: data.reason,
    });

    // Record quarantine activity
    await identityRepository.recordActivity(
      id,
      'identity_quarantined',
      'system',
      {
        reason: data.reason,
        notifyOwner: data.notifyOwner,
      }
    );

    // PRODUCTION: Real network quarantine
    const quarantinedIdentity = await this.getById(id, organizationId);
    
    if (quarantinedIdentity.metadata) {
      try {
        const { awsQuarantineService } = await import('@/services/cloud/aws-quarantine.service');
        
        if (awsQuarantineService.isConfigured()) {
          const metadata = quarantinedIdentity.metadata as any;
          const ipAddress = metadata.lastSeenIP || metadata.sourceIP;
          
          if (ipAddress) {
            await awsQuarantineService.quarantineIP(ipAddress, data.reason || 'Security threat detected');
            logger.info('Network quarantine applied', { id, organizationId, ipAddress });
          }
        } else {
          logger.warn('AWS quarantine service not configured, quarantine simulated', { id, organizationId });
        }
      } catch (error) {
        logger.error('Network quarantine failed', { id, organizationId, error });
        // Don't throw - DB quarantine still applied
      }
    }

    // Notify owner if requested
    if (data.notifyOwner && identity.owner) {
      try {
        const { emailService } = await import('@/services/email.service');
        
        if (emailService.isConfigured()) {
          await emailService.sendEmail({
            to: identity.owner,
            subject: `Security Alert: Identity "${identity.name}" Quarantined`,
            html: `
              <h2>Identity Quarantine Notification</h2>
              <p>Your identity <strong>${identity.name}</strong> (${identity.type}) has been quarantined due to security concerns.</p>
              <p><strong>Reason:</strong> ${data.reason}</p>
              <p><strong>Action Taken:</strong> The identity has been isolated and all access has been revoked.</p>
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review recent activity for this identity</li>
                <li>Contact your security team for investigation</li>
                <li>Do not attempt to use this identity until cleared</li>
              </ul>
              <p>If you believe this is an error, please contact your administrator immediately.</p>
            `,
            metadata: {
              type: 'security_alert',
              identityId: id,
              organizationId,
              severity: 'high',
            },
          });
          
          logger.info('Quarantine notification sent to owner', {
            id,
            organizationId,
            owner: identity.owner,
          });
        } else {
          logger.warn('Email service not configured, quarantine notification not sent', {
            id,
            organizationId,
            owner: identity.owner,
          });
        }
      } catch (error) {
        logger.error('Failed to send quarantine notification', {
          id,
          organizationId,
          owner: identity.owner,
          error,
        });
        // Don't throw - quarantine still applied
      }
    }

    return {
      success: true,
      message: 'Identity quarantined successfully',
      identity: await this.getById(id, organizationId),
    };
  }

  /**
   * Record activity and trigger ML analysis
   */
  async recordActivity(id: string, organizationId: string, activityType: string, metadata: any): Promise<void> {
    // Record activity in database
    await identityRepository.recordActivity(id, activityType, 'system', metadata);

    // Trigger ML analysis asynchronously
    setImmediate(async () => {
      try {
        const { mlIntegrationService } = await import('@/services/ml-integration.service');
        const prediction = await mlIntegrationService.analyzeIdentityActivity(id, organizationId);
        
        if (prediction && prediction.is_anomaly && prediction.risk_level === 'critical') {
          // Auto-create threat for critical anomalies
          const { threatService } = await import('@/services/threats.service');
          await threatService.create(organizationId, {
            identityId: id,
            severity: 'high',
            description: `ML detected critical anomaly: ${prediction.contributing_factors.join(', ')}`,
            category: 'anomalous_behavior',
            confidence: prediction.confidence,
          });
          
          logger.warn('Critical ML anomaly detected, threat created', {
            identityId: id,
            organizationId,
            riskLevel: prediction.risk_level,
          });
        }
      } catch (error) {
        logger.error('ML analysis failed during activity recording', { id, error });
      }
    });
  }


  /**
   * Get identity activities
   */
  async getActivities(id: string, organizationId: string, limit: number = 50) {
    // Verify identity exists
    await this.getById(id, organizationId);

    const activities = await identityRepository.getActivities(id, organizationId, limit);

    logger.info('Identity activities retrieved', {
      id,
      organizationId,
      count: activities.length,
    });

    return activities;
  }

  /**
   * Search identities
   */
  async search(organizationId: string, searchTerm: string, limit: number = 20) {
    const identities = await identityRepository.search(organizationId, searchTerm, limit);

    logger.info('Identities searched', {
      organizationId,
      searchTerm,
      count: identities.length,
    });

    return identities;
  }

  /**
   * Get identity statistics
   */
  async getStatistics(organizationId: string) {
    const [
      total,
      byType,
      byStatus,
      byRiskLevel,
      byProvider,
    ] = await Promise.all([
      identityRepository.count(organizationId),
      this.getCountByField(organizationId, 'type'),
      this.getCountByField(organizationId, 'status'),
      this.getCountByField(organizationId, 'riskLevel'),
      this.getCountByField(organizationId, 'provider'),
    ]);

    return {
      total,
      byType,
      byStatus,
      byRiskLevel,
      byProvider,
    };
  }

  /**
   * Helper: Get count by field
   */
  private async getCountByField(organizationId: string, field: string) {
    // This is a simplified version - in production, use Prisma groupBy
    const identities = await identityRepository.findAll(organizationId, {});
    const counts: Record<string, number> = {};

    for (const identity of identities) {
      const value = (identity as any)[field];
      counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
  }
}

export const identityService = new IdentityService();
