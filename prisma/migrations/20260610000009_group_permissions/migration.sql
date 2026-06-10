-- Create many-to-many join table (idempotent)
CREATE TABLE IF NOT EXISTS "user_group_members" (
    "userId"  TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "user_group_members_pkey" PRIMARY KEY ("userId", "groupId")
);

DO $$ BEGIN
    ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_groupId_fkey"
        FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Migrate existing single-group assignments to the join table
INSERT INTO "user_group_members" ("userId", "groupId")
SELECT "id", "groupId" FROM "users" WHERE "groupId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add permissions JSON column (idempotent)
ALTER TABLE "user_groups" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '{}';

-- Remove old defaultRole column if it exists (idempotent)
ALTER TABLE "user_groups" DROP COLUMN IF EXISTS "defaultRole";

-- Remove old groupId FK from users (idempotent)
ALTER TABLE "users" DROP COLUMN IF EXISTS "groupId";
