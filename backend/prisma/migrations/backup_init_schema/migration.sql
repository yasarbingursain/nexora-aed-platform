-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxIdentities" INTEGER NOT NULL DEFAULT 100,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "owner" TEXT,
    "description" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "credentials" TEXT NOT NULL DEFAULT '{}',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "lastSeenAt" TIMESTAMP(3),
    "lastRotatedAt" TIMESTAMP(3),
    "rotationInterval" INTEGER,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_activities" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselines" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "behaviorType" TEXT NOT NULL,
    "baselineData" TEXT NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "observationType" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "anomalyScore" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threats" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "category" TEXT NOT NULL,
    "identityId" TEXT,
    "sourceIp" TEXT,
    "indicators" TEXT NOT NULL DEFAULT '[]',
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "mitreTactics" TEXT NOT NULL DEFAULT '',
    "mitreId" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "dossier" TEXT NOT NULL DEFAULT '{}',
    "compliance" TEXT NOT NULL DEFAULT '{}',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "identityId" TEXT,
    "threatId" TEXT,
    "playbookId" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT,
    "rollbackPlan" TEXT,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL DEFAULT '{}',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "data" TEXT,
    "filePath" TEXT,
    "generatedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "requestBody" TEXT,
    "responseStatus" INTEGER,
    "duration" INTEGER,
    "organizationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_uptime_metrics" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "errorRate" DOUBLE PRECISION,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_uptime_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorDomain" TEXT,
    "vendorType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION,
    "lastAssessedAt" TIMESTAMP(3) NOT NULL,
    "nextAssessmentDue" TIMESTAMP(3) NOT NULL,
    "soc2Certified" BOOLEAN NOT NULL DEFAULT false,
    "iso27001Certified" BOOLEAN NOT NULL DEFAULT false,
    "gdprCompliant" BOOLEAN NOT NULL DEFAULT false,
    "hipaaCompliant" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireCompleted" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireScore" DOUBLE PRECISION,
    "questionnaireDate" TIMESTAMP(3),
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "dataProcessed" TEXT,
    "dataLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dora_ict_incidents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "reportedToAuthorityAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "servicesAffected" TEXT,
    "usersAffected" INTEGER,
    "financialImpact" DOUBLE PRECISION,
    "dataCompromised" BOOLEAN NOT NULL DEFAULT false,
    "rootCause" TEXT,
    "contributingFactors" TEXT,
    "immediateActions" TEXT,
    "remediationPlan" TEXT,
    "lessonsLearned" TEXT,
    "authorityNotified" BOOLEAN NOT NULL DEFAULT false,
    "notificationMethod" TEXT,
    "reportReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dora_ict_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IncidentToThreat" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_assessments_organizationId_vendorName_key" ON "vendor_assessments"("organizationId", "vendorName");

-- CreateIndex
CREATE UNIQUE INDEX "_IncidentToThreat_AB_unique" ON "_IncidentToThreat"("A", "B");

-- CreateIndex
CREATE INDEX "_IncidentToThreat_B_index" ON "_IncidentToThreat"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_activities" ADD CONSTRAINT "identity_activities_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threats" ADD CONSTRAINT "threats_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threats" ADD CONSTRAINT "threats_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "threats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentToThreat" ADD CONSTRAINT "_IncidentToThreat_A_fkey" FOREIGN KEY ("A") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentToThreat" ADD CONSTRAINT "_IncidentToThreat_B_fkey" FOREIGN KEY ("B") REFERENCES "threats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
