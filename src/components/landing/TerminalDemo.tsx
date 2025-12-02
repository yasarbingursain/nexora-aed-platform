"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, RotateCcw } from 'lucide-react';

const scenarios = [
  {
    id: 'stolen-key',
    name: 'Stolen API Key Replay',
    command: 'nexora detect --entity nhi:api-key:prod-7829',
    steps: [
      { text: '$ nexora detect --entity nhi:api-key:prod-7829', delay: 0 },
      { text: '', delay: 500 },
      { text: '[Scanning entity behavior... ████████████ 100%]', delay: 1000 },
      { text: '', delay: 1500 },
      { text: '⚠️  ANOMALY DETECTED', delay: 2000, color: 'text-nexora-threat' },
      { text: '', delay: 2100 },
      { text: 'Entity: nhi:api-key:prod-7829', delay: 2200 },
      { text: 'Risk Score: 0.95 (CRITICAL)', delay: 2400, color: 'text-nexora-threat' },
      { text: '', delay: 2500 },
      { text: 'Reasons:', delay: 2600 },
      { text: '• Replay attack: Same token used from 3 different IPs', delay: 2800 },
      { text: '• Geographic anomaly: Access from North Korea (never seen)', delay: 3000 },
      { text: '• Rate spike: 10,000 requests in 60 seconds (normal: 50/min)', delay: 3200 },
      { text: '', delay: 3300 },
      { text: '[Autonomous Response Initiated]', delay: 3500, color: 'text-nexora-ai' },
      { text: '✓ Credentials rotated (elapsed: 847ms)', delay: 3800, color: 'text-nexora-ai' },
      { text: '✓ Entity quarantined (elapsed: 1.2s)', delay: 4000, color: 'text-nexora-ai' },
      { text: '✓ Evidence captured (s3://forensics/2024-11-05/...)', delay: 4200, color: 'text-nexora-ai' },
      { text: '✓ SIEM alert sent (Splunk, Chronicle)', delay: 4400, color: 'text-nexora-ai' },
      { text: '', delay: 4500 },
      { text: '$ _', delay: 4600, blink: true }
    ]
  },
  {
    id: 'morphing',
    name: 'AI Agent Morphing Attack',
    command: 'nexora detect --entity nhi:agent:ml-worker-42',
    steps: [
      { text: '$ nexora detect --entity nhi:agent:ml-worker-42', delay: 0 },
      { text: '', delay: 500 },
      { text: '[Analyzing behavioral baseline... ████████████ 100%]', delay: 1000 },
      { text: '', delay: 1500 },
      { text: '🔴 ENTITY MORPHING DETECTED', delay: 2000, color: 'text-nexora-threat' },
      { text: '', delay: 2100 },
      { text: 'Entity: nhi:agent:ml-worker-42', delay: 2200 },
      { text: 'Risk Score: 0.92 (CRITICAL)', delay: 2400, color: 'text-nexora-threat' },
      { text: '', delay: 2500 },
      { text: 'Morphing Indicators:', delay: 2600 },
      { text: '• Identity drift: Agent claiming different parent lineage', delay: 2800 },
      { text: '• Behavioral shift: New API endpoints accessed (never seen)', delay: 3000 },
      { text: '• Privilege escalation: Attempting WRITE on READ-only role', delay: 3200 },
      { text: '• Fingerprint mismatch: TLS cert changed without rotation event', delay: 3400 },
      { text: '', delay: 3500 },
      { text: '[Autonomous Response Initiated]', delay: 3700, color: 'text-nexora-ai' },
      { text: '✓ Agent isolated in sandbox (elapsed: 234ms)', delay: 4000, color: 'text-nexora-ai' },
      { text: '✓ Forensic snapshot captured', delay: 4200, color: 'text-nexora-ai' },
      { text: '✓ Parent agent notified for verification', delay: 4400, color: 'text-nexora-ai' },
      { text: '✓ NHITI network updated with fingerprint', delay: 4600, color: 'text-nexora-ai' },
      { text: '', delay: 4700 },
      { text: '$ _', delay: 4800, blink: true }
    ]
  },
  {
    id: 'scope-escalation',
    name: 'Scope Escalation Attempt',
    command: 'nexora detect --entity nhi:service:data-processor',
    steps: [
      { text: '$ nexora detect --entity nhi:service:data-processor', delay: 0 },
      { text: '', delay: 500 },
      { text: '[Monitoring scope boundaries... ████████████ 100%]', delay: 1000 },
      { text: '', delay: 1500 },
      { text: '⚠️  SCOPE VIOLATION DETECTED', delay: 2000, color: 'text-nexora-warning' },
      { text: '', delay: 2100 },
      { text: 'Entity: nhi:service:data-processor', delay: 2200 },
      { text: 'Risk Score: 0.88 (HIGH)', delay: 2400, color: 'text-nexora-warning' },
      { text: '', delay: 2500 },
      { text: 'Violations:', delay: 2600 },
      { text: '• Scope drift: Attempted access to /admin/* (not in grant)', delay: 2800 },
      { text: '• Resource escalation: Tried to access customer:* (granted: customer:123)', delay: 3000 },
      { text: '• Time anomaly: Access at 3:47 AM (normal hours: 9 AM - 6 PM)', delay: 3200 },
      { text: '', delay: 3300 },
      { text: '[Autonomous Response Initiated]', delay: 3500, color: 'text-nexora-ai' },
      { text: '✓ Request blocked (elapsed: 12ms)', delay: 3800, color: 'text-nexora-ai' },
      { text: '✓ Token scope reduced to minimum', delay: 4000, color: 'text-nexora-ai' },
      { text: '✓ Security team notified', delay: 4200, color: 'text-nexora-ai' },
      { text: '✓ Compliance log updated (SOC2, PCI-DSS)', delay: 4400, color: 'text-nexora-ai' },
      { text: '', delay: 4500 },
      { text: '$ _', delay: 4600, blink: true }
    ]
  },
  {
    id: 'quantum',
    name: 'Quantum Harvest-Now Simulation',
    command: 'nexora quantum-scan --entity nhi:cert:api-gateway',
    steps: [
      { text: '$ nexora quantum-scan --entity nhi:cert:api-gateway', delay: 0 },
      { text: '', delay: 500 },
      { text: '[Analyzing cryptographic posture... ████████████ 100%]', delay: 1000 },
      { text: '', delay: 1500 },
      { text: '🔮 QUANTUM VULNERABILITY DETECTED', delay: 2000, color: 'text-nexora-quantum' },
      { text: '', delay: 2100 },
      { text: 'Entity: nhi:cert:api-gateway', delay: 2200 },
      { text: 'Quantum Risk Score: 0.78 (HIGH)', delay: 2400, color: 'text-nexora-quantum' },
      { text: '', delay: 2500 },
      { text: 'Vulnerabilities:', delay: 2600 },
      { text: '• Algorithm: RSA-2048 (vulnerable to Shor\'s algorithm)', delay: 2800 },
      { text: '• Harvest risk: Certificate valid until 2027 (Q-day estimate: 2030)', delay: 3000 },
      { text: '• Exposure: 847 TLS sessions captured in last 30 days', delay: 3200 },
      { text: '', delay: 3300 },
      { text: '[Quantum-Safe Migration Available]', delay: 3500, color: 'text-nexora-ai' },
      { text: '✓ CRYSTALS-Kyber hybrid mode ready', delay: 3800, color: 'text-nexora-ai' },
      { text: '✓ Migration plan generated (zero-downtime)', delay: 4000, color: 'text-nexora-ai' },
      { text: '✓ Estimated migration time: 4 hours', delay: 4200, color: 'text-nexora-ai' },
      { text: '✓ Compliance: NIST SP 800-208 compliant', delay: 4400, color: 'text-nexora-ai' },
      { text: '', delay: 4500 },
      { text: '$ _', delay: 4600, blink: true }
    ]
  }
];

