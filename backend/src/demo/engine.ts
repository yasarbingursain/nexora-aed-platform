/**
 * Enterprise Demo V2 - Scenario Engine
 * Deterministic PRNG-based event generation with time-warp playback
 * 
 * @module demo/engine
 * @version 2.1.0
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  ScenarioConfig,
  ScenarioEvent,
  PlaybackState,
  EvidenceEvent,
  DirectorCommand,
  BranchPoint,
} from './types';

/**
 * Seeded Random Number Generator (PRNG)
 * Ensures deterministic behavior across demo runs
 */
class SeededRandom {
  private seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  next(): number {
    // Linear Congruential Generator (LCG)
    // Parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(array: T[]): T {
    const index = this.nextInt(0, array.length - 1);
    const result = array[index];
    if (result === undefined) {
      throw new Error('Array is empty');
    }
    return result;
  }

  reset(): void {
    this.state = this.seed;
  }
}

/**
 * Scenario Engine
 * Manages deterministic event playback with time-warp capabilities
 */
export class ScenarioEngine extends EventEmitter {
  private scenario: ScenarioConfig | null = null;
  private playbackState: PlaybackState | null = null;
  private prng: SeededRandom | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private evidenceChain: EvidenceEvent[] = [];
  private branchHistory: BranchPoint[] = [];

  constructor() {
    super();
  }

  /**
   * Load and initialize a scenario
   */
  loadScenario(scenario: ScenarioConfig): void {
    this.scenario = scenario;
    this.prng = new SeededRandom(scenario.seed);
    this.evidenceChain = [];
    this.branchHistory = [];

    this.playbackState = {
      scenario_id: scenario.id,
      seed: scenario.seed,
      current_time: '00:00',
      elapsed_ms: 0,
      time_warp_rate: 144, // 24h in 10min by default
      status: 'stopped',
    };

    this.emit('scenario:loaded', {
      scenario_id: scenario.id,
      seed: scenario.seed,
      duration: scenario.duration,
    });
  }

