/**
 * Enterprise Demo V2 - Supply Chain Drift Scenario
 * New container image with vulnerable dependencies and first-time signer
 * 
 * @module demo/scenarios/supply-chain
 * @version 2.1.0
 */

import { ScenarioConfig } from '../types';

export const supplyChainScenario: ScenarioConfig = {
  id: 'supply-chain-drift',
  name: 'Supply Chain Drift Detection',
  description: 'New container image signed by first-time signer with vulnerable SBOM dependencies',
  seed: 4242,
  duration: 24,
  difficulty: 'normal',

  tenants: [
    {
      id: 'healthtech-b',
      name: 'HealthTech Demo Inc',
      industry: 'healthcare',
      baseline: {
        normal_hours: [6, 20],
        typical_locations: ['us-east-1', 'us-west-1'],
        expected_tools: ['docker', 'kubernetes', 'github'],
        peer_group_size: 8,
      },
    },
  ],

  entities: [
    {
      id: 'ci-cd-pipeline-01',
      name: 'CI/CD Pipeline 01',
      type: 'ci_cd_token',
      tenant: 'healthtech-b',
      owner: 'devops@healthtech-demo.com',
      scopes: ['repo:read', 'packages:write', 'actions:run'],
      rotation_history: [
        {
          timestamp: '2025-09-20T12:00:00Z',
          reason: 'scheduled_rotation',
          performed_by: 'system',
        },
      ],
      lineage: [
        {
          created_at: '2025-08-01T09:00:00Z',
          created_by: 'devops@healthtech-demo.com',
          purpose: 'Automated CI/CD pipeline for container builds',
        },
      ],
    },
  ],

  timeline: [
    // Normal baseline activity (00:00 - 02:00)
    {
      t: '00:00',
      emit: 'baseline_window',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'build',
        source: {
          ip: '54.23.45.67',
          geo: 'us-east-1',
          user_agent: 'github-actions/2.0',
        },
        target: {
          resource: '/api/builds',
          action: 'create',
          image: 'healthtech/api:v1.2.3',
        },
      },
    },

    // Normal image signing (02:15)
    {
      t: '02:15',
      emit: 'image_signed',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'signing',
        source: {
          ip: '54.23.45.67',
          geo: 'us-east-1',
        },
        target: {
          resource: '/api/sign',
          action: 'sign',
          image: 'healthtech/api:v1.2.3',
          signer: 'devops@healthtech-demo.com',
          signature: 'sha256:abc123...',
        },
      },
    },

    // New build with first-time signer (03:30)
    {
      t: '03:30',
      emit: 'suspicious_build',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'build',
        source: {
          ip: '54.23.45.67',
          geo: 'us-east-1',
          user_agent: 'github-actions/2.0',
        },
        target: {
          resource: '/api/builds',
          action: 'create',
          image: 'healthtech/api:v1.3.0',
        },
      },
    },

    // Image signed by new signer (03:35)
    {
      t: '03:35',
      emit: 'first_time_signer',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'signing',
        source: {
          ip: '203.0.113.75',
          geo: 'eu-west-1', // Different region
        },
        target: {
          resource: '/api/sign',
          action: 'sign',
          image: 'healthtech/api:v1.3.0',
          signer: 'contractor@external.com', // First-time signer
          signature: 'sha256:def456...',
        },
      },
      detect: {
        type: 'provenance_anomaly',
        score: 0.78,
        reason: ['first-time signer', 'geographic anomaly', 'external domain'],
        mitre: 'T1195.002', // Supply Chain Compromise: Software Supply Chain
      },
    },

    // SBOM analysis reveals vulnerabilities (03:36)
    {
      t: '03:36',
      emit: 'sbom_vulnerability',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'sbom_scan',
        source: {
          ip: '54.23.45.67',
          geo: 'us-east-1',
        },
        target: {
          resource: '/api/sbom/scan',
          action: 'analyze',
          image: 'healthtech/api:v1.3.0',
          vulnerabilities: [
            {
              cve: 'CVE-2024-1234',
              severity: 'high',
              score: 8.1,
              package: 'log4j',
              version: '2.14.0',
              fixed_in: '2.17.1',
            },
            {
              cve: 'CVE-2024-5678',
              severity: 'critical',
              score: 9.8,
              package: 'openssl',
              version: '1.1.1k',
              fixed_in: '3.0.7',
            },
          ],
        },
      },
      detect: {
        type: 'supply_chain_risk',
        score: 0.94,
        reason: ['critical CVEs detected', 'transitive dependency vulnerability', 'first-time signer'],
        mitre: 'T1195.002',
      },
    },

    // Detection triggered (03:37)
    {
      t: '03:37',
      emit: 'detection',
      entity: 'ci-cd-pipeline-01',
      detect: {
        type: 'supply_chain_compromise',
        score: 0.94,
        reason: ['critical CVEs', 'first-time signer', 'provenance anomaly'],
        mitre: 'T1195.002',
      },
      playbook: {
        action: 'rollback',
        simulate: true,
        require_approval: true,
        rollback_plan: 'Rollback to previous known-good image v1.2.3',
      },
    },

    // Require 2-person approval (03:38)
    {
      t: '03:38',
      emit: 'approval_required',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'approval',
        action: 'rollback',
        approvers_required: 2,
        approvers: ['security@healthtech-demo.com', 'devops@healthtech-demo.com'],
      },
    },

    // Approval granted (03:42)
    {
      t: '03:42',
      emit: 'approval_granted',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'approval',
        status: 'approved',
        approvers: ['security@healthtech-demo.com', 'devops@healthtech-demo.com'],
      },
    },

    // Rollback executed (03:43)
    {
      t: '03:43',
      emit: 'rollback_executed',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'remediation',
        action: 'rollback',
        status: 'completed',
        from_image: 'healthtech/api:v1.3.0',
        to_image: 'healthtech/api:v1.2.3',
        duration_ms: 8500,
      },
      playbook: {
        action: 'rollback',
        simulate: false,
        require_approval: false,
      },
    },

    // SIEM notification sent (03:44)
    {
      t: '03:44',
      emit: 'siem_notification',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'notification',
        action: 'siem_alert',
        destination: 'splunk',
        severity: 'high',
        message: 'Supply chain compromise detected and remediated',
      },
    },

    // Incident resolved (03:50)
    {
      t: '03:50',
      emit: 'incident_resolved',
      entity: 'ci-cd-pipeline-01',
      data: {
        type: 'incident',
        status: 'resolved',
        mttd: 7, // minutes
        mttr: 13, // minutes
        actions_taken: ['rollback', 'siem_notification', '2-person_approval'],
      },
    },
  ],
};
