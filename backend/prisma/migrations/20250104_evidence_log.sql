-- Evidence Log with Hash Chain
CREATE SCHEMA IF NOT EXISTS security;

CREATE TABLE IF NOT EXISTS security.evidence_log (
  id BIGSERIAL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  changes JSONB,
  ip INET NOT NULL,
  ua TEXT,
  lawful_basis TEXT,
  retention_until DATE NOT NULL,
  prev_hash BYTEA,
  hash BYTEA,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE INDEX idx_evidence_log_org_ts ON security.evidence_log(org_id, ts DESC);

-- Create partitions
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', NOW());
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..12 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'evidence_log_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS security.%I PARTITION OF security.evidence_log FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    start_date := end_date;
  END LOOP;
END;
$$;

-- Hash chain trigger
CREATE OR REPLACE FUNCTION security.compute_evidence_hash()
RETURNS TRIGGER AS $$
BEGIN
  SELECT hash INTO NEW.prev_hash
  FROM security.evidence_log
  WHERE org_id = NEW.org_id
  ORDER BY id DESC
  LIMIT 1;
  
  NEW.hash := digest(
    COALESCE(NEW.prev_hash, '\x00'::bytea) ||
    NEW.ts::text::bytea ||
    NEW.org_id::text::bytea ||
    COALESCE(NEW.user_id::text::bytea, '\x00'::bytea) ||
    NEW.action::bytea ||
    NEW.resource::bytea ||
    COALESCE(NEW.resource_id::bytea, '\x00'::bytea) ||
    COALESCE(NEW.changes::text::bytea, '\x00'::bytea) ||
    NEW.ip::text::bytea,
    'sha256'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_hash
BEFORE INSERT ON security.evidence_log
FOR EACH ROW EXECUTE FUNCTION security.compute_evidence_hash();

-- Write-once enforcement
CREATE RULE evidence_no_update AS ON UPDATE TO security.evidence_log DO INSTEAD NOTHING;
CREATE RULE evidence_no_delete AS ON DELETE TO security.evidence_log DO INSTEAD NOTHING;
