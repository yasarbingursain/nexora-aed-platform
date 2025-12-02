/**
 * Enterprise Demo V2 - Controller
 * API endpoints for demo scenario management and playback
 * 
 * @module controllers/demo
 * @version 2.1.0
 */

import { Request, Response } from 'express';
import { ScenarioEngine } from '../demo/engine';
import { morphingAgentScenario } from '../demo/scenarios/morphing-agent';
import { supplyChainScenario } from '../demo/scenarios/supply-chain';
import { promptInjectionScenario } from '../demo/scenarios/prompt-injection';
import { DirectorCommand, VerificationRequest } from '../demo/types';

// Singleton engine instance
let engineInstance: ScenarioEngine | null = null;

function getEngine(): ScenarioEngine {
  if (!engineInstance) {
    engineInstance = new ScenarioEngine();
    
    // Set up event listeners for WebSocket broadcasting
    engineInstance.on('event:emitted', (event) => {
      // Broadcast to WebSocket clients
      // This will be handled by websocket service
    });
    
    engineInstance.on('detection:triggered', (detection) => {
      // Broadcast detection to clients
    });
    
    engineInstance.on('branch:created', (branch) => {
      // Broadcast branch point to clients
    });
  }
  
  return engineInstance;
}

/**
 * Get available scenarios
 */
export const getScenarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const scenarios = [
      {
        id: morphingAgentScenario.id,
        name: morphingAgentScenario.name,
        description: morphingAgentScenario.description,
        duration: morphingAgentScenario.duration,
        difficulty: morphingAgentScenario.difficulty,
      },
      {
        id: supplyChainScenario.id,
        name: supplyChainScenario.name,
        description: supplyChainScenario.description,
        duration: supplyChainScenario.duration,
        difficulty: supplyChainScenario.difficulty,
      },
      {
        id: promptInjectionScenario.id,
        name: promptInjectionScenario.name,
        description: promptInjectionScenario.description,
        duration: promptInjectionScenario.duration,
        difficulty: promptInjectionScenario.difficulty,
      },
    ];

    res.json({
      success: true,
      data: scenarios,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Load a scenario
 */
export const loadScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, seed } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Scenario ID is required',
      });
      return;
    }

    const engine = getEngine();
    
    // Get scenario by ID
    let scenario;
    switch (id) {
      case 'morphing-agent':
        scenario = morphingAgentScenario;
        break;
      case 'supply-chain-drift':
        scenario = supplyChainScenario;
        break;
      case 'prompt-injection':
        scenario = promptInjectionScenario;
        break;
      default:
        res.status(404).json({
          success: false,
          error: 'Scenario not found',
        });
        return;
    }
    
    // Override seed if provided
    if (seed) {
      scenario = { ...scenario, seed };
    }

    engine.loadScenario(scenario);

    res.json({
      success: true,
      data: {
        scenario_id: scenario.id,
        seed: scenario.seed,
        duration: scenario.duration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get current playback state
 */
export const getPlaybackState = async (req: Request, res: Response): Promise<void> => {
  try {
    const engine = getEngine();
    const state = engine.getPlaybackState();

    if (!state) {
      res.status(404).json({
        success: false,
        error: 'No scenario loaded',
      });
      return;
    }

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Control playback (play, pause, stop, etc.)
 */
export const controlPlayback = async (req: Request, res: Response): Promise<void> => {
  try {
    const command: DirectorCommand = req.body;

    if (!command.action) {
      res.status(400).json({
        success: false,
        error: 'Action is required',
      });
      return;
    }

    const engine = getEngine();
    engine.handleDirectorCommand(command);

    res.json({
      success: true,
      data: {
        action: command.action,
        state: engine.getPlaybackState(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get evidence chain
 */
export const getEvidenceChain = async (req: Request, res: Response): Promise<void> => {
  try {
    const engine = getEngine();
    const chain = engine.getEvidenceChain();

    res.json({
      success: true,
      data: {
        total_events: chain.length,
        events: chain,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Verify evidence by hash
 */
export const verifyEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const anchor = req.query.anchor as string | undefined;
    const include_chain = req.query.include_chain as string | undefined;

    if (!anchor) {
      res.status(400).json({
        success: false,
        error: 'Anchor hash is required',
      });
      return;
    }

    const engine = getEngine();
    const event = engine.verifyEvidence(anchor);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Evidence not found',
      });
      return;
    }

    const response: any = {
      valid: true,
      event,
      verification_command: `nexora-demo verify ${anchor}`,
    };

    if (include_chain === 'true') {
      response.chain = engine.getChainFromHash(anchor);
    }

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Export demo report
 */
export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const engine = getEngine();
    const state = engine.getPlaybackState();
    const chain = engine.getEvidenceChain();

    if (!state) {
      res.status(404).json({
        success: false,
        error: 'No scenario loaded',
      });
      return;
    }

    const report = {
      scenario: {
        id: state.scenario_id,
        seed: state.seed,
        duration_ms: state.elapsed_ms,
        completed_at: new Date().toISOString(),
      },
      events: chain,
      metrics: {
        total_events: chain.length,
        total_detections: chain.filter(e => e.detection).length,
      },
    };

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
