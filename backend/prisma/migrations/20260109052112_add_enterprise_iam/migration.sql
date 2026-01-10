/*
  Warnings:

  - The primary key for the `siem_configurations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignedTo` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `evidence` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `indicators` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `mitreId` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `mitreTactics` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `sourceIp` on the `threats` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `threats` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId,source]` on the table `threats` will be added. If there are existing duplicate values, this will fail.
  - Made the column `enabled` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_primary` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `format` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `batch_size` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `flush_interval_ms` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `events_sent_total` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `events_failed_total` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `siem_configurations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `siem_event_log` required. This step will fail if there are existing NULL values in that column.
  - Made the column `retry_count` on table `siem_event_log` required. This step will fail if there are existing NULL values in that column.
  - Made the column `max_retries` on table `siem_event_log` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `siem_event_log` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `threats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'ORG');

-- DropForeignKey
ALTER TABLE "siem_configurations" DROP CONSTRAINT "fk_siem_org";

-- DropForeignKey
ALTER TABLE "siem_event_log" DROP CONSTRAINT "fk_siem_log_config";

-- DropForeignKey
ALTER TABLE "siem_event_log" DROP CONSTRAINT "fk_siem_log_org";

-- DropIndex
DROP INDEX "idx_threat_events_country";

-- DropIndex
DROP INDEX "idx_threat_events_indicator_type";

-- DropIndex
DROP INDEX "idx_threat_events_last_seen";

-- DropIndex
DROP INDEX "idx_threat_events_org";

-- DropIndex
DROP INDEX "idx_threat_events_risk_score";

-- DropIndex
DROP INDEX "idx_threat_events_severity";

-- DropIndex
DROP INDEX "idx_threat_events_source";

-- AlterTable
ALTER TABLE "nhiti_query_log" ALTER COLUMN "expires_at" SET DEFAULT (NOW() + INTERVAL '90 days');

-- AlterTable
ALTER TABLE "siem_configurations" DROP CONSTRAINT "siem_configurations_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "organization_id" SET DATA TYPE TEXT,
ALTER COLUMN "provider" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "enabled" SET NOT NULL,
ALTER COLUMN "is_primary" SET NOT NULL,
ALTER COLUMN "format" SET NOT NULL,
ALTER COLUMN "format" SET DATA TYPE TEXT,
ALTER COLUMN "batch_size" SET NOT NULL,
ALTER COLUMN "flush_interval_ms" SET NOT NULL,
ALTER COLUMN "severity_filter" SET DATA TYPE TEXT[],
ALTER COLUMN "category_filter" SET DATA TYPE TEXT[],
ALTER COLUMN "last_successful_send" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_error_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "events_sent_total" SET NOT NULL,
ALTER COLUMN "events_failed_total" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_by" SET DATA TYPE TEXT,
ALTER COLUMN "updated_by" SET DATA TYPE TEXT,
ADD CONSTRAINT "siem_configurations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "siem_event_log" ALTER COLUMN "organization_id" SET DATA TYPE TEXT,
ALTER COLUMN "configuration_id" SET DATA TYPE TEXT,
ALTER COLUMN "event_id" SET DATA TYPE TEXT,
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ALTER COLUMN "severity" SET DATA TYPE TEXT,
ALTER COLUMN "category" SET DATA TYPE TEXT,
ALTER COLUMN "format" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "retry_count" SET NOT NULL,
ALTER COLUMN "max_retries" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "threats" DROP COLUMN "assignedTo",
DROP COLUMN "category",
DROP COLUMN "evidence",
DROP COLUMN "indicators",
DROP COLUMN "mitreId",
DROP COLUMN "mitreTactics",
DROP COLUMN "sourceIp",
DROP COLUMN "title",
ADD COLUMN     "cvssScore" DOUBLE PRECISION,
ADD COLUMN     "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metadata" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "severity" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "permissionsVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "action_url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "parentRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "team_permissions" (
    "teamId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "team_permissions_pkey" PRIMARY KEY ("teamId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "defaultRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_scopes" (
    "apiKeyId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "api_key_scopes_pkey" PRIMARY KEY ("apiKeyId","permissionId")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "supportUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iam_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_severity_idx" ON "notifications"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "roles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_scope_organizationId_name_key" ON "roles"("scope", "organizationId", "name");

-- CreateIndex
CREATE INDEX "teams_organizationId_idx" ON "teams"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organizationId_name_key" ON "teams"("organizationId", "name");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "invites_organizationId_idx" ON "invites"("organizationId");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "impersonation_sessions_targetUserId_expiresAt_idx" ON "impersonation_sessions"("targetUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "impersonation_sessions_supportUserId_expiresAt_idx" ON "impersonation_sessions"("supportUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "impersonation_sessions_organizationId_idx" ON "impersonation_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "iam_audit_logs_organizationId_createdAt_idx" ON "iam_audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "iam_audit_logs_actorUserId_createdAt_idx" ON "iam_audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "threats_source_idx" ON "threats"("source");

-- CreateIndex
CREATE INDEX "threats_severity_idx" ON "threats"("severity");

-- CreateIndex
CREATE INDEX "threats_lastSeen_idx" ON "threats"("lastSeen");

-- CreateIndex
CREATE INDEX "threats_organizationId_status_idx" ON "threats"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "threats_externalId_source_key" ON "threats"("externalId", "source");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_defaultRoleId_fkey" FOREIGN KEY ("defaultRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_scopes" ADD CONSTRAINT "api_key_scopes_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_scopes" ADD CONSTRAINT "api_key_scopes_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_supportUserId_fkey" FOREIGN KEY ("supportUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_audit_logs" ADD CONSTRAINT "iam_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam_audit_logs" ADD CONSTRAINT "iam_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_siem_config_enabled" RENAME TO "siem_configurations_enabled_idx";

-- RenameIndex
ALTER INDEX "idx_siem_config_org" RENAME TO "siem_configurations_organization_id_idx";

-- RenameIndex
ALTER INDEX "idx_siem_config_provider" RENAME TO "siem_configurations_provider_idx";

-- RenameIndex
ALTER INDEX "unique_siem_provider_per_org" RENAME TO "siem_configurations_organization_id_provider_name_key";

-- RenameIndex
ALTER INDEX "idx_siem_log_created" RENAME TO "siem_event_log_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_siem_log_event_id" RENAME TO "siem_event_log_event_id_idx";

-- RenameIndex
ALTER INDEX "idx_siem_log_org" RENAME TO "siem_event_log_organization_id_idx";

-- RenameIndex
ALTER INDEX "idx_siem_log_status" RENAME TO "siem_event_log_status_idx";