export function TerminalDemo() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [displayedLines, setDisplayedLines] = useState<typeof selectedScenario.steps>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const step = selectedScenario.steps[currentStep];
    if (!step) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLines(prev => [...prev, step]);
      setCurrentStep(prev => prev + 1);
    }, step.delay);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, selectedScenario]);

  const handlePlay = () => {
    setDisplayedLines([]);
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setDisplayedLines([]);
    setCurrentStep(0);
  };

  const handleScenarioChange = (scenario: typeof scenarios[0]) => {
    setSelectedScenario(scenario);
    handleReset();
  };

  return (
    <section className="py-20 px-6 bg-bg-deep/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            See Nexora in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience real-time threat detection and autonomous remediation. No login required.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {scenarios.map((scenario) => (
            <Button
              key={scenario.id}
              variant={selectedScenario.id === scenario.id ? 'default' : 'outline'}
              onClick={() => handleScenarioChange(scenario)}
              disabled={isPlaying}
              className="text-sm"
            >
              {scenario.name}
            </Button>
          ))}
        </div>

        {/* Terminal */}
        <Card className="bg-[#0A0E1A] border-nexora-primary/20 overflow-hidden shadow-2xl">
          {/* Terminal Header */}
          <div className="bg-bg-elevated border-b border-border/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-nexora-threat"></div>
              <div className="w-3 h-3 rounded-full bg-nexora-warning"></div>
              <div className="w-3 h-3 rounded-full bg-nexora-ai"></div>
              <span className="ml-4 text-sm text-muted-foreground font-mono">
                nexora-cli v2.1.0
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlay}
                disabled={isPlaying}
                className="h-8"
              >
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 font-mono text-sm min-h-[500px] max-h-[600px] overflow-y-auto">
            {displayedLines.length === 0 && !isPlaying && (
              <div className="text-muted-foreground">
                <p className="mb-2">$ # Select a scenario above and click &quot;Run&quot; to see Nexora in action</p>
                <p className="mb-2">$ # Watch as threats are detected and automatically remediated</p>
                <p className="text-nexora-primary animate-pulse">$ _</p>
              </div>
            )}
            {displayedLines.map((line, index) => (
              <div
                key={index}
                className={`mb-1 ${line.color || 'text-foreground'} ${
                  line.blink ? 'animate-pulse' : ''
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        </Card>

        {/* Info Text */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            This is a simulated demonstration. Real Nexora deployments process 100K+ events/second with &lt;100ms detection latency.
          </p>
        </div>
      </div>
    </section>
  );
}
