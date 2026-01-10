/*
  Warnings:

  - A unique constraint covering the columns `[scope,name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "roles_scope_organizationId_name_key";

-- AlterTable
ALTER TABLE "nhiti_query_log" ALTER COLUMN "expires_at" SET DEFAULT (NOW() + INTERVAL '90 days');

-- CreateIndex
CREATE UNIQUE INDEX "roles_scope_name_key" ON "roles"("scope", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_name_key" ON "roles"("organizationId", "name");
