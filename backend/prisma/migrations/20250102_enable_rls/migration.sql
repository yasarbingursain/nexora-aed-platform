-- Sprint 2: Row-Level Security (RLS) Implementation
-- Security: Multi-tenant data isolation at database level
-- Prevents cross-tenant data leakage even with SQL injection

-- Enable RLS on all multi-tenant tables
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for identities table
CREATE POLICY tenant_isolation_identities ON identities
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::TEXT);

CREATE POLICY tenant_isolation_identity_activities ON identity_activities
  FOR ALL
  USING (
    "identityId" IN (
      SELECT id FROM identities 
      WHERE "organizationId" = current_setting('app.current_organization_id', true)::TEXT
    )
  );

CREATE POLICY tenant_isolation_threats ON threats
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::TEXT);

CREATE POLICY tenant_isolation_baselines ON baselines
  FOR ALL
  USING (
    "identityId" IN (
      SELECT id FROM identities 
      WHERE "organizationId" = current_setting('app.current_organization_id', true)::TEXT
    )
  );

CREATE POLICY tenant_isolation_observations ON observations
  FOR ALL
  USING (
    "identityId" IN (
      SELECT id FROM identities 
      WHERE "organizationId" = current_setting('app.current_organization_id', true)::TEXT
    )
  );

CREATE POLICY tenant_isolation_playbooks ON playbooks
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::TEXT);

CREATE POLICY tenant_isolation_actions ON actions
  FOR ALL
  USING (
    "playbookId" IN (
      SELECT id FROM playbooks 
      WHERE "organizationId" = current_setting('app.current_organization_id', true)::TEXT
    )
  );

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::TEXT);

CREATE POLICY tenant_isolation_compliance_reports ON compliance_reports
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::TEXT);

-- Create function to set organization context
CREATE OR REPLACE FUNCTION set_current_organization(org_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_current_organization(TEXT) TO PUBLIC;

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_identities_org_id ON identities("organizationId");
CREATE INDEX IF NOT EXISTS idx_threats_org_id ON threats("organizationId");
CREATE INDEX IF NOT EXISTS idx_playbooks_org_id ON playbooks("organizationId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs("organizationId");
CREATE INDEX IF NOT EXISTS idx_compliance_reports_org_id ON compliance_reports("organizationId");
