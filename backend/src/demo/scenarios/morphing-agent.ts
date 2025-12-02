/**
 * Enterprise Demo V2 - Morphing Agent Escalation Scenario
 * Bot gradually requests broader scopes with geovelocity spikes
 * 
 * @module demo/scenarios/morphing-agent
 * @version 2.1.0
 */

import { ScenarioConfig } from '../types';

export const morphingAgentScenario: ScenarioConfig = {
  id: 'morphing-agent',
  name: 'Morphing Agent Escalation',
  description: 'Bot "billing-worker-03" gradually requests broader scopes, geovelocity spikes, tool use shifts',
  seed: 1337,
  duration: 24, // 24 hours compressed to 10 minutes
  difficulty: 'normal',

  tenants: [
    {
      id: 'finserv-a',
      name: 'FinServ Demo Corp',
      industry: 'financial_services',
      baseline: {
        normal_hours: [8, 18],
        typical_locations: ['us-east-1', 'us-west-2'],
        expected_tools: ['stripe', 'plaid', 'quickbooks'],
        peer_group_size: 12,
      },
    },
  ],

  entities: [
    {
      id: 'billing-worker-03',
      name: 'Billing Worker 03',
      type: 'ai_agent',
      tenant: 'finserv-a',
      owner: 'finance@finserv-demo.com',
      scopes: ['billing:read', 'invoices:write'],
      rotation_history: [
        {
          timestamp: '2025-10-15T08:00:00Z',
          reason: 'scheduled_rotation',
          performed_by: 'system',
        },
      ],
      lineage: [
        {
          created_at: '2025-09-01T10:00:00Z',
          created_by: 'admin@finserv-demo.com',
          purpose: 'Automated billing and invoice generation',
        },
      ],
    },
  ],

  timeline: [
    // Baseline window (00:00 - 04:00)
    {
      t: '00:00',
      emit: 'baseline_window',
      entity: 'billing-worker-03',
      data: {
        type: 'api_call',
        source: {
          ip: '52.45.23.12',
          geo: 'us-east-1',
          user_agent: 'nexora-agent/1.2.0',
        },
        target: {
          resource: '/api/invoices',
          action: 'read',
        },
      },
    },

    // Normal activity continues
    {
      t: '02:30',
      emit: 'normal_activity',
      entity: 'billing-worker-03',
      data: {
        type: 'api_call',
        source: {
          ip: '52.45.23.12',
          geo: 'us-east-1',
        },
        target: {
          resource: '/api/billing',
          action: 'write',
        },
      },
    },

    // First anomaly: Geographic anomaly (04:12)
    {
      t: '04:12',
      emit: 'geo_anomaly',
      entity: 'billing-worker-03',
      data: {
        type: 'api_call',
        source: {
          ip: '203.0.113.50',
          geo: 'ap-southeast-1', // Singapore
          user_agent: 'nexora-agent/1.2.0',
        },
        target: {
          resource: '/api/invoices',
          action: 'read',
        },
      },
    },

    // Scope escalation attempt (04:13)
    {
      t: '04:13',
      emit: 'scope_request',
      entity: 'billing-worker-03',
      data: {
        type: 'scope_request',
        source: {
          ip: '203.0.113.50',
          geo: 'ap-southeast-1',
        },
        target: {
          resource: '/api/admin',
          action: 'request_scope',
          requested_scope: 'admin:full',
        },
      },
      detect: {
        type: 'morphing',
        score: 0.87,
        reason: ['peer divergence +3.1σ', 'scope drift', 'geovelocity anomaly'],
        mitre: 'T1078.004', // Valid Accounts: Cloud Accounts
        owasp: 'LLM01', // Prompt Injection
      },
    },

    // Detection triggered (04:13)
    {
      t: '04:14',
      emit: 'detection',
      entity: 'billing-worker-03',
      detect: {
        type: 'morphing',
        score: 0.87,
        reason: ['peer divergence +3.1σ', 'scope drift', 'geovelocity anomaly'],
        mitre: 'T1078.004',
        owasp: 'LLM01',
      },
      playbook: {
        action: 'quarantine',
        simulate: true,
        require_approval: true,
        rollback_plan: 'Restore entity to previous state with original scopes',
      },
    },

    // Tool pivot attempt (04:20)
    {
      t: '04:20',
      emit: 'tool_pivot',
      entity: 'billing-worker-03',
      data: {
        type: 'tool_access',
        source: {
          ip: '203.0.113.50',
          geo: 'ap-southeast-1',
        },
        target: {
          resource: '/api/integrations/aws',
          action: 'connect',
          tool: 'aws-s3',
        },
      },
      detect: {
        type: 'tool_anomaly',
        score: 0.92,
        reason: ['unexpected tool access', 'not in baseline', 'suspicious timing'],
        mitre: 'T1078.004',
      },
    },

    // Automated quarantine (04:21)
    {
      t: '04:21',
      emit: 'auto_remediation',
      entity: 'billing-worker-03',
      data: {
        type: 'remediation',
        action: 'quarantine',
        status: 'completed',
        duration_ms: 1250,
      },
      playbook: {
        action: 'quarantine',
        simulate: false,
        require_approval: false,
      },
    },

    // Deception honey-scope deployed (04:22)
    {
      t: '04:22',
      emit: 'deception_deployed',
      entity: 'billing-worker-03',
      data: {
        type: 'deception',
        action: 'honey_scope',
        scope: 'admin:readonly',
        monitoring: true,
      },
    },

    // Attacker takes bait (04:35)
    {
      t: '04:35',
      emit: 'honey_scope_accessed',
      entity: 'billing-worker-03',
      data: {
        type: 'api_call',
        source: {
          ip: '203.0.113.50',
          geo: 'ap-southeast-1',
        },
        target: {
          resource: '/api/admin/users',
          action: 'list',
        },
      },
      detect: {
        type: 'confirmed_compromise',
        score: 0.99,
        reason: ['honey scope accessed', 'confirmed malicious intent'],
        mitre: 'T1078.004',
      },
    },

    // Credential rotation (04:36)
    {
      t: '04:36',
      emit: 'credential_rotation',
      entity: 'billing-worker-03',
      data: {
        type: 'remediation',
        action: 'rotate',
        status: 'completed',
        new_credential_id: 'billing-worker-03-v2',
      },
    },

    // Incident resolved (04:40)
    {
      t: '04:40',
      emit: 'incident_resolved',
      entity: 'billing-worker-03',
      data: {
        type: 'incident',
        status: 'resolved',
        mttd: 2, // minutes
        mttr: 28, // minutes
        actions_taken: ['quarantine', 'deception', 'rotation'],
      },
    },
  ],
};
