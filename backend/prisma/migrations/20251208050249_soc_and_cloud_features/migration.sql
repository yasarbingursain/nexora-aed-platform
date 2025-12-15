/*
  Warnings:

  - A unique constraint covering the columns `[sessionToken]` on the table `user_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entityId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `user_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionToken` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- DropIndex
DROP INDEX "idx_nhiti_indicators_category";

-- DropIndex
DROP INDEX "idx_nhiti_indicators_hash";

-- DropIndex
DROP INDEX "idx_nhiti_indicators_last_seen";

-- DropIndex
DROP INDEX "idx_nhiti_indicators_severity";

-- DropIndex
DROP INDEX "idx_nhiti_indicators_type";

-- DropIndex
DROP INDEX "idx_nhiti_participation_org";

-- DropIndex
DROP INDEX "idx_nhiti_participation_reputation";

-- DropIndex
DROP INDEX "idx_nhiti_query_log_ip";

-- DropIndex
DROP INDEX "idx_nhiti_query_log_requester";

-- DropIndex
DROP INDEX "idx_nhiti_query_log_time";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "changes" TEXT,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "event" TEXT NOT NULL,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "result" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'medium',
ALTER COLUMN "ipAddress" DROP NOT NULL;

-- AlterTable
ALTER TABLE "nhiti_indicators" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "first_seen" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_seen" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "shared_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nhiti_participation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "joined_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_active" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nhiti_query_log" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "queried_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DEFAULT (NOW() + INTERVAL '90 days'),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastRefreshedAt" TIMESTAMP(3),
ADD COLUMN     "sessionToken" TEXT NOT NULL,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedLogin" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceIp" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "malware_samples" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "submission_type" TEXT NOT NULL,
    "file_hash_sha256" TEXT,
    "file_hash_md5" TEXT,
    "file_hash_sha1" TEXT,
    "file_name" TEXT,
    "file_size_bytes" BIGINT,
    "file_mime_type" TEXT,
    "url" TEXT,
    "source" TEXT,
    "tags" TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "submitted_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "analysis_started_at" TIMESTAMP(3),
    "analysis_completed_at" TIMESTAMP(3),
    "analysis_duration_ms" INTEGER,
    "category_uid" INTEGER NOT NULL DEFAULT 4,
    "category_name" TEXT NOT NULL DEFAULT 'Security Finding',
    "class_uid" INTEGER NOT NULL DEFAULT 4001,
    "class_name" TEXT NOT NULL DEFAULT 'Malware Finding',
    "type_uid" INTEGER NOT NULL DEFAULT 400101,
    "type_name" TEXT NOT NULL DEFAULT 'Malware Sample Analysis',
    "risk_score" DECIMAL(5,2),
    "risk_level" TEXT,
    "confidence_score" DECIMAL(3,2),
    "malware_family" TEXT,
    "malware_category" TEXT,
    "is_malicious" BOOLEAN,
    "false_positive" BOOLEAN NOT NULL DEFAULT false,
    "mitre_tactics" TEXT[],
    "mitre_techniques" TEXT[],
    "storage_location" TEXT,
    "retention_policy" TEXT NOT NULL DEFAULT 'standard',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "malware_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "malware_iocs" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ioc_type" TEXT NOT NULL,
    "ioc_value" TEXT NOT NULL,
    "extraction_method" TEXT NOT NULL,
    "context" TEXT,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "validation_method" TEXT,
    "threat_intel_sources" TEXT[],
    "reputation_score" DECIMAL(3,2),
    "is_known_malicious" BOOLEAN,
    "country_code" TEXT,
    "country_name" TEXT,
    "asn" TEXT,
    "asn_org" TEXT,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[],
    "threat_score" DECIMAL(3,2),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "malware_iocs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_failures" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "external_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "indicator_type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category_uid" INTEGER NOT NULL DEFAULT 3,
    "category_name" TEXT NOT NULL DEFAULT 'Finding',
    "class_uid" INTEGER NOT NULL DEFAULT 3001,
    "class_name" TEXT NOT NULL DEFAULT 'Threat Finding',
    "type_uid" INTEGER NOT NULL DEFAULT 300101,
    "type_name" TEXT NOT NULL DEFAULT 'OSINT Threat Finding',
    "activity_id" INTEGER NOT NULL DEFAULT 1,
    "activity_name" TEXT NOT NULL DEFAULT 'Detected',
    "severity_id" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "status_id" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'New',
    "risk_score" DECIMAL(5,2) NOT NULL,
    "risk_label" TEXT NOT NULL,
    "confidence" DECIMAL(3,2),
    "description" TEXT,
    "sightings" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "country_code" TEXT,
    "country_name" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "first_seen" TIMESTAMP(3) NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "actor" JSONB,
    "resource" JSONB,
    "metadata" JSONB,
    "finding_info" JSONB,
    "observables" JSONB,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_log" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "prev_hash" TEXT,
    "row_hash" TEXT NOT NULL,
    "retention_until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_lineage" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "parent_identity_id" TEXT,
    "relationship" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_lineage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "honey_tokens" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deployment_location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "first_triggered_at" TIMESTAMP(3),
    "last_triggered_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "honey_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "honey_token_alerts" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "source_ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "request_path" TEXT,
    "request_method" TEXT,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "honey_token_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_rollbacks" (
    "id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "rollback_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remediation_rollbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_predictions" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "is_anomaly" BOOLEAN NOT NULL,
    "anomaly_score" DOUBLE PRECISION NOT NULL,
    "risk_level" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "features" JSONB NOT NULL,
    "contributing_factors" TEXT[],
    "explanation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forensic_timeline_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "evidence_hash" TEXT,
    "mitre_mapping" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forensic_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "malware_iocs_sample_id_ioc_type_ioc_value_key" ON "malware_iocs"("sample_id", "ioc_type", "ioc_value");

-- CreateIndex
CREATE UNIQUE INDEX "threat_events_external_id_key" ON "threat_events"("external_id");

-- CreateIndex
CREATE INDEX "evidence_log_organization_id_ts_idx" ON "evidence_log"("organization_id", "ts");

-- CreateIndex
CREATE INDEX "evidence_log_resource_type_resource_id_idx" ON "evidence_log"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "evidence_log_actor_idx" ON "evidence_log"("actor");

-- CreateIndex
CREATE INDEX "identity_lineage_identity_id_idx" ON "identity_lineage"("identity_id");

-- CreateIndex
CREATE INDEX "identity_lineage_parent_identity_id_idx" ON "identity_lineage"("parent_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "honey_tokens_token_hash_key" ON "honey_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "honey_tokens_organization_id_status_idx" ON "honey_tokens"("organization_id", "status");

-- CreateIndex
CREATE INDEX "honey_tokens_token_hash_idx" ON "honey_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "honey_token_alerts_token_id_idx" ON "honey_token_alerts"("token_id");

-- CreateIndex
CREATE INDEX "honey_token_alerts_source_ip_idx" ON "honey_token_alerts"("source_ip");

-- CreateIndex
CREATE INDEX "remediation_rollbacks_action_id_idx" ON "remediation_rollbacks"("action_id");

-- CreateIndex
CREATE INDEX "remediation_rollbacks_status_idx" ON "remediation_rollbacks"("status");

-- CreateIndex
CREATE INDEX "ml_predictions_identity_id_idx" ON "ml_predictions"("identity_id");

-- CreateIndex
CREATE INDEX "ml_predictions_organization_id_created_at_idx" ON "ml_predictions"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "ml_predictions_is_anomaly_idx" ON "ml_predictions"("is_anomaly");

-- CreateIndex
CREATE INDEX "forensic_timeline_events_organization_id_timestamp_idx" ON "forensic_timeline_events"("organization_id", "timestamp");

-- CreateIndex
CREATE INDEX "forensic_timeline_events_category_idx" ON "forensic_timeline_events"("category");

-- CreateIndex
CREATE INDEX "forensic_timeline_events_actor_id_idx" ON "forensic_timeline_events"("actor_id");

-- CreateIndex
CREATE INDEX "forensic_timeline_events_target_id_idx" ON "forensic_timeline_events"("target_id");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_timestamp_idx" ON "audit_logs"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_timestamp_idx" ON "audit_logs"("entityType", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_severity_timestamp_idx" ON "audit_logs"("severity", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_sessionToken_idx" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_isActive_idx" ON "user_sessions"("userId", "isActive");

-- CreateIndex
CREATE INDEX "user_sessions_tokenVersion_idx" ON "user_sessions"("tokenVersion");

-- CreateIndex
CREATE INDEX "users_lockedUntil_idx" ON "users"("lockedUntil");

-- CreateIndex
CREATE INDEX "users_email_lockedUntil_idx" ON "users"("email", "lockedUntil");

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "malware_iocs" ADD CONSTRAINT "malware_iocs_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "malware_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_log" ADD CONSTRAINT "evidence_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honey_token_alerts" ADD CONSTRAINT "honey_token_alerts_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "honey_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