  /**
   * Start playback
   */
  play(): void {
    if (!this.scenario || !this.playbackState) {
      throw new Error('No scenario loaded');
    }

    if (this.playbackState.status === 'playing') {
      return;
    }

    this.playbackState.status = 'playing';
    this.emit('playback:started', this.playbackState);

    // Tick every 500ms
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 500);
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.playbackState) return;

    this.playbackState.status = 'paused';
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.emit('playback:paused', this.playbackState);
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (!this.playbackState) return;

    this.playbackState.status = 'stopped';
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.emit('playback:stopped', this.playbackState);
  }

  /**
   * Jump to specific time
   */
  jump(time: string): void {
    if (!this.playbackState) return;

    const parts = time.split(':').map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    const targetMs = (hours * 60 + minutes) * 60 * 1000;

    this.playbackState.current_time = time;
    this.playbackState.elapsed_ms = targetMs;

    this.emit('playback:jumped', {
      time,
      elapsed_ms: targetMs,
    });
  }

  /**
   * Rewind by specified minutes
   */
  rewind(minutes: number): void {
    if (!this.playbackState) return;

    const rewindMs = minutes * 60 * 1000;
    this.playbackState.elapsed_ms = Math.max(0, this.playbackState.elapsed_ms - rewindMs);

    const totalMinutes = Math.floor(this.playbackState.elapsed_ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    this.playbackState.current_time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    this.emit('playback:rewound', {
      minutes,
      current_time: this.playbackState.current_time,
    });
  }

  /**
   * Set time warp rate
   */
  setTimeWarpRate(rate: number): void {
    if (!this.playbackState) return;

    this.playbackState.time_warp_rate = rate;
    this.emit('timewarp:changed', { rate });
  }

  /**
   * Handle director command
   */
  handleDirectorCommand(command: DirectorCommand): void {
    switch (command.action) {
      case 'play':
        this.play();
        break;
      case 'pause':
        this.pause();
        break;
      case 'stop':
        this.stop();
        break;
      case 'rewind':
        if (command.params?.time) {
          const minutes = parseInt(command.params.time);
          this.rewind(minutes);
        }
        break;
      case 'jump':
        if (command.params?.time) {
          this.jump(command.params.time);
        }
        break;
      case 'toggle_time_warp':
        if (command.params?.rate) {
          this.setTimeWarpRate(command.params.rate);
        }
        break;
      case 'branch':
        if (command.params?.branch_choice) {
          this.handleBranch(command.params.branch_choice);
        }
        break;
    }
  }

  /**
   * Handle branch decision
   */
  private handleBranch(choice: string): void {
    if (!this.playbackState?.branch_point) return;

    const branchPoint = this.playbackState.branch_point;
    this.branchHistory.push({
      ...branchPoint,
      decision: choice as 'approve' | 'deny',
    });

    this.emit('branch:taken', {
      event_id: branchPoint.event_id,
      choice,
    });

    // Clear branch point
    delete this.playbackState.branch_point;
  }

  /**
   * Main tick function - advances simulation
   */
  private tick(): void {
    if (!this.scenario || !this.playbackState || !this.prng) return;

    // Advance time based on warp rate
    // 500ms tick × warp_rate = simulated time
    const simulatedMs = 500 * this.playbackState.time_warp_rate;
    this.playbackState.elapsed_ms += simulatedMs;

    // Convert to HH:MM
    const totalMinutes = Math.floor(this.playbackState.elapsed_ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    this.playbackState.current_time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check for events at this time
    const eventsAtTime = this.scenario.timeline.filter(
      (event) => event.t === this.playbackState!.current_time
    );

    // Emit events
    for (const event of eventsAtTime) {
      this.emitScenarioEvent(event);
    }

    // Check if scenario complete
    if (this.playbackState.elapsed_ms >= this.scenario.duration * 60 * 1000) {
      this.stop();
      this.emit('scenario:complete', {
        scenario_id: this.scenario.id,
        total_events: this.evidenceChain.length,
      });
    }

    // Emit tick update
    this.emit('playback:tick', {
      current_time: this.playbackState.current_time,
      elapsed_ms: this.playbackState.elapsed_ms,
    });
  }

  /**
   * Emit scenario event and create evidence
   */
  private emitScenarioEvent(event: ScenarioEvent): void {
    if (!this.scenario || !this.playbackState) return;

    // Create evidence event
    const evidenceEvent = this.createEvidenceEvent(event);
    this.evidenceChain.push(evidenceEvent);

    // Emit to listeners
    this.emit('event:emitted', evidenceEvent);

    // If detection, emit detection event
    if (event.detect) {
      this.emit('detection:triggered', {
        ...event.detect,
        event_id: evidenceEvent.hash,
        entity: event.entity,
      });
    }

    // If playbook requires approval, create branch point
    if (event.playbook?.require_approval) {
      this.createBranchPoint(event, evidenceEvent);
    }
  }

  /**
   * Create OCSF-compliant evidence event
   */
  private createEvidenceEvent(event: ScenarioEvent): EvidenceEvent {
    if (!this.scenario || !this.playbackState) {
      throw new Error('No scenario loaded');
    }

    const lastEvent = this.evidenceChain[this.evidenceChain.length - 1];
    const prevHash = lastEvent
      ? lastEvent.hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const tenant = this.scenario.tenants[0];
    if (!tenant) {
      throw new Error('No tenant configured in scenario');
    }

    const evidenceData: Omit<EvidenceEvent, 'hash'> = {
      time: new Date().toISOString(),
      class_uid: 2001, // OCSF Detection Finding
      nexora: {
        tenant: tenant.id,
        entity: event.entity || 'unknown',
        scenario: this.scenario.id,
        seed: this.scenario.seed,
      },
      ...(event.detect && { detection: event.detect }),
      ...(event.data && { activity: event.data as any }),
      prev_hash: prevHash,
      signature: `demo-ca-${this.scenario.seed}`,
    };

    // Compute hash
    const hash = this.computeHash(evidenceData);

    return {
      ...evidenceData,
      hash,
    };
  }

  /**
   * Compute SHA-256 hash for evidence chain
   */
  private computeHash(data: Omit<EvidenceEvent, 'hash'>): string {
    const hashInput = JSON.stringify(data);
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Create branch point for analyst decision
   */
  private createBranchPoint(event: ScenarioEvent, evidenceEvent: EvidenceEvent): void {
    if (!this.playbackState) return;

    const branchPoint: BranchPoint = {
      event_id: evidenceEvent.hash,
      timestamp: evidenceEvent.time,
      decision: 'approve', // default
      alternatives: [
        {
          choice: 'approve',
          description: 'Approve automatic remediation',
          expected_outcome: {
            mttd_delta: 0,
            mttr_delta: -5,
            risk_score_delta: -20,
          },
        },
        {
          choice: 'deny',
          description: 'Deny and investigate manually',
          expected_outcome: {
            mttd_delta: 0,
            mttr_delta: 15,
            risk_score_delta: 10,
          },
        },
      ],
    };

    this.playbackState.branch_point = branchPoint;
    this.emit('branch:created', branchPoint);
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState | null {
    return this.playbackState;
  }

  /**
   * Get evidence chain
   */
  getEvidenceChain(): EvidenceEvent[] {
    return this.evidenceChain;
  }

  /**
   * Verify evidence by hash
   */
  verifyEvidence(hash: string): EvidenceEvent | null {
    return this.evidenceChain.find((e) => e.hash === hash) || null;
  }

  /**
   * Get full chain from hash
   */
  getChainFromHash(hash: string): EvidenceEvent[] {
    const index = this.evidenceChain.findIndex((e) => e.hash === hash);
    if (index === -1) return [];
    return this.evidenceChain.slice(0, index + 1);
  }
}
