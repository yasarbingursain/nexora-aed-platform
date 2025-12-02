# Nexora Enterprise Demo V2

**Deterministic Digital Twin + Time-Warped Reality + Real Artifacts**

Version: 2.1.0  
Last Updated: November 5, 2025

## Overview

The Nexora Enterprise Demo V2 system provides a fully reproducible, offline-capable demonstration environment that showcases the Autonomous Entity Defense (AED) platform's capabilities without requiring live customer data or external dependencies.

### Key Features

- **100% Offline Capable**: Works without internet connectivity
- **Deterministic**: Same seed = same outcome every time
- **Provably Real**: Cryptographic artifacts with verifiable hash chains
- **Story-Led**: Clear narrative beats with "why flagged" and "what next"
- **Time-Warped**: 24-hour incident compressed to 8-12 minutes
- **Modular**: Switch scenarios live, adjust difficulty mid-demo

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Scenario Packs (YAML)                    │
│  • Morphing Agent  • Supply Chain  • Prompt Injection       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Scenario Engine                            │
│  • Seeded PRNG (deterministic)                              │
│  • Time-warp playback (144× speed)                          │
│  • Event emission on clock ticks                            │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│ Evidence       │ │ Demo API │ │ SIEM Export  │
│ Builder        │ │ (REST)   │ │ (Optional)   │
│ • OCSF JSON    │ │          │ │              │
│ • Hash chains  │ │          │ │              │
│ • Signatures   │ │          │ │              │
└────────────────┘ └──────────┘ └──────────────┘
         │               │
         └───────┬───────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Nexora UI)                            │
│  • WebSocket/SSE subscriptions                              │
│  • Director Panel (presenter-only)                          │
│  • Time scrubber & branch controls                          │
└─────────────────────────────────────────────────────────────┘
```

## Scenarios

### 1. Morphing Agent Escalation (Primary)

**Seed**: 1337  
**Duration**: 24 hours → 10 minutes  
**Difficulty**: Normal

Bot "billing-worker-03" gradually requests broader scopes with geovelocity spikes and tool use shifts.

**Key Events**:
- Geographic anomaly (Singapore access)
- Scope escalation attempt (admin:full)
- Tool pivot (AWS S3 access)
- Automated quarantine
- Deception honey-scope deployment
- Confirmed compromise
- Credential rotation

**Detections**:
- UEBA drift
- MITRE ATT&CK: T1078.004 (Valid Accounts: Cloud Accounts)
- OWASP LLM01 (Prompt Injection)

### 2. Supply Chain Drift

**Seed**: 4242  
**Duration**: 24 hours → 10 minutes  
**Difficulty**: Normal

New container image signed by first-time signer with vulnerable SBOM dependencies.

**Key Events**:
- First-time signer detection
- SBOM vulnerability scan (critical CVEs)
- Provenance anomaly
- 2-person approval required
- Image rollback
- SIEM notification

**Detections**:
- Supply chain compromise
- MITRE ATT&CK: T1195.002 (Supply Chain Compromise)
- Critical CVE-2024-5678 (OpenSSL 9.8)

### 3. Prompt Injection Tool Pivot

**Seed**: 7777  
**Duration**: 24 hours → 10 minutes  
**Difficulty**: Hard

LLM tool coerced to exfiltrate sensitive data via allowed connector.

**Key Events**:
- Prompt injection detection
- LLM firewall rule triggered
- Tool pivot attempt (GitHub Gist)
- DLP blocks sensitive data
- Evidence chain anchored
- Quarantine + deception
- NHITI indicator published

**Detections**:
- OWASP LLM01 (Prompt Injection)
- OWASP LLM07 (Insecure Plugin Design)
- MITRE ATT&CK: T1567.002 (Exfiltration Over Web Service)

## API Endpoints

### Get Available Scenarios

```http
GET /api/v1/demo/scenarios
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "morphing-agent",
      "name": "Morphing Agent Escalation",
      "description": "...",
      "duration": 24,
      "difficulty": "normal"
    }
  ]
}
```

### Load Scenario

```http
POST /api/v1/demo/scenario
Content-Type: application/json

{
  "id": "morphing-agent",
  "seed": 1337
}
```

### Control Playback

```http
POST /api/v1/demo/control
Content-Type: application/json

