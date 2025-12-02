/**
 * Enterprise Demo V2 - Type Definitions
 * Deterministic Digital Twin + Time-Warped Reality + Real Artifacts
 * 
 * @module demo/types
 * @version 2.1.0
 */

// ============================================================================
// SCENARIO TYPES
// ============================================================================

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  seed: number;
  duration: number; // minutes in real-time
  timeline: ScenarioEvent[];
  tenants: TenantConfig[];
  entities: EntityConfig[];
  difficulty: 'normal' | 'hard';
}

export interface ScenarioEvent {
  t: string; // timestamp in HH:MM format
  emit: string; // event type
  entity?: string;
  data?: Record<string, any>;
  detect?: DetectionConfig;
  playbook?: PlaybookConfig;
}

export interface DetectionConfig {
  type: string;
  score: number;
  reason: string[];
  mitre?: string;
  owasp?: string;
}

export interface PlaybookConfig {
  action: string;
  simulate: boolean;
  require_approval: boolean;
  rollback_plan?: string;
}

// ============================================================================
// TENANT & ENTITY TYPES
// ============================================================================

export interface TenantConfig {
  id: string;
  name: string;
  industry: string;
  baseline: BaselineConfig;
}

export interface BaselineConfig {
  normal_hours: [number, number]; // [start, end] in hours
  typical_locations: string[];
  expected_tools: string[];
  peer_group_size: number;
}

export interface EntityConfig {
  id: string;
  name: string;
  type: 'api_key' | 'ci_cd_token' | 'service_account' | 'ai_agent' | 'scheduler';
  tenant: string;
  owner: string;
  scopes: string[];
  rotation_history: RotationRecord[];
  lineage: LineageRecord[];
}

export interface RotationRecord {
  timestamp: string;
  reason: string;
  performed_by: string;
}

export interface LineageRecord {
  created_at: string;
  created_by: string;
  parent_entity?: string;
  purpose: string;
}

// ============================================================================
// EVIDENCE & OCSF TYPES
// ============================================================================

export interface EvidenceEvent {
  time: string;
  class_uid: number; // OCSF class
  nexora: {
    tenant: string;
    entity: string;
    scenario: string;
    seed: number;
  };
  detection?: {
    type: string;
    score: number;
    reason: string[];
    mitre?: string;
    owasp?: string;
  };
  activity?: {
    type: string;
    source: {
      ip: string;
      geo: string;
      user_agent?: string;
    };
    target?: {
      resource: string;
      action: string;
    };
  };
  hash: string;
  prev_hash: string;
  signature?: string;
}

export interface SBOMEntry {
  component: string;
  version: string;
  purl: string;
  cves: CVEEntry[];
  licenses: string[];
  supplier: string;
}

export interface CVEEntry {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  fixed_in?: string;
}

export interface CosignAttestation {
  image: string;
  digest: string;
  signer: string;
  timestamp: string;
  signature: string;
  rekor_entry?: string;
}

// ============================================================================
// PLAYBACK & CONTROL TYPES
// ============================================================================

export interface PlaybackState {
  scenario_id: string;
  seed: number;
  current_time: string; // HH:MM
  elapsed_ms: number;
  time_warp_rate: number; // 1× to 144× (24h in 10min = 144×)
  status: 'playing' | 'paused' | 'stopped';
  branch_point?: BranchPoint;
}

export interface BranchPoint {
  event_id: string;
  timestamp: string;
  decision: 'approve' | 'deny';
  alternatives: BranchAlternative[];
}

export interface BranchAlternative {
  choice: string;
  description: string;
  expected_outcome: {
    mttd_delta: number; // minutes
    mttr_delta: number; // minutes
    risk_score_delta: number;
  };
}

// ============================================================================
// DIRECTOR CONTROLS
// ============================================================================

export interface DirectorCommand {
  action: 'play' | 'pause' | 'stop' | 'rewind' | 'jump' | 'branch' | 'toggle_time_warp' | 'set_difficulty';
  params?: {
    time?: string; // HH:MM for jump
    rate?: number; // time warp multiplier
    difficulty?: 'normal' | 'hard';
    branch_choice?: string;
  };
}

export interface DirectorState {
  visible: boolean; // only for presenter
  current_scenario: string;
  available_scenarios: string[];
  hotkeys_enabled: boolean;
  noise_level: number; // 0-100
  auto_remediation: boolean;
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

export interface VerificationRequest {
  anchor: string; // hash to verify
  include_chain?: boolean; // include full chain
}

export interface VerificationResponse {
  valid: boolean;
  event: EvidenceEvent;
  chain?: EvidenceEvent[];
  verification_command: string; // CLI command to verify
}

// ============================================================================
// THREAT INTELLIGENCE (NHITI)
// ============================================================================

export interface NHITIIndicator {
  id: string;
  type: 'behavioral' | 'credential' | 'morphing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: {
    scope_drift?: number;
    geo_velocity?: number;
    tool_pivot?: string[];
    peer_divergence?: number;
  };
  first_seen: string;
  last_seen: string;
  confidence: number;
  sources: string[]; // anonymized tenant IDs
}

// ============================================================================
// DEMO EXPORT TYPES
// ============================================================================

export interface DemoReport {
  scenario: {
    id: string;
    seed: number;
    duration_ms: number;
    completed_at: string;
  };
  events: EvidenceEvent[];
  detections: DetectionSummary[];
  actions: ActionSummary[];
  analyst_decisions: AnalystDecision[];
  metrics: {
    total_events: number;
    total_detections: number;
    true_positives: number;
    false_positives: number;
    mttd_avg: number; // minutes
    mttr_avg: number; // minutes
  };
}

export interface DetectionSummary {
  timestamp: string;
  type: string;
  entity: string;
  score: number;
  outcome: 'tp' | 'fp' | 'pending';
}

export interface ActionSummary {
  timestamp: string;
  type: string;
  entity: string;
  status: 'completed' | 'failed' | 'rolled_back';
  duration_ms: number;
}

export interface AnalystDecision {
  timestamp: string;
  event_id: string;
  decision: 'approve' | 'deny' | 'escalate';
  rationale?: string;
}
