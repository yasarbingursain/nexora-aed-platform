-- GDPR Privacy Schema
CREATE SCHEMA IF NOT EXISTS privacy;

CREATE TABLE IF NOT EXISTS privacy.dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'erasure', 'portability')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  lawful_basis TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  result_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_dsar_org ON privacy.dsar_requests(organization_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_user ON privacy.dsar_requests(user_id, status);

CREATE TABLE IF NOT EXISTS privacy.ropa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  processing_activity TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL,
  recipients TEXT[],
  retention_period TEXT,
  security_measures TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ropa_org ON privacy.ropa(organization_id);

CREATE TABLE IF NOT EXISTS privacy.retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  data_category TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  legal_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy.breach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  breach_detected_at TIMESTAMPTZ NOT NULL,
  breach_type TEXT NOT NULL,
  affected_records INTEGER,
  regulator_notified_at TIMESTAMPTZ,
  individuals_notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_org ON privacy.breach_notifications(organization_id, breach_detected_at DESC);

CREATE TABLE IF NOT EXISTS privacy.pseudonymization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pseudonymized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  performed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pseudo_org ON privacy.pseudonymization_log(organization_id, pseudonymized_at DESC);

CREATE OR REPLACE FUNCTION privacy.pseudo(val TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'REDACTED_' || encode(digest(val, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
