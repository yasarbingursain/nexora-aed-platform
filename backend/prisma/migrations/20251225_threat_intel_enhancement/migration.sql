-- Migration: Enhance Threat model for external threat intelligence sources
-- Date: 2025-12-25
-- Purpose: Add support for NIST NVD, MITRE ATT&CK, and other external threat sources

-- Add new columns to threats table
ALTER TABLE "threats" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "threats" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "threats" ADD COLUMN IF NOT EXISTS "cvssScore" DOUBLE PRECISION;
ALTER TABLE "threats" ADD COLUMN IF NOT EXISTS "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "threats" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update description column to TEXT type for longer content
ALTER TABLE "threats" ALTER COLUMN "description" TYPE TEXT;

-- Update metadata column to TEXT type for larger JSON payloads
ALTER TABLE "threats" ALTER COLUMN "metadata" TYPE TEXT;

-- Create unique constraint for external threats
CREATE UNIQUE INDEX IF NOT EXISTS "threats_externalId_source_key" ON "threats"("externalId", "source");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "threats_source_idx" ON "threats"("source");
CREATE INDEX IF NOT EXISTS "threats_severity_idx" ON "threats"("severity");
CREATE INDEX IF NOT EXISTS "threats_lastSeen_idx" ON "threats"("lastSeen");
CREATE INDEX IF NOT EXISTS "threats_organizationId_status_idx" ON "threats"("organizationId", "status");

-- Update existing threats to have firstSeen and lastSeen values
UPDATE "threats" 
SET "firstSeen" = "detectedAt", 
    "lastSeen" = COALESCE("updatedAt", "detectedAt")
WHERE "firstSeen" IS NULL OR "lastSeen" IS NULL;

-- Add comment to table
COMMENT ON TABLE "threats" IS 'Threat intelligence from internal detection and external sources (NIST NVD, MITRE ATT&CK, URLhaus, etc.)';
COMMENT ON COLUMN "threats"."externalId" IS 'External identifier (CVE-ID, MITRE ATT&CK ID, etc.)';
COMMENT ON COLUMN "threats"."source" IS 'Threat source: NIST_NVD, MITRE_ATTCK, URLhaus, MalwareBazaar, ThreatFox, internal';
COMMENT ON COLUMN "threats"."cvssScore" IS 'CVSS score for vulnerabilities (0.0-10.0)';
COMMENT ON COLUMN "threats"."firstSeen" IS 'First time this threat was observed';
COMMENT ON COLUMN "threats"."lastSeen" IS 'Most recent observation of this threat';
