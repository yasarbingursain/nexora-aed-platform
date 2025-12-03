-- Threat Intelligence Ingestion Tracking Table
CREATE TABLE IF NOT EXISTS ingestion_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingestion_failures_source ON ingestion_failures(source);
CREATE INDEX idx_ingestion_failures_created_at ON ingestion_failures(created_at);
CREATE INDEX idx_ingestion_failures_resolved ON ingestion_failures(resolved_at) WHERE resolved_at IS NULL;

-- Threat Intelligence Statistics Table
CREATE TABLE IF NOT EXISTS threat_intel_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,
    count INTEGER NOT NULL,
    ingestion_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threat_intel_stats_source ON threat_intel_stats(source);
CREATE INDEX idx_threat_intel_stats_created_at ON threat_intel_stats(created_at);

-- Update trigger
CREATE OR REPLACE FUNCTION update_ingestion_failures_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ingestion_failures_timestamp
    BEFORE UPDATE ON ingestion_failures
    FOR EACH ROW
    EXECUTE FUNCTION update_ingestion_failures_timestamp();
