-- OCSF-Compliant Threat Events Schema
-- Open Cybersecurity Schema Framework (OCSF) v1.1.0
-- Category: Finding (3), Class: Threat Finding (3001)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS threat_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core IOC Identity
    external_id         TEXT NOT NULL UNIQUE,
    source              TEXT NOT NULL,
    indicator_type      TEXT NOT NULL,
    value               TEXT NOT NULL,
    
    -- OCSF Category/Class/Type
    category_uid        INTEGER NOT NULL DEFAULT 3,
    category_name       TEXT NOT NULL DEFAULT 'Finding',
    class_uid           INTEGER NOT NULL DEFAULT 3001,
    class_name          TEXT NOT NULL DEFAULT 'Threat Finding',
    type_uid            INTEGER NOT NULL DEFAULT 300101,
    type_name           TEXT NOT NULL DEFAULT 'OSINT Threat Finding',
    
    -- OCSF Activity & Status
    activity_id         INTEGER NOT NULL DEFAULT 1,
    activity_name       TEXT NOT NULL DEFAULT 'Detected',
    severity_id         INTEGER NOT NULL,
    severity            TEXT NOT NULL,
    status_id           INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'New',
    
    -- Risk Assessment
    risk_score          NUMERIC(5,2) NOT NULL,
    risk_label          TEXT NOT NULL,
    confidence          NUMERIC(3,2),
    
    -- Threat Details
    description         TEXT,
    sightings           INTEGER DEFAULT 1,
    tags                TEXT[],
    
    -- Geolocation
    country_code        TEXT,
    country_name        TEXT,
    city                TEXT,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    
    -- Temporal Data
    first_seen          TIMESTAMPTZ NOT NULL,
    last_seen           TIMESTAMPTZ NOT NULL,
    expires_at          TIMESTAMPTZ,
    
    -- OCSF Entity Fields (JSONB for flexibility)
    actor               JSONB,
    resource            JSONB,
    metadata            JSONB,
    finding_info        JSONB,
    observables         JSONB,
    
    -- Multi-tenancy
    organization_id     TEXT,
    
    -- Audit Fields
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_risk_label CHECK (risk_label IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_indicator_type CHECK (indicator_type IN ('ipv4', 'ipv6', 'domain', 'url', 'hash', 'email', 'other'))
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_threat_events_value ON threat_events (value);
CREATE INDEX IF NOT EXISTS idx_threat_events_indicator_type ON threat_events (indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_events_source ON threat_events (source);
CREATE INDEX IF NOT EXISTS idx_threat_events_severity ON threat_events (severity);
CREATE INDEX IF NOT EXISTS idx_threat_events_risk_score ON threat_events (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_last_seen ON threat_events (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_organization ON threat_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_status ON threat_events (status_id, status);
CREATE INDEX IF NOT EXISTS idx_threat_events_geo ON threat_events (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threat_events_tags ON threat_events USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_threat_events_actor ON threat_events USING GIN (actor);
CREATE INDEX IF NOT EXISTS idx_threat_events_resource ON threat_events USING GIN (resource);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_threat_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_threat_events_updated_at
    BEFORE UPDATE ON threat_events
    FOR EACH ROW
    EXECUTE FUNCTION update_threat_events_updated_at();

-- Comments for Documentation
COMMENT ON TABLE threat_events IS 'OCSF-compliant threat intelligence events from OSINT sources';
COMMENT ON COLUMN threat_events.external_id IS 'Unique identifier from source (e.g., otx-12345, censys-67890)';
COMMENT ON COLUMN threat_events.category_uid IS 'OCSF Category UID: 3 = Finding';
COMMENT ON COLUMN threat_events.class_uid IS 'OCSF Class UID: 3001 = Threat Finding';
COMMENT ON COLUMN threat_events.type_uid IS 'OCSF Type UID: 300101 = OSINT Threat Finding';
COMMENT ON COLUMN threat_events.actor IS 'OCSF Actor object: threat actor or OSINT feed metadata';
COMMENT ON COLUMN threat_events.resource IS 'OCSF Resource object: affected asset/entity (IP/domain/URL)';
COMMENT ON COLUMN threat_events.metadata IS 'OCSF Metadata object: product info, version, vendor';
COMMENT ON COLUMN threat_events.finding_info IS 'OCSF Finding Info: title, description, timestamps';
