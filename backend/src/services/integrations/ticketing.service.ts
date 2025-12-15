/**
 * Ticketing Integrations Service
 * Enterprise-grade integrations with ServiceNow, Jira, and notification systems
 * 
 * Standards Compliance:
 * - ITIL v4 (Incident Management)
 * - NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide)
 * - ISO/IEC 27035 (Information Security Incident Management)
 * 
 * @author Nexora Security Team
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

interface TicketConfig {
  serviceNow: {
    instanceUrl: string;
    username: string;
    password: string;
    enabled: boolean;
  };
  jira: {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
    enabled: boolean;
  };
  slack: {
    webhookUrl: string;
    channel: string;
    enabled: boolean;
  };
}

interface TicketInput {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  assignee?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

interface TicketResult {
  success: boolean;
  ticketId?: string;
  ticketUrl?: string;
  system: 'servicenow' | 'jira' | 'slack';
  error?: string;
  timestamp: Date;
}

interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
  accessory?: unknown;
}

interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields?: { title: string; value: string; short: boolean }[];
  footer?: string;
  ts?: number;
}

// ============================================================================
// SERVICENOW INTEGRATION
// ============================================================================

export class ServiceNowService {
  private config: TicketConfig['serviceNow'];

  constructor() {
    this.config = {
      instanceUrl: process.env.SERVICENOW_INSTANCE_URL || '',
      username: process.env.SERVICENOW_USERNAME || '',
      password: process.env.SERVICENOW_PASSWORD || '',
      enabled: process.env.SERVICENOW_ENABLED === 'true',
    };
  }

  isConfigured(): boolean {
    return this.config.enabled && !!(this.config.instanceUrl && this.config.username && this.config.password);
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createIncident(input: TicketInput): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'servicenow', error: 'ServiceNow not configured', timestamp: new Date() };
    }

    try {
      const urgencyMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
      const impactMap: Record<string, number> = { critical: 1, high: 2, medium: 2, low: 3 };

      const payload = {
        short_description: input.title,
        description: input.description,
        urgency: urgencyMap[input.priority] || 3,
        impact: impactMap[input.priority] || 2,
        category: input.category,
        assignment_group: input.assignee,
        caller_id: 'nexora-security',
        u_source: 'Nexora AED Platform',
        work_notes: `[Nexora] Auto-generated incident\nMetadata: ${JSON.stringify(input.metadata || {})}`,
      };

      const response = await fetch(`${this.config.instanceUrl}/api/now/table/incident`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `ServiceNow API error: ${response.status}`);
      }

      const result = await response.json() as { result: { sys_id: string; number: string } };

      logger.info('ServiceNow incident created', {
        incidentNumber: result.result.number,
        sysId: result.result.sys_id,
        title: input.title,
      });

      return {
        success: true,
        ticketId: result.result.number,
        ticketUrl: `${this.config.instanceUrl}/nav_to.do?uri=incident.do?sys_id=${result.result.sys_id}`,
        system: 'servicenow',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('ServiceNow incident creation failed', { error: error instanceof Error ? error.message : error });
      return { success: false, system: 'servicenow', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async updateIncident(incidentId: string, updates: Partial<TicketInput>): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'servicenow', error: 'ServiceNow not configured', timestamp: new Date() };
    }

    try {
      const payload: Record<string, unknown> = {};
      if (updates.title) payload.short_description = updates.title;
      if (updates.description) payload.description = updates.description;
      if (updates.priority) {
        const urgencyMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
        payload.urgency = urgencyMap[updates.priority];
      }

      const response = await fetch(`${this.config.instanceUrl}/api/now/table/incident/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`ServiceNow update failed: ${response.status}`);
      }

      logger.info('ServiceNow incident updated', { incidentId });
      return { success: true, ticketId: incidentId, system: 'servicenow', timestamp: new Date() };
    } catch (error) {
      logger.error('ServiceNow incident update failed', { incidentId, error: error instanceof Error ? error.message : error });
      return { success: false, system: 'servicenow', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async closeIncident(incidentId: string, resolution: string): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'servicenow', error: 'ServiceNow not configured', timestamp: new Date() };
    }

    try {
      const payload = {
        state: 6, // Resolved
        close_code: 'Solved (Permanently)',
        close_notes: resolution,
      };

      const response = await fetch(`${this.config.instanceUrl}/api/now/table/incident/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`ServiceNow close failed: ${response.status}`);
      }

      logger.info('ServiceNow incident closed', { incidentId, resolution });
      return { success: true, ticketId: incidentId, system: 'servicenow', timestamp: new Date() };
    } catch (error) {
      logger.error('ServiceNow incident close failed', { incidentId, error: error instanceof Error ? error.message : error });
      return { success: false, system: 'servicenow', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }
}

// ============================================================================
// JIRA INTEGRATION
// ============================================================================

export class JiraService {
  private config: TicketConfig['jira'];

  constructor() {
    this.config = {
      baseUrl: process.env.JIRA_BASE_URL || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      projectKey: process.env.JIRA_PROJECT_KEY || 'SEC',
      enabled: process.env.JIRA_ENABLED === 'true',
    };
  }

  isConfigured(): boolean {
    return this.config.enabled && !!(this.config.baseUrl && this.config.email && this.config.apiToken);
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createIssue(input: TicketInput): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'jira', error: 'Jira not configured', timestamp: new Date() };
    }

    try {
      const priorityMap: Record<string, string> = { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low' };

      const payload = {
        fields: {
          project: { key: this.config.projectKey },
          summary: input.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: input.description }],
              },
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Metadata: ', marks: [{ type: 'strong' }] },
                  { type: 'text', text: JSON.stringify(input.metadata || {}) },
                ],
              },
            ],
          },
          issuetype: { name: 'Bug' },
          priority: { name: priorityMap[input.priority] || 'Medium' },
          labels: ['nexora-security', 'auto-generated', ...(input.labels || [])],
        },
      };

      if (input.assignee) {
        (payload.fields as Record<string, unknown>).assignee = { accountId: input.assignee };
      }

      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json() as { errorMessages?: string[] };
        throw new Error(errorData.errorMessages?.join(', ') || `Jira API error: ${response.status}`);
      }

      const result = await response.json() as { id: string; key: string; self: string };

      logger.info('Jira issue created', { issueKey: result.key, title: input.title });

      return {
        success: true,
        ticketId: result.key,
        ticketUrl: `${this.config.baseUrl}/browse/${result.key}`,
        system: 'jira',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Jira issue creation failed', { error: error instanceof Error ? error.message : error });
      return { success: false, system: 'jira', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async transitionIssue(issueKey: string, transitionName: string): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'jira', error: 'Jira not configured', timestamp: new Date() };
    }

    try {
      // Get available transitions
      const transitionsResponse = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        headers: { 'Authorization': this.getAuthHeader(), 'Accept': 'application/json' },
      });

      if (!transitionsResponse.ok) {
        throw new Error(`Failed to get transitions: ${transitionsResponse.status}`);
      }

      const transitionsData = await transitionsResponse.json() as { transitions: { id: string; name: string }[] };
      const transition = transitionsData.transitions.find(t => t.name.toLowerCase() === transitionName.toLowerCase());

      if (!transition) {
        throw new Error(`Transition '${transitionName}' not found`);
      }

      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transition: { id: transition.id } }),
      });

      if (!response.ok) {
        throw new Error(`Jira transition failed: ${response.status}`);
      }

      logger.info('Jira issue transitioned', { issueKey, transitionName });
      return { success: true, ticketId: issueKey, system: 'jira', timestamp: new Date() };
    } catch (error) {
      logger.error('Jira issue transition failed', { issueKey, error: error instanceof Error ? error.message : error });
      return { success: false, system: 'jira', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async addComment(issueKey: string, comment: string): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'jira', error: 'Jira not configured', timestamp: new Date() };
    }

    try {
      const payload = {
        body: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
        },
      };

      const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Jira comment failed: ${response.status}`);
      }

      logger.info('Jira comment added', { issueKey });
      return { success: true, ticketId: issueKey, system: 'jira', timestamp: new Date() };
    } catch (error) {
      logger.error('Jira comment failed', { issueKey, error: error instanceof Error ? error.message : error });
      return { success: false, system: 'jira', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }
}

// ============================================================================
// SLACK INTEGRATION
// ============================================================================

export class SlackService {
  private config: TicketConfig['slack'];

  constructor() {
    this.config = {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: process.env.SLACK_CHANNEL || '#security-alerts',
      enabled: process.env.SLACK_ENABLED === 'true',
    };
  }

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.webhookUrl;
  }

  async sendAlert(input: TicketInput): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'slack', error: 'Slack not configured', timestamp: new Date() };
    }

    try {
      const colorMap: Record<string, string> = { critical: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#28a745' };
      const emojiMap: Record<string, string> = { critical: ':rotating_light:', high: ':warning:', medium: ':large_yellow_circle:', low: ':information_source:' };

      const message: SlackMessage = {
        channel: this.config.channel,
        text: `${emojiMap[input.priority]} Security Alert: ${input.title}`,
        attachments: [
          {
            color: colorMap[input.priority] || '#6c757d',
            title: input.title,
            text: input.description,
            fields: [
              { title: 'Priority', value: input.priority.toUpperCase(), short: true },
              { title: 'Category', value: input.category, short: true },
              ...(input.assignee ? [{ title: 'Assignee', value: input.assignee, short: true }] : []),
            ],
            footer: 'Nexora AED Platform',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }

      logger.info('Slack alert sent', { title: input.title, priority: input.priority });
      return { success: true, system: 'slack', timestamp: new Date() };
    } catch (error) {
      logger.error('Slack alert failed', { error: error instanceof Error ? error.message : error });
      return { success: false, system: 'slack', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }

  async sendMessage(text: string, blocks?: SlackBlock[]): Promise<TicketResult> {
    if (!this.isConfigured()) {
      return { success: false, system: 'slack', error: 'Slack not configured', timestamp: new Date() };
    }

    try {
      const message: SlackMessage = { channel: this.config.channel, text, blocks };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack message failed: ${response.status}`);
      }

      logger.info('Slack message sent');
      return { success: true, system: 'slack', timestamp: new Date() };
    } catch (error) {
      logger.error('Slack message failed', { error: error instanceof Error ? error.message : error });
      return { success: false, system: 'slack', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  }
}

// ============================================================================
// UNIFIED TICKETING SERVICE
// ============================================================================

export class TicketingService {
  private serviceNow: ServiceNowService;
  private jira: JiraService;
  private slack: SlackService;

  constructor() {
    this.serviceNow = new ServiceNowService();
    this.jira = new JiraService();
    this.slack = new SlackService();
  }

  async createTicket(input: TicketInput, systems?: ('servicenow' | 'jira')[]): Promise<TicketResult[]> {
    const results: TicketResult[] = [];
    const targetSystems = systems || ['servicenow', 'jira'];

    for (const system of targetSystems) {
      if (system === 'servicenow' && this.serviceNow.isConfigured()) {
        results.push(await this.serviceNow.createIncident(input));
      } else if (system === 'jira' && this.jira.isConfigured()) {
        results.push(await this.jira.createIssue(input));
      }
    }

    return results;
  }

  async notifySlack(input: TicketInput): Promise<TicketResult> {
    return this.slack.sendAlert(input);
  }

  async createAndNotify(input: TicketInput): Promise<{ tickets: TicketResult[]; notification: TicketResult }> {
    const [tickets, notification] = await Promise.all([
      this.createTicket(input),
      this.notifySlack(input),
    ]);

    return { tickets, notification };
  }

  getServiceNow(): ServiceNowService {
    return this.serviceNow;
  }

  getJira(): JiraService {
    return this.jira;
  }

  getSlack(): SlackService {
    return this.slack;
  }
}

export const ticketingService = new TicketingService();
export const serviceNowService = new ServiceNowService();
export const jiraService = new JiraService();
export const slackService = new SlackService();
