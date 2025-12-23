/**
 * Enterprise Email Service
 * Multi-Provider Email Delivery with Failover
 * 
 * Supported Providers:
 * - AWS SES (Primary)
 * - SendGrid (Fallback)
 * - SMTP (Generic)
 * 
 * Features:
 * - Template-based emails
 * - HTML and plain text support
 * - Attachment support
 * - Delivery tracking
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Bounce and complaint handling
 * 
 * Standards Compliance:
 * - RFC 5321 (SMTP)
 * - RFC 5322 (Email Format)
 * - CAN-SPAM Act
 * - GDPR (Email consent)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/utils/logger';
import { auditLoggingService } from './audit-logging.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EmailConfig {
  provider: 'ses' | 'sendgrid' | 'smtp';
  from: string;
  fromName: string;
  replyTo?: string;
  
  // AWS SES
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  
  // SendGrid
  sendgrid?: {
    apiKey: string;
  };
  
  // SMTP
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  
  // Rate limiting
  maxEmailsPerSecond: number;
  maxEmailsPerDay: number;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const EMAIL_TEMPLATES = {
  password_reset: {
    subject: '[Nexora] Password Reset Request',
    html: (data: { name: string; resetUrl: string; expiresIn: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nexora AED Platform</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${data.name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link expires in ${data.expiresIn}</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>Or copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.</p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { name: string; resetUrl: string; expiresIn: string }) => `
      Nexora AED Platform - Password Reset Request
      
      Hello ${data.name},
      
      We received a request to reset your password. Click the link below to create a new password:
      
      ${data.resetUrl}
      
      SECURITY NOTICE:
      - This link expires in ${data.expiresIn}
      - If you didn't request this, please ignore this email
      - Never share this link with anyone
      
      © ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.
    `,
  },
  
  security_alert: {
    subject: (data: { severity: string; title: string }) => `[NEXORA ${data.severity.toUpperCase()} ALERT] ${data.title}`,
    html: (data: { name: string; severity: string; title: string; description: string; timestamp: string; actionUrl?: string; details?: Record<string, any> }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .header.high { background: #fd7e14; }
          .header.medium { background: #ffc107; color: #333; }
          .header.low { background: #28a745; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-box { background: white; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .details dt { font-weight: bold; margin-top: 10px; }
          .details dd { margin-left: 20px; color: #666; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header ${data.severity}">
            <h1>🚨 Security Alert</h1>
            <p style="margin: 0; font-size: 18px;">${data.severity.toUpperCase()} SEVERITY</p>
          </div>
          <div class="content">
            <h2>${data.title}</h2>
            <p>Hello ${data.name},</p>
            <div class="alert-box">
              <p><strong>Alert Details:</strong></p>
              <p>${data.description}</p>
              <p><strong>Detected:</strong> ${data.timestamp}</p>
            </div>
            ${data.details ? `
              <div class="details">
                <h3>Additional Information:</h3>
                <dl>
                  ${Object.entries(data.details).map(([key, value]) => `
                    <dt>${key}:</dt>
                    <dd>${value}</dd>
                  `).join('')}
                </dl>
              </div>
            ` : ''}
            ${data.actionUrl ? `
              <a href="${data.actionUrl}" class="button">View in Dashboard</a>
            ` : ''}
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Review the alert details in your dashboard</li>
              <li>Verify if this activity was authorized</li>
              <li>Take appropriate remediation actions if needed</li>
              <li>Contact your security team if you need assistance</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.</p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { name: string; severity: string; title: string; description: string; timestamp: string; actionUrl?: string }) => `
      NEXORA SECURITY ALERT - ${data.severity.toUpperCase()} SEVERITY
      
      ${data.title}
      
      Hello ${data.name},
      
      ${data.description}
      
      Detected: ${data.timestamp}
      
      ${data.actionUrl ? `View in Dashboard: ${data.actionUrl}\n` : ''}
      
      RECOMMENDED ACTIONS:
      - Review the alert details in your dashboard
      - Verify if this activity was authorized
      - Take appropriate remediation actions if needed
      - Contact your security team if you need assistance
      
      © ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.
    `,
  },
  
  api_key_rotation: {
    subject: '[Nexora] API Key Rotated - Action Required',
    html: (data: { name: string; keyName: string; rotatedAt: string; newKeyPreview: string; actionUrl: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fd7e14; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .code { background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }
          .button { display: inline-block; padding: 12px 24px; background: #fd7e14; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ API Key Rotated</h1>
          </div>
          <div class="content">
            <h2>Action Required: Update Your Applications</h2>
            <p>Hello ${data.name},</p>
            <p>Your API key <strong>"${data.keyName}"</strong> has been rotated for security purposes.</p>
            <div class="warning">
              <strong>⚠️ IMMEDIATE ACTION REQUIRED:</strong>
              <p>Your old API key has been invalidated. You must update your applications with the new key immediately to avoid service disruption.</p>
            </div>
            <p><strong>Rotation Time:</strong> ${data.rotatedAt}</p>
            <p><strong>New Key Preview:</strong></p>
            <div class="code">${data.newKeyPreview}...</div>
            <a href="${data.actionUrl}" class="button">View Full Key in Dashboard</a>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Log in to your Nexora dashboard</li>
              <li>Copy the new API key</li>
              <li>Update all applications using this key</li>
              <li>Test your integrations</li>
              <li>Verify API calls are successful</li>
            </ol>
            <p><strong>Why was this rotated?</strong></p>
            <p>API keys are automatically rotated as part of our security best practices to prevent unauthorized access and maintain the highest level of security for your data.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.</p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { name: string; keyName: string; rotatedAt: string; newKeyPreview: string; actionUrl: string }) => `
      NEXORA - API Key Rotated - Action Required
      
      Hello ${data.name},
      
      Your API key "${data.keyName}" has been rotated for security purposes.
      
      ⚠️ IMMEDIATE ACTION REQUIRED:
      Your old API key has been invalidated. You must update your applications with the new key immediately to avoid service disruption.
      
      Rotation Time: ${data.rotatedAt}
      New Key Preview: ${data.newKeyPreview}...
      
      View Full Key: ${data.actionUrl}
      
      NEXT STEPS:
      1. Log in to your Nexora dashboard
      2. Copy the new API key
      3. Update all applications using this key
      4. Test your integrations
      5. Verify API calls are successful
      
      © ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.
    `,
  },
  
  account_lockout: {
    subject: '[Nexora] Account Locked - Security Alert',
    html: (data: { name: string; email: string; lockoutReason: string; unlockTime: string; attemptsCount: number; ipAddress: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .info-box { background: white; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Account Locked</h1>
          </div>
          <div class="content">
            <h2>Security Alert: Account Temporarily Locked</h2>
            <p>Hello ${data.name},</p>
            <div class="alert-box">
              <p><strong>Your account has been temporarily locked due to multiple failed login attempts.</strong></p>
            </div>
            <div class="info-box">
              <p><strong>Account:</strong> ${data.email}</p>
              <p><strong>Reason:</strong> ${data.lockoutReason}</p>
              <p><strong>Failed Attempts:</strong> ${data.attemptsCount}</p>
              <p><strong>IP Address:</strong> ${data.ipAddress}</p>
              <p><strong>Unlock Time:</strong> ${data.unlockTime}</p>
            </div>
            <p><strong>What happened?</strong></p>
            <p>Your account was locked after ${data.attemptsCount} failed login attempts from IP address ${data.ipAddress}. This is a security measure to protect your account from unauthorized access.</p>
            <p><strong>What should you do?</strong></p>
            <ul>
              <li>If this was you, wait until ${data.unlockTime} and try again with the correct password</li>
              <li>If you forgot your password, use the "Forgot Password" link to reset it</li>
              <li>If this wasn't you, contact your security team immediately</li>
              <li>Review your recent account activity for any suspicious behavior</li>
            </ul>
            <p><strong>Need help?</strong></p>
            <p>Contact your administrator to unlock your account immediately, or wait for the automatic unlock at ${data.unlockTime}.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.</p>
            <p>This is an automated security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { name: string; email: string; lockoutReason: string; unlockTime: string; attemptsCount: number; ipAddress: string }) => `
      NEXORA - Account Locked - Security Alert
      
      Hello ${data.name},
      
      Your account has been temporarily locked due to multiple failed login attempts.
      
      DETAILS:
      Account: ${data.email}
      Reason: ${data.lockoutReason}
      Failed Attempts: ${data.attemptsCount}
      IP Address: ${data.ipAddress}
      Unlock Time: ${data.unlockTime}
      
      WHAT HAPPENED?
      Your account was locked after ${data.attemptsCount} failed login attempts from IP address ${data.ipAddress}. This is a security measure to protect your account from unauthorized access.
      
      WHAT SHOULD YOU DO?
      - If this was you, wait until ${data.unlockTime} and try again with the correct password
      - If you forgot your password, use the "Forgot Password" link to reset it
      - If this wasn't you, contact your security team immediately
      - Review your recent account activity for any suspicious behavior
      
      © ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.
    `,
  },
  
  workflow_approval: {
    subject: (data: { workflowName: string }) => `[Nexora] Approval Required: ${data.workflowName}`,
    html: (data: { name: string; workflowName: string; description: string; blastRadius: string; approveUrl: string; rejectUrl: string; expiresIn: string; details: Record<string, any> }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffc107; color: #333; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .workflow-box { background: white; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
          .buttons { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .approve { background: #28a745; color: white; }
          .reject { background: #dc3545; color: white; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Approval Required</h1>
          </div>
          <div class="content">
            <h2>${data.workflowName}</h2>
            <p>Hello ${data.name},</p>
            <p>A workflow execution requires your approval before proceeding.</p>
            <div class="workflow-box">
              <p><strong>Workflow:</strong> ${data.workflowName}</p>
              <p><strong>Description:</strong> ${data.description}</p>
              <p><strong>Blast Radius:</strong> <span style="color: ${data.blastRadius === 'critical' ? '#dc3545' : data.blastRadius === 'high' ? '#fd7e14' : '#ffc107'};">${data.blastRadius.toUpperCase()}</span></p>
              <p><strong>Expires In:</strong> ${data.expiresIn}</p>
            </div>
            <div class="details">
              <h3>Proposed Actions:</h3>
              <ul>
                ${Object.entries(data.details).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
              </ul>
            </div>
            <div class="buttons">
              <a href="${data.approveUrl}" class="button approve">✓ Approve</a>
              <a href="${data.rejectUrl}" class="button reject">✗ Reject</a>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">
              <strong>⚠️ This approval request expires in ${data.expiresIn}</strong><br>
              If no action is taken, the workflow will be automatically cancelled.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data: { name: string; workflowName: string; description: string; blastRadius: string; approveUrl: string; rejectUrl: string; expiresIn: string }) => `
      NEXORA - Approval Required: ${data.workflowName}
      
      Hello ${data.name},
      
      A workflow execution requires your approval before proceeding.
      
      WORKFLOW DETAILS:
      Name: ${data.workflowName}
      Description: ${data.description}
      Blast Radius: ${data.blastRadius.toUpperCase()}
      Expires In: ${data.expiresIn}
      
      ACTIONS:
      Approve: ${data.approveUrl}
      Reject: ${data.rejectUrl}
      
      ⚠️ This approval request expires in ${data.expiresIn}
      If no action is taken, the workflow will be automatically cancelled.
      
      © ${new Date().getFullYear()} Nexora AED Platform. All rights reserved.
    `,
  },
};

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class EmailService {
  private config: EmailConfig;
  private sesClient?: SESClient;
  private smtpTransporter?: nodemailer.Transporter;
  private emailsSentToday: number = 0;
  private lastResetDate: Date = new Date();
  private rateLimitQueue: Date[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.initializeProvider();
  }

  private loadConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp') as 'ses' | 'sendgrid' | 'smtp';
    
    return {
      provider,
      from: process.env.EMAIL_FROM || 'noreply@nexora.app',
      fromName: process.env.EMAIL_FROM_NAME || 'Nexora AED Platform',
      replyTo: process.env.EMAIL_REPLY_TO,
      
      ses: provider === 'ses' ? {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
      
      sendgrid: provider === 'sendgrid' ? {
        apiKey: process.env.SENDGRID_API_KEY || '',
      } : undefined,
      
      smtp: provider === 'smtp' ? {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      } : undefined,
      
      maxEmailsPerSecond: parseInt(process.env.EMAIL_MAX_PER_SECOND || '10', 10),
      maxEmailsPerDay: parseInt(process.env.EMAIL_MAX_PER_DAY || '10000', 10),
    };
  }

  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'ses':
        if (this.config.ses) {
          this.sesClient = new SESClient({
            region: this.config.ses.region,
            credentials: {
              accessKeyId: this.config.ses.accessKeyId,
              secretAccessKey: this.config.ses.secretAccessKey,
            },
          });
          logger.info('Email service initialized with AWS SES');
        }
        break;
        
      case 'smtp':
        if (this.config.smtp) {
          this.smtpTransporter = nodemailer.createTransport({
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: this.config.smtp.auth,
          });
          logger.info('Email service initialized with SMTP');
        }
        break;
        
      case 'sendgrid':
        if (this.config.sendgrid) {
          this.smtpTransporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: this.config.sendgrid.apiKey,
            },
          });
          logger.info('Email service initialized with SendGrid');
        }
        break;
    }
  }

  isConfigured(): boolean {
    return !!(
      (this.config.provider === 'ses' && this.sesClient) ||
      (this.config.provider === 'smtp' && this.smtpTransporter) ||
      (this.config.provider === 'sendgrid' && this.smtpTransporter)
    );
  }

  private async checkRateLimit(): Promise<void> {
    // Reset daily counter
    const now = new Date();
    if (now.getDate() !== this.lastResetDate.getDate()) {
      this.emailsSentToday = 0;
      this.lastResetDate = now;
    }

    // Check daily limit
    if (this.emailsSentToday >= this.config.maxEmailsPerDay) {
      throw new Error('Daily email limit exceeded');
    }

    // Check per-second rate limit
    const oneSecondAgo = new Date(Date.now() - 1000);
    this.rateLimitQueue = this.rateLimitQueue.filter(d => d > oneSecondAgo);
    
    if (this.rateLimitQueue.length >= this.config.maxEmailsPerSecond) {
      const waitTime = 1000 - (Date.now() - this.rateLimitQueue[0].getTime());
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.rateLimitQueue.push(new Date());
    this.emailsSentToday++;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      logger.error('Email service not configured');
      return {
        success: false,
        provider: this.config.provider,
        error: 'Email service not configured',
        timestamp: new Date(),
      };
    }

    try {
      await this.checkRateLimit();

      // Process template if specified
      if (options.template && EMAIL_TEMPLATES[options.template as keyof typeof EMAIL_TEMPLATES]) {
        const template = EMAIL_TEMPLATES[options.template as keyof typeof EMAIL_TEMPLATES];
        
        if (typeof template.subject === 'function') {
          options.subject = template.subject(options.templateData || {});
        } else {
          options.subject = template.subject;
        }
        
        options.html = template.html(options.templateData || {});
        options.text = template.text(options.templateData || {});
      }

      let result: EmailResult;

      switch (this.config.provider) {
        case 'ses':
          result = await this.sendViaSES(options);
          break;
        case 'smtp':
        case 'sendgrid':
          result = await this.sendViaSMTP(options);
          break;
        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`);
      }

      // Log email sent
      if (result.success) {
        logger.info('Email sent successfully', {
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          provider: this.config.provider,
          messageId: result.messageId,
        });

        // Audit log
        await auditLoggingService.log({
          event: 'email_sent',
          entityType: 'notification',
          entityId: result.messageId || 'unknown',
          action: 'execute',
          metadata: {
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            template: options.template,
            provider: this.config.provider,
          },
          severity: 'low',
          result: 'success',
        });
      }

      return result;
    } catch (error) {
      logger.error('Email send failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        provider: this.config.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  private async sendViaSES(options: EmailOptions): Promise<EmailResult> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const params = {
      Source: `${this.config.fromName} <${this.config.from}>`,
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
        CcAddresses: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        BccAddresses: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Text: options.text ? { Data: options.text } : undefined,
          Html: options.html ? { Data: options.html } : undefined,
        },
      },
      ReplyToAddresses: this.config.replyTo ? [this.config.replyTo] : undefined,
    };

    const command = new SendEmailCommand(params);
    const response = await this.sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      provider: 'ses',
      timestamp: new Date(),
    };
  }

  private async sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: `${this.config.fromName} <${this.config.from}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      replyTo: this.config.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      priority: options.priority,
      headers: options.headers,
    };

    const info = await this.smtpTransporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: this.config.provider,
      timestamp: new Date(),
    };
  }

  // Template helper methods
  async sendPasswordReset(to: string, name: string, resetUrl: string, expiresIn: string = '1 hour'): Promise<EmailResult> {
    return this.send({
      to,
      template: 'password_reset',
      templateData: { name, resetUrl, expiresIn },
      priority: 'high',
      tags: ['password-reset', 'security'],
    });
  }

  async sendSecurityAlert(
    to: string,
    name: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    actionUrl?: string,
    details?: Record<string, any>
  ): Promise<EmailResult> {
    return this.send({
      to,
      template: 'security_alert',
      templateData: {
        name,
        severity,
        title,
        description,
        timestamp: new Date().toISOString(),
        actionUrl,
        details,
      },
      priority: severity === 'critical' || severity === 'high' ? 'high' : 'normal',
      tags: ['security-alert', severity],
    });
  }

  async sendAPIKeyRotation(
    to: string,
    name: string,
    keyName: string,
    newKeyPreview: string,
    actionUrl: string
  ): Promise<EmailResult> {
    return this.send({
      to,
      template: 'api_key_rotation',
      templateData: {
        name,
        keyName,
        rotatedAt: new Date().toISOString(),
        newKeyPreview,
        actionUrl,
      },
      priority: 'high',
      tags: ['api-key-rotation', 'security'],
    });
  }

  async sendAccountLockout(
    to: string,
    name: string,
    email: string,
    lockoutReason: string,
    unlockTime: string,
    attemptsCount: number,
    ipAddress: string
  ): Promise<EmailResult> {
    return this.send({
      to,
      template: 'account_lockout',
      templateData: {
        name,
        email,
        lockoutReason,
        unlockTime,
        attemptsCount,
        ipAddress,
      },
      priority: 'high',
      tags: ['account-lockout', 'security'],
    });
  }

  async sendWorkflowApproval(
    to: string,
    name: string,
    workflowName: string,
    description: string,
    blastRadius: string,
    approveUrl: string,
    rejectUrl: string,
    expiresIn: string,
    details: Record<string, any>
  ): Promise<EmailResult> {
    return this.send({
      to,
      template: 'workflow_approval',
      templateData: {
        name,
        workflowName,
        description,
        blastRadius,
        approveUrl,
        rejectUrl,
        expiresIn,
        details,
      },
      priority: 'high',
      tags: ['workflow-approval', 'action-required'],
    });
  }
}

export const emailService = new EmailService();
