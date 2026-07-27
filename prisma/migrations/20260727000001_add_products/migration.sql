-- Products table (idempotent)
CREATE TABLE IF NOT EXISTS "products" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "description" TEXT,
    "logo_url"    TEXT,
    "website_url" TEXT,
    "launch_date" TIMESTAMP(3),
    "api_url"     TEXT,
    "api_key"     TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
EXCEPTION WHEN duplicate_table THEN null; END $$;
