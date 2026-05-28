-- ─────────────────────────────────────────────────────────────────────────────
-- Baseline migration — represents the full DB state at project start
-- This migration is marked as "already applied" in Supabase; it is NOT run
-- against the live DB. Future migrations contain only incremental changes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'CEO', 'CMO', 'CFO', 'CTO');
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'CHURNED');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');
CREATE TYPE "ExpenseCategory" AS ENUM ('SAAS', 'PAYROLL', 'MARKETING', 'OPERATIONS', 'INFRASTRUCTURE', 'TRAVEL', 'OTHER');
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "KeyStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- Users
CREATE TABLE "users" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "role"      "UserRole" NOT NULL DEFAULT 'CEO',
    "avatar"    TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Clients
CREATE TABLE "clients" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "phone"          TEXT,
    "company"        TEXT NOT NULL,
    "industry"       TEXT,
    "website"        TEXT,
    "businessType"   TEXT,
    "gstNumber"      TEXT,
    "panNumber"      TEXT,
    "address"        TEXT,
    "city"           TEXT,
    "country"        TEXT,
    "pincode"        TEXT,
    "state"          TEXT,
    "locality"       TEXT,
    "addressLine1"   TEXT,
    "addressLine2"   TEXT,
    "appRequirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status"         "ClientStatus" NOT NULL DEFAULT 'TRIAL',
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- Contacts
CREATE TABLE "contacts" (
    "id"        TEXT NOT NULL,
    "clientId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT,
    "phone"     TEXT,
    "role"      TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- Subscriptions
CREATE TABLE "subscriptions" (
    "id"           TEXT NOT NULL,
    "clientId"     TEXT NOT NULL,
    "planName"     TEXT NOT NULL,
    "price"        DECIMAL(10,2) NOT NULL,
    "currency"     TEXT NOT NULL DEFAULT 'INR',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate"    TIMESTAMP(3) NOT NULL,
    "endDate"      TIMESTAMP(3),
    "renewalDate"  TIMESTAMP(3),
    "isAutoRenew"  BOOLEAN NOT NULL DEFAULT true,
    "features"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscriptions_clientId_key" ON "subscriptions"("clientId");

-- Activation Keys
CREATE TABLE "activation_keys" (
    "id"            TEXT NOT NULL,
    "clientId"      TEXT NOT NULL,
    "key"           TEXT NOT NULL,
    "status"        "KeyStatus" NOT NULL DEFAULT 'PENDING',
    "generatedById" TEXT NOT NULL,
    "generatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt"   TIMESTAMP(3),
    CONSTRAINT "activation_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "activation_keys_clientId_key" ON "activation_keys"("clientId");
CREATE UNIQUE INDEX "activation_keys_key_key" ON "activation_keys"("key");

-- Expenses
CREATE TABLE "expenses" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "amount"        DECIMAL(10,2) NOT NULL,
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "category"      "ExpenseCategory" NOT NULL,
    "expenseDate"   TIMESTAMP(3) NOT NULL,
    "receiptUrl"    TEXT,
    "status"        "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "createdById"   TEXT NOT NULL,
    "approvedById"  TEXT,
    "approvedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "contacts"
    ADD CONSTRAINT "contacts_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activation_keys"
    ADD CONSTRAINT "activation_keys_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activation_keys"
    ADD CONSTRAINT "activation_keys_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Validation Constraints
ALTER TABLE "clients"
    ADD CONSTRAINT "clients_phone_format"
    CHECK (
        "phone" IS NULL OR "phone" = '' OR
        "phone" ~ '^(\+91[\-\s]?)?[6-9]\d{9}$'
    );

ALTER TABLE "clients"
    ADD CONSTRAINT "clients_gst_format"
    CHECK (
        "gstNumber" IS NULL OR "gstNumber" = '' OR
        "gstNumber" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    );

ALTER TABLE "clients"
    ADD CONSTRAINT "clients_pan_format"
    CHECK (
        "panNumber" IS NULL OR "panNumber" = '' OR
        "panNumber" ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
    );