{
  "action": "play"
}
```

**Actions**: `play`, `pause`, `stop`, `rewind`, `jump`, `toggle_time_warp`, `branch`

### Get Playback State

```http
GET /api/v1/demo/playback
```

### Get Evidence Chain

```http
GET /api/v1/demo/evidence
```

### Verify Evidence

```http
GET /api/v1/demo/evidence/verify?anchor=8a12...&include_chain=true
```

### Export Demo Report

```http
GET /api/v1/demo/report
```

## Evidence Chain

Every event generates an OCSF-compliant evidence entry with:

- **Time**: ISO 8601 timestamp
- **Class UID**: OCSF class (2001 = Detection Finding)
- **Nexora Context**: Tenant, entity, scenario, seed
- **Detection**: Type, score, reason, MITRE/OWASP tags
- **Activity**: Source IP, geo, user agent, target resource
- **Hash**: SHA-256 of event data
- **Prev Hash**: Link to previous event (chain)
- **Signature**: Demo CA signature

### Example Evidence Event

```json
{
  "time": "2025-11-05T14:13:11Z",
  "class_uid": 2001,
  "nexora": {
    "tenant": "finserv-a",
    "entity": "billing-worker-03",
    "scenario": "morphing-agent",
    "seed": 1337
  },
  "detection": {
    "type": "morphing",
    "score": 0.87,
    "reason": ["peer divergence +3.1σ", "scope drift"],
    "mitre": "T1078.004"
  },
  "hash": "8a12...",
  "prev_hash": "2f71...",
  "signature": "demo-ca-1337"
}
```

## Director Controls

Presenter-only panel for demo management:

### Hotkeys

- **1**: Next beat
- **R**: Rotate token (simulate)
- **Q**: Quarantine entity
- **T**: Toggle time-warp (1× / 10× / 144×)
- **B**: Branch dialog
- **Space**: Play/Pause
- **←**: Rewind 5 minutes
- **→**: Fast forward

### Time Warp Rates

- **1×**: Real-time (24 hours = 24 hours)
- **10×**: 24 hours = 2.4 hours
- **144×**: 24 hours = 10 minutes (default)

## Verification

Every evidence event can be cryptographically verified:

```bash
# Verify single event
nexora-demo verify 8a12...

# Verify full chain
nexora-demo verify 8a12... --chain

# Export for buyer replay
nexora-demo export --format=json > demo-replay.json
```

## Deployment

### Docker

```bash
# Start demo system
docker run -p 8080:8080 nexora/demo:2.1

# With custom scenario
docker run -p 8080:8080 \
  -e DEMO_SCENARIO=morphing-agent \
  -e DEMO_SEED=1337 \
  nexora/demo:2.1
```

### Environment Variables

```bash
DEMO_MODE=true                    # Enable demo mode
DEMO_LIVE_ENRICHMENT=false        # Disable live feeds (default)
DEMO_SEED=1337                    # Override seed
DEMO_TIME_WARP_RATE=144           # Time warp multiplier
```

## Sales Enablement

### One-Liner Start

```bash
docker run -p 3000:3000 nexora/demo:2.1
```

### Show Scripts

Each scenario includes a 10-minute show flow:

1. **Morphing Agent** (10 min): Entity escalation → detection → remediation
2. **Supply Chain** (10 min): Vulnerable image → SBOM scan → rollback
3. **Prompt Injection** (10 min): LLM attack → DLP block → deception

### Leave-Behind

Provide buyers with:
- Demo replay bundle (`nexora-demo.tar.zst`)
- Verification CLI (`nexora-demo verify`)
- FAQ sheet (privacy, evidence, comparables)

## Performance

- **Demo start → first event**: ≤ 30s
- **Total run time**: 8-12 minutes (time-warped)
- **Zero external calls**: 100% offline
- **Repeatable**: Same seed = same outcome
- **Buyer replay**: ≤ 3 minutes (Docker)

## Compliance & Privacy

- **No Customer Data**: All content synthetic
- **Signed Evidence**: Demo CA with integrity verification
- **CSP/Trusted Types**: Security headers intact
- **Audit Trail**: Full event log exportable
- **GDPR/HIPAA**: Compliant data handling

## Development

### Adding New Scenarios

1. Create scenario file in `scenarios/`:

```typescript
// scenarios/my-scenario.ts
export const myScenario: ScenarioConfig = {
  id: 'my-scenario',
  name: 'My Scenario',
  seed: 9999,
  duration: 24,
  timeline: [
    // Define events...
  ],
};
```

2. Import in controller:

```typescript
import { myScenario } from '../demo/scenarios/my-scenario';
```

3. Add to scenario list in `getScenarios()` and `loadScenario()`.

### Testing

```bash
# Run scenario engine tests
npm test src/demo/engine.test.ts

# Verify determinism
npm run demo:verify-determinism

# Performance benchmarks
npm run demo:benchmark
```

## Troubleshooting

### Scenario Won't Load

- Check seed value (must be positive integer)
- Verify scenario ID matches exactly
- Ensure all timeline events have valid timestamps

### Events Not Emitting

- Confirm playback is in "playing" state
- Check time-warp rate (may be too slow)
- Verify scenario timeline has events

### Hash Chain Broken

- Evidence chain is immutable
- Restart scenario to reset chain
- Check for concurrent modifications

## Support

For issues or questions:
- **Documentation**: https://docs.nexora.com/demo
- **GitHub**: https://github.com/nexora/demo
- **Email**: demo-support@nexora.com

---

**Nexora – The First Autonomous Entity Defense Cloud**  
Securing AI agents, APIs, and machine identities in the quantum era.
