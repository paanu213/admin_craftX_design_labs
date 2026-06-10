-- Create enums (idempotent)
DO $$ BEGIN CREATE TYPE "AppCategory" AS ENUM ('BILLING', 'INVENTORY', 'POS', 'RESTAURANT', 'HOSPITAL', 'SCHOOL', 'REAL_ESTATE', 'LOGISTICS', 'CRM', 'HR_PAYROLL', 'FINANCE', 'MANUFACTURING', 'E_COMMERCE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AppStatus" AS ENUM ('ACTIVE', 'BETA', 'MAINTENANCE', 'DEPRECATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create applications table (idempotent)
CREATE TABLE IF NOT EXISTS "applications" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "category"     "AppCategory" NOT NULL,
    "version"      TEXT NOT NULL,
    "status"       "AppStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl"      TEXT,
    "monthlyPrice" DECIMAL(10,2),
    "yearlyPrice"  DECIMAL(10,2),
    "currency"     TEXT NOT NULL DEFAULT 'INR',
    "website"      TEXT,
    "playStoreUrl" TEXT,
    "appStoreUrl"  TEXT,
    "createdById"  TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- Add applicationId to subscriptions (idempotent)
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;

-- FK constraints (idempotent)
DO $$ BEGIN
    ALTER TABLE "applications" ADD CONSTRAINT "applications_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_applicationId_fkey"
        FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
