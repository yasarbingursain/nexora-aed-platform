-- AlterTable
ALTER TABLE "nhiti_query_log" ALTER COLUMN "expires_at" SET DEFAULT (NOW() + INTERVAL '90 days');
