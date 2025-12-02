/**
 * Nexora Live Demo Engine
 * Real-time threat intelligence orchestrator
 */

import { LiveAPIKeyDetection } from './LiveAPIKeyDetection';
import { LiveBotBehaviorAnalysis } from './LiveBotBehaviorAnalysis';
import { LivePromptInjectionDetection} from './LivePromptInjectionDetection';
// import { LiveSupplyChainMonitoring } from './LiveSupplyChainMonitoring'; // Removed - no mock data
import type { ThreatEvent } from './live-feeds';

export class NexoraLiveDemoEngine {
  private apiKeyDetection = new LiveAPIKeyDetection();
  private botAnalysis = new LiveBotBehaviorAnalysis();
  private promptInjection = new LivePromptInjectionDetection();
  // private supplyChain = new LiveSupplyChainMonitoring(); // Removed - no mock data
  
  private eventQueue: ThreatEvent[] = [];
  private isRunning = false;
  private listeners: ((threats: ThreatEvent[]) => void)[] = [];

  async fetchLiveThreats(): Promise<ThreatEvent[]> {
    console.log('🔍 Fetching from /api/live-demo...');
    try {
      // Use Next.js API route for better performance and CORS handling
      const response = await fetch('/api/live-demo', {
        cache: 'no-store'
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch live threats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 API Data received:', data);
      
      const allThreats = data.threats || [];
      console.log('🎯 Threats extracted:', allThreats.length);

      // Process threats
      for (const threat of allThreats) {
        this.processLiveThreat(threat);
      }

      return allThreats;
    } catch (error) {
      console.error('❌ Error in live demo engine:', error);
      
      // Fallback to direct detection if API fails
      try {
        const [apiKeys, bots, prompts] = await Promise.all([
          this.apiKeyDetection.scanForExposedKeys(),
          this.botAnalysis.analyzeLiveBotTraffic(),
          this.promptInjection.detectLivePromptInjections()
        ]);

        const allThreats = [
          ...apiKeys,
          ...bots,
          ...prompts
        ];

        for (const threat of allThreats) {
          this.processLiveThreat(threat);
        }

        return allThreats;
      } catch (fallbackError) {
        console.error('Fallback detection also failed:', fallbackError);
        return [];
      }
    }
  }

  startLiveMonitoring(callback: (threats: ThreatEvent[]) => void): () => void {
    console.log('🚀 Starting live monitoring...');
    this.listeners.push(callback);
    this.isRunning = true;
    
    // Initial fetch - IMMEDIATELY
    console.log('📡 Fetching initial threats...');
    this.fetchLiveThreats()
      .then(threats => {
        console.log('✅ Initial threats fetched:', threats.length);
        callback(threats);
      })
      .catch(error => {
        console.error('❌ Error fetching initial threats:', error);
      });
    
    // Refresh every 60 seconds
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      console.log('🔄 Refreshing threats...');
      try {
        const threats = await this.fetchLiveThreats();
        console.log('✅ Threats refreshed:', threats.length);
        this.listeners.forEach(listener => listener(threats));
      } catch (error) {
        console.error('❌ Error refreshing threats:', error);
      }
    }, 60000);
    
    // Return cleanup function
    return () => {
      console.log('🛑 Stopping live monitoring');
      this.isRunning = false;
      this.listeners = this.listeners.filter(l => l !== callback);
      clearInterval(interval);
    };
  }

  private processLiveThreat(threat: ThreatEvent): void {
    // Add to event queue
    this.eventQueue.push(threat);
    
    // Keep only last 100 events
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
    
    // Log for audit
    console.log(`🔴 LIVE THREAT: ${threat.type} - ${threat.severity} - ${threat.entity}`);
    
    // Auto-response simulation
    if (threat.auto_response) {
      this.executeAutoResponse(threat);
    }
  }

  private executeAutoResponse(threat: ThreatEvent): void {
    for (const action of threat.response_actions) {
      switch (action) {
        case 'revoke_token':
          console.log(`🔒 AUTO-RESPONSE: Revoking token for ${threat.entity}`);
          break;
        case 'block_ip':
          console.log(`🚫 AUTO-RESPONSE: Blocking IP ${threat.evidence.source_ip}`);
          break;
        case 'quarantine':
          console.log(`⚠️ AUTO-RESPONSE: Quarantining ${threat.entity}`);
          break;
        case 'alert_admin':
          console.log(`📢 AUTO-RESPONSE: Alerting administrators about ${threat.type}`);
          break;
      }
    }
  }

  getEventQueue(): ThreatEvent[] {
    return [...this.eventQueue];
  }

  stop(): void {
    this.isRunning = false;
    this.listeners = [];
  }
}
