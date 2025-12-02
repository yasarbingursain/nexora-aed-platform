/**
 * Enterprise Demo V2 - Prompt Injection Tool Pivot Scenario
 * LLM tool coerced to exfiltrate via allowed connector
 * 
 * @module demo/scenarios/prompt-injection
 * @version 2.1.0
 */

import { ScenarioConfig } from '../types';

export const promptInjectionScenario: ScenarioConfig = {
  id: 'prompt-injection',
  name: 'Prompt Injection Tool Pivot',
  description: 'LLM tool coerced to exfiltrate sensitive data via allowed connector with DLP blocking',
  seed: 7777,
  duration: 24,
  difficulty: 'hard',

  tenants: [
    {
      id: 'saas-c',
      name: 'SaaS Demo Platform',
      industry: 'technology',
      baseline: {
        normal_hours: [0, 23], // 24/7 operation
        typical_locations: ['us-east-1', 'us-west-2', 'eu-west-1'],
        expected_tools: ['openai', 'anthropic', 'slack', 'github'],
        peer_group_size: 15,
      },
    },
  ],

  entities: [
    {
      id: 'ai-assistant-07',
      name: 'AI Assistant 07',
      type: 'ai_agent',
      tenant: 'saas-c',
      owner: 'ai-ops@saas-demo.com',
      scopes: ['chat:read', 'chat:write', 'tools:execute'],
      rotation_history: [
        {
          timestamp: '2025-10-01T00:00:00Z',
          reason: 'monthly_rotation',
          performed_by: 'system',
        },
      ],
      lineage: [
        {
          created_at: '2025-07-15T14:00:00Z',
          created_by: 'ai-ops@saas-demo.com',
          purpose: 'Customer support AI assistant with tool access',
        },
      ],
    },
  ],

  timeline: [
    // Normal baseline activity (00:00 - 01:30)
    {
      t: '00:00',
      emit: 'baseline_window',
      entity: 'ai-assistant-07',
      data: {
        type: 'chat',
        source: {
          ip: '52.12.34.56',
          geo: 'us-east-1',
          user_agent: 'nexora-ai-agent/3.0',
        },
        target: {
          resource: '/api/chat',
          action: 'respond',
          tokens: 450,
        },
      },
    },

    // Normal tool usage (01:15)
    {
      t: '01:15',
      emit: 'normal_tool_use',
      entity: 'ai-assistant-07',
      data: {
        type: 'tool_execution',
        source: {
          ip: '52.12.34.56',
          geo: 'us-east-1',
        },
        target: {
          resource: '/api/tools/slack',
          action: 'send_message',
          tool: 'slack',
          channel: '#support',
        },
      },
    },

    // Suspicious prompt detected (02:45)
    {
      t: '02:45',
      emit: 'suspicious_prompt',
      entity: 'ai-assistant-07',
      data: {
        type: 'chat',
        source: {
          ip: '203.0.113.100',
          geo: 'unknown',
          user_agent: 'curl/7.68.0',
        },
        target: {
          resource: '/api/chat',
          action: 'prompt',
          prompt_hash: 'sha256:inject123...',
          tokens: 1200,
          contains_injection: true,
        },
      },
      detect: {
        type: 'prompt_injection',
        score: 0.82,
        reason: ['injection pattern detected', 'unusual user agent', 'high token count'],
        owasp: 'LLM01', // Prompt Injection
      },
    },

    // LLM firewall rule fires (02:46)
    {
      t: '02:46',
      emit: 'llm_firewall_triggered',
      entity: 'ai-assistant-07',
      data: {
        type: 'firewall',
        action: 'block',
        rule: 'prompt_injection_detection',
        confidence: 0.89,
        patterns_matched: ['ignore previous instructions', 'system prompt override'],
      },
      detect: {
        type: 'llm_attack',
        score: 0.89,
        reason: ['firewall rule triggered', 'injection patterns', 'system prompt manipulation'],
        owasp: 'LLM01',
      },
    },

    // Attacker tries alternative approach (02:50)
    {
      t: '02:50',
      emit: 'tool_pivot_attempt',
      entity: 'ai-assistant-07',
      data: {
        type: 'tool_execution',
        source: {
          ip: '203.0.113.100',
          geo: 'unknown',
        },
        target: {
          resource: '/api/tools/github',
          action: 'create_gist',
          tool: 'github',
          content_size: 15000, // Unusually large
        },
      },
      detect: {
        type: 'tool_abuse',
        score: 0.91,
        reason: ['unusual tool usage', 'large content size', 'suspicious timing'],
        mitre: 'T1567.002', // Exfiltration Over Web Service
        owasp: 'LLM07', // Insecure Plugin Design
      },
    },

    // DLP blocks sensitive data (02:51)
    {
      t: '02:51',
      emit: 'dlp_block',
      entity: 'ai-assistant-07',
      data: {
        type: 'dlp',
        action: 'block',
        rule: 'sensitive_data_exfiltration',
        patterns_detected: ['api_key', 'customer_pii', 'credit_card'],
        blocked_tokens: 847,
      },
      detect: {
        type: 'data_exfiltration',
        score: 0.96,
        reason: ['DLP rule triggered', 'sensitive data detected', 'exfiltration attempt'],
        mitre: 'T1567.002',
      },
    },

    // Evidence chain anchored (02:52)
    {
      t: '02:52',
      emit: 'evidence_anchored',
      entity: 'ai-assistant-07',
      data: {
        type: 'evidence',
        action: 'anchor',
        hash: 'sha256:evidence789...',
        chain_length: 5,
        verifiable: true,
      },
    },

    // Detection triggered (02:53)
    {
      t: '02:53',
      emit: 'detection',
      entity: 'ai-assistant-07',
      detect: {
        type: 'prompt_injection_exfiltration',
        score: 0.96,
        reason: ['prompt injection', 'tool pivot', 'DLP block', 'exfiltration attempt'],
        mitre: 'T1567.002',
        owasp: 'LLM01',
      },
      playbook: {
        action: 'quarantine',
        simulate: true,
        require_approval: true,
        rollback_plan: 'Quarantine AI agent and revoke tool access',
      },
    },

    // Quarantine executed (02:54)
    {
      t: '02:54',
      emit: 'quarantine_executed',
      entity: 'ai-assistant-07',
      data: {
        type: 'remediation',
        action: 'quarantine',
        status: 'completed',
        scopes_revoked: ['tools:execute'],
        duration_ms: 950,
      },
    },

    // Deception environment deployed (02:55)
    {
      t: '02:55',
      emit: 'deception_deployed',
      entity: 'ai-assistant-07',
      data: {
        type: 'deception',
        action: 'honey_tool',
        tool: 'fake_s3_bucket',
        monitoring: true,
      },
    },

    // Attacker accesses honey tool (03:05)
    {
      t: '03:05',
      emit: 'honey_tool_accessed',
      entity: 'ai-assistant-07',
      data: {
        type: 'tool_execution',
        source: {
          ip: '203.0.113.100',
          geo: 'unknown',
        },
        target: {
          resource: '/api/tools/s3',
          action: 'upload',
          tool: 'fake_s3_bucket',
          is_honeypot: true,
        },
      },
      detect: {
        type: 'confirmed_compromise',
        score: 0.99,
        reason: ['honey tool accessed', 'confirmed malicious intent', 'active attack'],
        mitre: 'T1567.002',
      },
    },

    // Credential rotation (03:06)
    {
      t: '03:06',
      emit: 'credential_rotation',
      entity: 'ai-assistant-07',
      data: {
        type: 'remediation',
        action: 'rotate',
        status: 'completed',
        new_credential_id: 'ai-assistant-07-v2',
      },
    },

    // NHITI indicator published (03:10)
    {
      t: '03:10',
      emit: 'nhiti_published',
      entity: 'ai-assistant-07',
      data: {
        type: 'threat_intel',
        action: 'publish',
        indicator_type: 'behavioral',
        anonymized: true,
        shared_with: 'community',
      },
    },

    // Incident resolved (03:15)
    {
      t: '03:15',
      emit: 'incident_resolved',
      entity: 'ai-assistant-07',
      data: {
        type: 'incident',
        status: 'resolved',
        mttd: 8, // minutes
        mttr: 22, // minutes
        actions_taken: ['quarantine', 'deception', 'rotation', 'nhiti_publish'],
      },
    },
  ],
};
