/**
 * AWS Credentials Rotation Service
 * PRODUCTION - Real AWS IAM integration
 * Standards: AWS Well-Architected Framework, CIS AWS Foundations Benchmark
 */

import { IAMClient, CreateAccessKeyCommand, DeleteAccessKeyCommand, ListAccessKeysCommand } from '@aws-sdk/client-iam';
import { logger } from '@/utils/logger';

export class AWSCredentialsService {
  private iamClient: IAMClient;

  constructor() {
    // Initialize AWS SDK with credentials from environment
    this.iamClient = new IAMClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Rotate IAM access keys for a user
   * Creates new key, returns it, then deletes old key after grace period
   */
  async rotateAccessKey(userName: string, oldAccessKeyId?: string): Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    status: string;
  }> {
    try {
      logger.info('Starting AWS IAM key rotation', { userName });

      // Step 1: Create new access key
      const createCommand = new CreateAccessKeyCommand({ UserName: userName });
      const createResponse = await this.iamClient.send(createCommand);

      if (!createResponse.AccessKey) {
        throw new Error('Failed to create new access key');
      }

      const newKey = {
        accessKeyId: createResponse.AccessKey.AccessKeyId!,
        secretAccessKey: createResponse.AccessKey.SecretAccessKey!,
        status: createResponse.AccessKey.Status!,
      };

      logger.info('New AWS IAM key created', { userName, accessKeyId: newKey.accessKeyId });

      // Step 2: Delete old access key if provided
      if (oldAccessKeyId) {
        try {
          const deleteCommand = new DeleteAccessKeyCommand({
            UserName: userName,
            AccessKeyId: oldAccessKeyId,
          });
          await this.iamClient.send(deleteCommand);
          logger.info('Old AWS IAM key deleted', { userName, oldAccessKeyId });
        } catch (deleteError) {
          logger.warn('Failed to delete old key, but new key created successfully', {
            userName,
            oldAccessKeyId,
            error: deleteError,
          });
        }
      }

      return newKey;
    } catch (error) {
      logger.error('AWS IAM key rotation failed', { userName, error });
      throw new Error(`Failed to rotate AWS credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all access keys for a user
   */
  async listAccessKeys(userName: string): Promise<Array<{ accessKeyId: string; status: string; createDate: Date }>> {
    try {
      const command = new ListAccessKeysCommand({ UserName: userName });
      const response = await this.iamClient.send(command);

      return (response.AccessKeyMetadata || []).map(key => ({
        accessKeyId: key.AccessKeyId!,
        status: key.Status!,
        createDate: key.CreateDate!,
      }));
    } catch (error) {
      logger.error('Failed to list AWS access keys', { userName, error });
      throw error;
    }
  }

  /**
   * Validate AWS credentials are configured
   */
  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
}

export const awsCredentialsService = new AWSCredentialsService();
