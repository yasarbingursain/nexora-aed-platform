-- Sprint 2 Enhancements Migration
-- Date: December 15, 2024
-- Features: Explainable AI, Workflow Remediation, Enhanced Compliance

-- ============================================================================
-- WORKFLOW EXECUTION TABLE
-- Tracks multi-step workflow executions with approval gates
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(255) PRIMARY KEY,
    workflow_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_step_index INTEGER NOT NULL DEFAULT 0,
    context JSONB NOT NULL DEFAULT '{}',
    step_results JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    triggered_by VARCHAR(255) NOT NULL,
    target_identity_id VARCHAR(255),
    target_threat_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_workflow_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_playbook FOREIGN KEY (workflow_id) 
        REFERENCES playbooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_exec_org ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_exec_status ON workflow_executions(status);
CREATE INDEX idx_workflow_exec_workflow ON workflow_executions(workflow_id);

-- ============================================================================
-- WORKFLOW APPROVALS TABLE
-- Tracks approval requests and responses for workflow steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id VARCHAR(255) PRIMARY KEY,
    execution_id VARCHAR(255) NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    required_approvers INTEGER NOT NULL DEFAULT 1,
    approver_roles TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    escalation_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_exec FOREIGN KEY (execution_id) 
        REFERENCES workflow_executions(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_exec ON workflow_approvals(execution_id);
CREATE INDEX idx_approval_status ON workflow_approvals(status);
CREATE INDEX idx_approval_expires ON workflow_approvals(expires_at);

-- ============================================================================
-- APPROVAL RESPONSES TABLE
-- Individual approver responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_responses (
    id VARCHAR(255) PRIMARY KEY,
    approval_id VARCHAR(255) NOT NULL,
    approver_id VARCHAR(255) NOT NULL,
    approver_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_response_approval FOREIGN KEY (approval_id) 
        REFERENCES workflow_approvals(id) ON DELETE CASCADE
);

CREATE INDEX idx_response_approval ON approval_responses(approval_id);

-- ============================================================================
-- AI EXPLANATIONS TABLE
-- Stores SHAP/LIME explanations for ML predictions (GDPR Article 22)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_explanations (
    id VARCHAR(255) PRIMARY KEY,
    prediction_id VARCHAR(255) NOT NULL,
    identity_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    
    -- Explanation Methods
    shap_explanation JSONB,
    lime_explanation JSONB,
    counterfactual_explanation JSONB,
    
    -- Human-Readable
    human_readable JSONB NOT NULL,
    
    -- Model Info
    model_version VARCHAR(100) NOT NULL,
    feature_count INTEGER NOT NULL,
    
    -- GDPR Compliance
    gdpr_disclosure TEXT NOT NULL,
    human_review_requested BOOLEAN NOT NULL DEFAULT FALSE,
    human_review_ticket_id VARCHAR(255),
    
    -- Audit
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    audit_id VARCHAR(255),
    
    CONSTRAINT fk_explanation_prediction FOREIGN KEY (prediction_id) 
        REFERENCES ml_predictions(id) ON DELETE CASCADE,
    CONSTRAINT fk_explanation_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_explanation_prediction ON ai_explanations(prediction_id);
CREATE INDEX idx_explanation_identity ON ai_explanations(identity_id);
CREATE INDEX idx_explanation_org ON ai_explanations(organization_id);
CREATE INDEX idx_explanation_review ON ai_explanations(human_review_requested);

-- ============================================================================
-- COMPLIANCE ASSESSMENTS TABLE
-- Detailed control assessments for compliance reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_assessments (
    id VARCHAR(255) PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    
    -- Control Info
    control_id VARCHAR(100) NOT NULL,
    control_name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Assessment
    status VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    
    -- Evidence & Findings
    evidence JSONB NOT NULL DEFAULT '[]',
    findings JSONB NOT NULL DEFAULT '[]',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    
    -- Temporal
    assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_assessment_report FOREIGN KEY (report_id) 
        REFERENCES compliance_reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_assessment_report ON compliance_assessments(report_id);
CREATE INDEX idx_assessment_control ON compliance_assessments(control_id);
CREATE INDEX idx_assessment_status ON compliance_assessments(status);

-- ============================================================================
-- COMPLIANCE EVIDENCE TABLE
-- Evidence items collected for compliance controls
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_evidence (
    id VARCHAR(255) PRIMARY KEY,
    assessment_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    
    -- Evidence Details
    evidence_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    
    -- Integrity
    content_hash VARCHAR(64) NOT NULL,
    
    -- Temporal
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_evidence_assessment FOREIGN KEY (assessment_id) 
        REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidence_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_assessment ON compliance_evidence(assessment_id);
CREATE INDEX idx_evidence_type ON compliance_evidence(evidence_type);
CREATE INDEX idx_evidence_hash ON compliance_evidence(content_hash);

-- ============================================================================
-- THREAT INTELLIGENCE FEEDS TABLE
-- Configuration for external threat intelligence sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS threat_intel_feeds (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255),
    
    -- Feed Configuration
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    feed_type VARCHAR(50) NOT NULL,
    url VARCHAR(500),
    api_key_encrypted VARCHAR(500),
    
    -- Settings
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    polling_interval_minutes INTEGER NOT NULL DEFAULT 60,
    confidence_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    
    -- Status
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),
    last_sync_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_feed_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_feed_org ON threat_intel_feeds(organization_id);
CREATE INDEX idx_feed_provider ON threat_intel_feeds(provider);
CREATE INDEX idx_feed_enabled ON threat_intel_feeds(enabled);

-- ============================================================================
-- IOC CORRELATIONS TABLE
-- Tracks correlations between indicators of compromise
-- ============================================================================

CREATE TABLE IF NOT EXISTS ioc_correlations (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255),
    
    -- Primary IOC
    primary_ioc_hash VARCHAR(64) NOT NULL,
    primary_ioc_type VARCHAR(50) NOT NULL,
    
    -- Related IOC
    related_ioc_hash VARCHAR(64) NOT NULL,
    related_ioc_type VARCHAR(50) NOT NULL,
    
    -- Correlation Details
    correlation_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}',
    
    -- Campaign Attribution
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    
    -- Temporal
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_correlation_org FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_correlation_primary ON ioc_correlations(primary_ioc_hash);
CREATE INDEX idx_correlation_related ON ioc_correlations(related_ioc_hash);
CREATE INDEX idx_correlation_campaign ON ioc_correlations(campaign_id);

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Add workflow execution fields to actions table
ALTER TABLE actions ADD COLUMN IF NOT EXISTS workflow_execution_id VARCHAR(255);
ALTER TABLE actions ADD COLUMN IF NOT EXISTS step_index INTEGER;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50);

-- Add explanation reference to ml_predictions if not exists
-- (explanation field already exists as JSONB)

-- Add compliance score to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_compliance_scan TIMESTAMP WITH TIME ZONE;

-- Add threat intel enrichment fields to threats
ALTER TABLE threats ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}';
ALTER TABLE threats ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE threats ADD COLUMN IF NOT EXISTS enrichment_sources TEXT[] DEFAULT '{}';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intel_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioc_correlations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY workflow_exec_org_policy ON workflow_executions
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY workflow_approval_org_policy ON workflow_approvals
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY ai_explanation_org_policy ON ai_explanations
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY compliance_assessment_org_policy ON compliance_assessments
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY compliance_evidence_org_policy ON compliance_evidence
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY threat_feed_org_policy ON threat_intel_feeds
    FOR ALL USING (organization_id IS NULL OR organization_id = current_setting('app.current_organization_id', true));

CREATE POLICY ioc_correlation_org_policy ON ioc_correlations
    FOR ALL USING (organization_id IS NULL OR organization_id = current_setting('app.current_organization_id', true));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflow_executions IS 'Multi-step workflow execution tracking with approval gates';
COMMENT ON TABLE workflow_approvals IS 'Approval requests for workflow steps requiring human authorization';
COMMENT ON TABLE approval_responses IS 'Individual approver responses to approval requests';
COMMENT ON TABLE ai_explanations IS 'GDPR Article 22 compliant AI/ML prediction explanations';
COMMENT ON TABLE compliance_assessments IS 'Individual control assessments for compliance reports';
COMMENT ON TABLE compliance_evidence IS 'Evidence items collected for compliance control assessments';
COMMENT ON TABLE threat_intel_feeds IS 'External threat intelligence feed configurations';
COMMENT ON TABLE ioc_correlations IS 'Correlations between indicators of compromise for campaign tracking';
