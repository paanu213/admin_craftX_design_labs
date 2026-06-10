-- User groups table (idempotent)
CREATE TABLE IF NOT EXISTS "user_groups" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "defaultRole" "UserRole" NOT NULL DEFAULT 'COO',
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");
EXCEPTION WHEN duplicate_table THEN null; END $$;

-- Add groupId to users (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_groupId_fkey"
        FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
