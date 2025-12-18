-- OSINT Threat Events Table
-- Stores threat intelligence data from AlienVault OTX, Censys, and other sources

CREATE TABLE IF NOT EXISTS threat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(50) NOT NULL,
    indicator_type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    
    -- OCSF Classification
    category_uid INTEGER,
    category_name VARCHAR(100),
    class_uid INTEGER,
    class_name VARCHAR(100),
    type_uid INTEGER,
    type_name VARCHAR(100),
    activity_id INTEGER,
    activity_name VARCHAR(100),
    
    -- Severity & Status
    severity_id INTEGER DEFAULT 1,
    severity VARCHAR(20) DEFAULT 'low',
    status_id INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'new',
    
    -- Risk Assessment
    risk_score DECIMAL(5,2) DEFAULT 0,
    risk_label VARCHAR(20) DEFAULT 'low',
    confidence DECIMAL(5,2),
    
    -- Description & Tags
    description TEXT,
    sightings INTEGER DEFAULT 1,
    tags TEXT[],
    
    -- Geolocation
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- Timestamps
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- OCSF Extended Fields (JSON)
    actor JSONB,
    resource JSONB,
    metadata JSONB,
    finding_info JSONB,
    observables JSONB,
    
    -- Multi-tenancy
    organization_id VARCHAR(255),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_threat_events_source ON threat_events(source);
CREATE INDEX IF NOT EXISTS idx_threat_events_severity ON threat_events(severity);
CREATE INDEX IF NOT EXISTS idx_threat_events_risk_score ON threat_events(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_last_seen ON threat_events(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_indicator_type ON threat_events(indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_events_country ON threat_events(country_code);
CREATE INDEX IF NOT EXISTS idx_threat_events_org ON threat_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_geo ON threat_events(latitude, longitude) WHERE latitude IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_threat_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_threat_events_updated_at ON threat_events;
CREATE TRIGGER trigger_threat_events_updated_at
    BEFORE UPDATE ON threat_events
    FOR EACH ROW
    EXECUTE FUNCTION update_threat_events_updated_at();
