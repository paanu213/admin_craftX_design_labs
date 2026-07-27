-- Add EMPLOYEE to UserRole enum (idempotent)
DO $$ BEGIN
    ALTER TYPE "UserRole" ADD VALUE 'EMPLOYEE';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Change default designation to EMPLOYEE for new users
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

-- ─────────────────────────────────────────────
-- Grant FULL_PERMISSIONS to the Super Admin group
-- (ensures anyone in this group gets full access)
-- ─────────────────────────────────────────────
UPDATE "user_groups"
SET permissions = '{
  "clients":        {"read":true,"create":true,"update":true,"delete":true},
  "payments":       {"read":true,"create":true,"update":true,"delete":true},
  "expenses":       {"read":true,"create":true,"update":true,"delete":true},
  "reports":        {"read":true,"create":true,"update":true,"delete":true},
  "applications":   {"read":true,"create":true,"update":true,"delete":true},
  "activationKeys": {"read":true,"create":true,"update":true,"delete":true},
  "devAccess":      {"read":true,"create":true,"update":true,"delete":true},
  "masterData":     {"read":true,"create":true,"update":true,"delete":true},
  "users":          {"read":true,"create":true,"update":true,"delete":true},
  "settings":       {"read":true,"create":true,"update":true,"delete":true}
}'::jsonb
WHERE lower(name) = 'super admin';

-- ─────────────────────────────────────────────
-- Add admin@craftxlabs.com to Super Admin group
-- ─────────────────────────────────────────────
INSERT INTO "user_group_members" ("user_id", "group_id")
SELECT u.id, ug.id
FROM "users" u, "user_groups" ug
WHERE lower(u.email) = 'admin@craftxlabs.com'
  AND lower(ug.name) = 'super admin'
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_members" ugm
    WHERE ugm.user_id = u.id AND ugm.group_id = ug.id
  );

-- ─────────────────────────────────────────────
-- Add NagaPraveen to Super Admin group
-- (handles both craftxdesignlans and craftxdesignlabs typos)
-- ─────────────────────────────────────────────
INSERT INTO "user_group_members" ("user_id", "group_id")
SELECT u.id, ug.id
FROM "users" u, "user_groups" ug
WHERE lower(u.email) LIKE '%nagapraveen%'
  AND lower(ug.name) = 'super admin'
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_members" ugm
    WHERE ugm.user_id = u.id AND ugm.group_id = ug.id
  );

-- ─────────────────────────────────────────────
-- Migrate admin@craftxlabs.com designation from SUPER_ADMIN to CEO
-- (SUPER_ADMIN was a bypass; now designation is just a job title)
-- ─────────────────────────────────────────────
UPDATE "users"
SET role = 'CEO'
WHERE lower(email) = 'admin@craftxlabs.com'
  AND role = 'SUPER_ADMIN';
