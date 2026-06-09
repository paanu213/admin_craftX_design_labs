-- Ensure all expected columns exist on tables that were created via manual SQL.
-- These are safe no-ops if the column already exists.

-- payments — make sure every column is present
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency"       TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "note"           TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "isRenewal"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "approvedById"   TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "approvedAt"     TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "rejectionNote"  TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- dev_access_passwords — make sure every column is present
ALTER TABLE "dev_access_passwords" ADD COLUMN IF NOT EXISTS "usedAt"      TIMESTAMP(3);
ALTER TABLE "dev_access_passwords" ADD COLUMN IF NOT EXISTS "usedFromIp"  TEXT;

-- system_config — make sure updatedById is present
ALTER TABLE "system_config" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- Ensure FK constraints exist (idempotent)
DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updatedById_fkey"
        FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
