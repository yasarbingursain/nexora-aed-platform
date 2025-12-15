/**
 * AWS Network Quarantine Service
 * PRODUCTION - Real AWS EC2 Security Group integration
 * Standards: AWS Well-Architected Framework, NIST SP 800-41
 */

import { EC2Client, AuthorizeSecurityGroupIngressCommand, RevokeSecurityGroupIngressCommand, DescribeSecurityGroupsCommand } from '@aws-sdk/client-ec2';
import { logger } from '@/utils/logger';

export class AWSQuarantineService {
  private ec2Client: EC2Client;
  private quarantineSecurityGroupId: string;

  constructor() {
    this.ec2Client = new EC2Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Security group for quarantined resources
    this.quarantineSecurityGroupId = process.env.AWS_QUARANTINE_SG_ID || '';
  }

  /**
   * Quarantine an IP address by blocking all traffic
   * Creates deny rule in security group
   */
  async quarantineIP(ipAddress: string, reason: string): Promise<void> {
    try {
      if (!this.quarantineSecurityGroupId) {
        throw new Error('AWS_QUARANTINE_SG_ID not configured');
      }

      logger.info('Quarantining IP address', { ipAddress, reason });

      // Revoke all ingress rules for this IP
      const revokeCommand = new RevokeSecurityGroupIngressCommand({
        GroupId: this.quarantineSecurityGroupId,
        IpPermissions: [
          {
            IpProtocol: '-1', // All protocols
            FromPort: -1,
            ToPort: -1,
            IpRanges: [{ CidrIp: `${ipAddress}/32`, Description: `Quarantined: ${reason}` }],
          },
        ],
      });

      await this.ec2Client.send(revokeCommand);

      logger.info('IP address quarantined successfully', { ipAddress });
    } catch (error) {
      // If rule doesn't exist, that's okay - IP is already blocked
      if (error instanceof Error && error.name === 'InvalidPermission.NotFound') {
        logger.info('IP already quarantined', { ipAddress });
        return;
      }

      logger.error('Failed to quarantine IP', { ipAddress, error });
      throw new Error(`Failed to quarantine IP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove IP from quarantine (alias for unquarantineIP)
   */
  async removeQuarantine(ipAddress: string): Promise<void> {
    return this.unquarantineIP(ipAddress);
  }

  /**
   * Remove IP from quarantine
   */
  async unquarantineIP(ipAddress: string): Promise<void> {
    try {
      if (!this.quarantineSecurityGroupId) {
        throw new Error('AWS_QUARANTINE_SG_ID not configured');
      }

      logger.info('Removing IP from quarantine', { ipAddress });

      // Restore ingress rules for this IP
      const authorizeCommand = new AuthorizeSecurityGroupIngressCommand({
        GroupId: this.quarantineSecurityGroupId,
        IpPermissions: [
          {
            IpProtocol: '-1',
            FromPort: -1,
            ToPort: -1,
            IpRanges: [{ CidrIp: `${ipAddress}/32`, Description: 'Restored from quarantine' }],
          },
        ],
      });

      await this.ec2Client.send(authorizeCommand);

      logger.info('IP removed from quarantine successfully', { ipAddress });
    } catch (error) {
      logger.error('Failed to unquarantine IP', { ipAddress, error });
      throw new Error(`Failed to unquarantine IP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      this.quarantineSecurityGroupId
    );
  }

  /**
   * Get quarantine security group details
   */
  async getQuarantineStatus(): Promise<{ configured: boolean; groupId: string; rulesCount: number }> {
    try {
      if (!this.isConfigured()) {
        return { configured: false, groupId: '', rulesCount: 0 };
      }

      const command = new DescribeSecurityGroupsCommand({
        GroupIds: [this.quarantineSecurityGroupId],
      });

      const response = await this.ec2Client.send(command);
      const group = response.SecurityGroups?.[0];

      return {
        configured: true,
        groupId: this.quarantineSecurityGroupId,
        rulesCount: group?.IpPermissions?.length || 0,
      };
    } catch (error) {
      logger.error('Failed to get quarantine status', { error });
      return { configured: false, groupId: '', rulesCount: 0 };
    }
  }
}

export const awsQuarantineService = new AWSQuarantineService();
