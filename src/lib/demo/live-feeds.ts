/**
 * Nexora Live Demo System - Real-Time Open Source Integration
 * Real threat intelligence feeds for autonomous entity defense
 */

export const LIVE_THREAT_FEEDS = {
  // Real API security threats
  api_attacks: {
    source: 'https://raw.githubusercontent.com/OWASP/API-Security/master/editions/2023/en/0x11-t10.md',
    feed: 'https://api.abuseipdb.com/api/v2/blacklist',
    honeypot_data: 'https://threatfox-api.abuse.ch/api/v1/',
    description: 'Live API attack patterns and malicious IPs targeting APIs'
  },
  
  // Real bot/agent behavior anomalies
  bot_signatures: {
    source: 'https://raw.githubusercontent.com/mitchellkrogza/nginx-ultimate-bad-bot-blocker/master/_generator_lists/bad-bots.list',
    feed: 'https://www.botscout.com/test/?multi&mail=test@test.com&ip=1.1.1.1&name=test',
    description: 'Live malicious bot signatures and behavioral patterns'
  },
  
  // Real machine identity compromise indicators
  compromised_tokens: {
    source: 'https://api.github.com/search/code?q="api_key"+OR+"secret_key"+OR+"bearer_token"',
    feed: 'https://haveibeenpwned.com/api/v3/breaches',
    leak_data: 'https://raw.githubusercontent.com/streaak/keyhacks/master/README.md',
    description: 'Live exposed API keys and compromised machine credentials'
  },
  
  // Real AI/LLM attack vectors
  ai_threats: {
    source: 'https://raw.githubusercontent.com/leondz/garak/main/garak/resources/prompts.jsonl',
    feed: 'https://huggingface.co/datasets/deepmind/code_contests/raw/main/test/problem.json',
    description: 'Live prompt injection attempts and AI agent manipulation'
  },
  
  // Real supply chain compromises
  supply_chain: {
    source: 'https://api.github.com/advisories',
    feed: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
    sbom_threats: 'https://deps.dev/api/v3alpha/systems/npm/packages',
    description: 'Live supply chain vulnerabilities affecting dependencies'
  }
};

export interface ThreatEvent {
  id: string;
  type: 'credential_exposure' | 'behavioral_anomaly' | 'prompt_injection' | 'supply_chain_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity: string;
  description: string;
  evidence: any;
  timestamp: string;
  auto_response: boolean;
  response_actions: string[];
}
