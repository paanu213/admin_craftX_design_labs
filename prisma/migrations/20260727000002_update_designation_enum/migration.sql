-- Migration: Update UserRole enum
-- Remove SUPER_ADMIN (it's a group/user-group, not a designation)
-- Add CUSTOMER_CARE designation
-- Ensure Super Admin user group retains __fullAccess sentinel

-- Step 1: Migrate any remaining SUPER_ADMIN users to EMPLOYEE
UPDATE "users" SET role = 'EMPLOYEE' WHERE role::text = 'SUPER_ADMIN';

-- Step 2: Recreate UserRole enum without SUPER_ADMIN, with CUSTOMER_CARE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum pe
    JOIN pg_type pt ON pe.enumtypid = pt.oid
    WHERE pt.typname = 'UserRole' AND pe.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE "UserRole" RENAME TO "UserRole_old";
    CREATE TYPE "UserRole" AS ENUM ('CEO', 'CMO', 'CFO', 'CTO', 'COO', 'EMPLOYEE', 'CUSTOMER_CARE');
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING (role::text::"UserRole");
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
    DROP TYPE "UserRole_old";
  END IF;
END $$;

-- Step 3: Add CUSTOMER_CARE if enum was already updated without it
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER_CARE';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 4: Ensure Super Admin group has __fullAccess sentinel (re-stamps if lost via UI save)
UPDATE "user_groups"
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"__fullAccess": true}'::jsonb
WHERE lower(name) = 'super admin';
