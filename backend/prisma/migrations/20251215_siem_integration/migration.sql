-- SIEM Integration Configuration Table
-- Stores per-organization SIEM integration settings
-- Nexora AED Platform - Enterprise SIEM Compatibility

-- SIEM Configuration Table
CREATE TABLE IF NOT EXISTS siem_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL,
    
    -- Provider Type
    provider VARCHAR(50) NOT NULL, -- splunk, sentinel, elastic, qradar, syslog
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status
    enabled BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    
    -- Connection Settings (encrypted JSON)
    connection_config JSONB NOT NULL DEFAULT '{}',
    
    -- Format Settings
    format VARCHAR(20) DEFAULT 'cef', -- cef, leef, json, syslog
    
    -- Batching Settings
    batch_size INTEGER DEFAULT 50,
    flush_interval_ms INTEGER DEFAULT 10000,
    
    -- Filtering
    severity_filter VARCHAR(20)[], -- Only forward events of these severities
    category_filter VARCHAR(100)[], -- Only forward events of these categories
    
    -- Health & Stats
    last_successful_send TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    events_sent_total BIGINT DEFAULT 0,
    events_failed_total BIGINT DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    CONSTRAINT fk_siem_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT unique_siem_provider_per_org UNIQUE (organization_id, provider, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_siem_config_org ON siem_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_siem_config_provider ON siem_configurations(provider);
CREATE INDEX IF NOT EXISTS idx_siem_config_enabled ON siem_configurations(enabled);

-- SIEM Event Log Table (for audit and replay)
CREATE TABLE IF NOT EXISTS siem_event_log (
    id BIGSERIAL PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    configuration_id UUID,
    
    -- Event Details
    event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    
    -- Formatted Output
    format VARCHAR(20) NOT NULL,
    formatted_event TEXT NOT NULL,
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, retrying
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Error Tracking
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_siem_log_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_siem_log_config FOREIGN KEY (configuration_id) 
        REFERENCES siem_configurations(id) ON DELETE SET NULL
);

-- Indexes for event log
CREATE INDEX IF NOT EXISTS idx_siem_log_org ON siem_event_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_siem_log_status ON siem_event_log(status);
CREATE INDEX IF NOT EXISTS idx_siem_log_created ON siem_event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siem_log_event_id ON siem_event_log(event_id);

-- Partition by month for large deployments (optional, commented out for SQLite compatibility)
-- CREATE INDEX IF NOT EXISTS idx_siem_log_partition ON siem_event_log(created_at, organization_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_siem_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_siem_config_updated_at ON siem_configurations;
CREATE TRIGGER trigger_siem_config_updated_at
    BEFORE UPDATE ON siem_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_siem_config_updated_at();

-- Auto-cleanup old event logs (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_siem_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM siem_event_log 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status = 'sent';
END;
$$ LANGUAGE plpgsql;
