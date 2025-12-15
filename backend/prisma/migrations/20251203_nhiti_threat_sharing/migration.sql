-- NHITI (Non-Human Identity Threat Intelligence) Network Schema
-- Standards: STIX 2.1, TAXII 2.1, GDPR Article 25 (Privacy by Design)
-- Security: K-Anonymity, Differential Privacy, Zero-Knowledge Proofs

-- Ensure pgcrypto is available for cryptographic hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- NHITI Shared Indicators Table
CREATE TABLE "nhiti_indicators" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  
  -- Privacy-Preserving Identifier (SHA-256 hash of IOC)
  "indicator_hash" TEXT NOT NULL UNIQUE,
  
  -- STIX 2.1 Indicator Type
  "ioc_type" TEXT NOT NULL, -- ipv4-addr, domain-name, file-hash, email-addr, url
  
  -- Threat Classification (MITRE ATT&CK aligned)
  "threat_category" TEXT NOT NULL, -- malware, phishing, c2, exfiltration, etc.
  
  -- Risk Assessment
  "severity" TEXT NOT NULL CHECK ("severity" IN ('low', 'medium', 'high', 'critical')),
  "confidence" DECIMAL(3,2) NOT NULL CHECK ("confidence" >= 0 AND "confidence" <= 1),
  "risk_score" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  
  -- K-Anonymity Tracking (minimum K=5 organizations)
  "contributing_orgs" TEXT[] NOT NULL DEFAULT '{}',
  "observation_count" INTEGER NOT NULL DEFAULT 1,
  
  -- Differential Privacy Metadata
  "epsilon" DECIMAL(5,3) NOT NULL DEFAULT 0.1, -- Privacy budget
  "noise_applied" BOOLEAN NOT NULL DEFAULT false,
  
  -- Temporal Data
  "first_seen" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_seen" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ttl_hours" INTEGER NOT NULL DEFAULT 168, -- 7 days default
  "expires_at" TIMESTAMP,
  
  -- STIX 2.1 Extensions
  "stix_id" TEXT, -- STIX identifier format: indicator--<uuid>
  "stix_version" TEXT DEFAULT '2.1',
  "pattern" TEXT, -- STIX pattern language
  "pattern_type" TEXT DEFAULT 'stix',
  
  -- Metadata (JSONB for extensibility)
  "metadata" JSONB NOT NULL DEFAULT '{}',
  
  -- Audit Trail
  "shared_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT "nhiti_indicators_k_anonymity_check" CHECK (array_length("contributing_orgs", 1) >= 1)
);

-- NHITI Organization Participation (Privacy-Preserving)
CREATE TABLE "nhiti_participation" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  
  -- Anonymous Organization Identifier (hashed)
  "org_hash" TEXT NOT NULL,
  
  -- Participation Metrics
  "indicators_shared" INTEGER NOT NULL DEFAULT 0,
  "indicators_consumed" INTEGER NOT NULL DEFAULT 0,
  "reputation_score" DECIMAL(5,2) NOT NULL DEFAULT 50.0,
  
  -- Privacy Settings
  "k_threshold" INTEGER NOT NULL DEFAULT 5,
  "epsilon_budget" DECIMAL(5,3) NOT NULL DEFAULT 0.1,
  "enable_differential_privacy" BOOLEAN NOT NULL DEFAULT true,
  
  -- Temporal
  "joined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_active" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE("org_hash")
);

-- NHITI Query Log (for audit and abuse detection)
CREATE TABLE "nhiti_query_log" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  
  -- Requester (hashed for privacy)
  "requester_hash" TEXT NOT NULL,
  
  -- Query Details
  "query_type" TEXT NOT NULL, -- feed, query_ioc, share
  "query_params" JSONB NOT NULL DEFAULT '{}',
  "results_count" INTEGER NOT NULL DEFAULT 0,
  
  -- Rate Limiting & Abuse Detection
  "ip_hash" TEXT, -- Hashed IP for rate limiting
  "user_agent_hash" TEXT,
  
  -- Temporal
  "queried_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Retention: 90 days for compliance
  "expires_at" TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

-- Indexes for Performance
CREATE INDEX "idx_nhiti_indicators_hash" ON "nhiti_indicators"("indicator_hash");
CREATE INDEX "idx_nhiti_indicators_type" ON "nhiti_indicators"("ioc_type");
CREATE INDEX "idx_nhiti_indicators_category" ON "nhiti_indicators"("threat_category");
CREATE INDEX "idx_nhiti_indicators_severity" ON "nhiti_indicators"("severity");
CREATE INDEX "idx_nhiti_indicators_last_seen" ON "nhiti_indicators"("last_seen" DESC);
CREATE INDEX "idx_nhiti_indicators_k_anon" ON "nhiti_indicators"(array_length("contributing_orgs", 1));

CREATE INDEX "idx_nhiti_participation_org" ON "nhiti_participation"("org_hash");
CREATE INDEX "idx_nhiti_participation_reputation" ON "nhiti_participation"("reputation_score" DESC);

CREATE INDEX "idx_nhiti_query_log_requester" ON "nhiti_query_log"("requester_hash");
CREATE INDEX "idx_nhiti_query_log_time" ON "nhiti_query_log"("queried_at" DESC);
CREATE INDEX "idx_nhiti_query_log_ip" ON "nhiti_query_log"("ip_hash");

-- Automatic Cleanup of Expired Indicators
CREATE OR REPLACE FUNCTION cleanup_expired_nhiti_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM "nhiti_indicators"
  WHERE "expires_at" IS NOT NULL AND "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Automatic Cleanup of Old Query Logs (GDPR Compliance)
CREATE OR REPLACE FUNCTION cleanup_nhiti_query_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM "nhiti_query_log"
  WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row-Level Security (RLS) for NHITI
ALTER TABLE "nhiti_indicators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nhiti_participation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nhiti_query_log" ENABLE ROW LEVEL SECURITY;

-- Policy: Only shared indicators (K >= threshold) are visible
CREATE POLICY "nhiti_k_anonymity_policy" ON "nhiti_indicators"
  FOR SELECT
  USING (array_length("contributing_orgs", 1) >= 5);

-- Policy: Organizations can only see their own participation data
CREATE POLICY "nhiti_participation_isolation" ON "nhiti_participation"
  FOR ALL
  USING (
    "org_hash" = encode(
      digest(
        current_setting('app.current_organization_id', true)::bytea,
        'sha256'::text
      ),
      'hex'
    )
  );

-- Comments for Documentation
COMMENT ON TABLE "nhiti_indicators" IS 'NHITI shared threat indicators with k-anonymity and differential privacy';
COMMENT ON COLUMN "nhiti_indicators"."indicator_hash" IS 'SHA-256 hash of IOC value for privacy preservation';
COMMENT ON COLUMN "nhiti_indicators"."contributing_orgs" IS 'Array of hashed organization IDs (minimum K=5 for sharing)';
COMMENT ON COLUMN "nhiti_indicators"."epsilon" IS 'Differential privacy budget (lower = more privacy)';
COMMENT ON TABLE "nhiti_participation" IS 'Anonymous organization participation metrics';
COMMENT ON TABLE "nhiti_query_log" IS 'Audit log for NHITI queries (90-day retention)';
