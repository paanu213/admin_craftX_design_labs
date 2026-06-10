-- Remove defaultRole from user_groups (idempotent)
ALTER TABLE "user_groups" DROP COLUMN IF EXISTS "defaultRole";
