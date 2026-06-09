-- Dev access passwords table (idempotent)
CREATE TABLE IF NOT EXISTS "dev_access_passwords" (
    "id"            TEXT NOT NULL,
    "clientId"      TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "passwordHash"  TEXT NOT NULL,
    "reason"        TEXT NOT NULL,
    "expiresAt"     TIMESTAMP(3) NOT NULL,
    "usedAt"        TIMESTAMP(3),
    "usedFromIp"    TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dev_access_passwords_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "dev_access_passwords" ADD CONSTRAINT "dev_access_passwords_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "dev_access_passwords" ADD CONSTRAINT "dev_access_passwords_generatedById_fkey"
        FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- System config table (idempotent)
CREATE TABLE IF NOT EXISTS "system_config" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "value"       TEXT NOT NULL,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");
EXCEPTION WHEN duplicate_table THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updatedById_fkey"
        FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
