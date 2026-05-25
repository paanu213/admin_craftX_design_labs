-- ─────────────────────────────────────────────────────────────────────────────
-- CraftX Design Labs — Admin Portal
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "UserRole"       AS ENUM ('SUPER_ADMIN', 'CEO', 'CMO', 'CFO', 'CTO');
CREATE TYPE "ClientStatus"   AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'CHURNED');
CREATE TYPE "BillingCycle"   AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');
CREATE TYPE "ExpenseCategory" AS ENUM ('SAAS', 'PAYROLL', 'MARKETING', 'OPERATIONS', 'INFRASTRUCTURE', 'TRAVEL', 'OTHER');
CREATE TYPE "ExpenseStatus"  AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

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
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "phone"     TEXT,
    "company"   TEXT NOT NULL,
    "industry"  TEXT,
    "website"   TEXT,
    "address"   TEXT,
    "city"      TEXT,
    "country"   TEXT,
    "status"    "ClientStatus" NOT NULL DEFAULT 'TRIAL',
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "currency"     TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate"    TIMESTAMP(3) NOT NULL,
    "endDate"      TIMESTAMP(3),
    "renewalDate"  TIMESTAMP(3),
    "isAutoRenew"  BOOLEAN NOT NULL DEFAULT true,
    "features"     TEXT[],
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscriptions_clientId_key" ON "subscriptions"("clientId");

-- Expenses
CREATE TABLE "expenses" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "amount"        DECIMAL(10,2) NOT NULL,
    "currency"      TEXT NOT NULL DEFAULT 'USD',
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
ALTER TABLE "contacts"     ADD CONSTRAINT "contacts_clientId_fkey"     FOREIGN KEY ("clientId")    REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_clientId_fkey" FOREIGN KEY ("clientId")    REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses"     ADD CONSTRAINT "expenses_createdById_fkey"  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses"     ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
