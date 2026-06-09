-- Add EXPIRED to KeyStatus
ALTER TYPE "KeyStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- New enums
DO $$ BEGIN CREATE TYPE "KeyType" AS ENUM ('TRIAL', 'SUBSCRIPTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentReceiver" AS ENUM ('EMPLOYEE', 'COMPANY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_DEPOSIT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add keyType and expiresAt to activation_keys
ALTER TABLE "activation_keys" ADD COLUMN IF NOT EXISTS "keyType" "KeyType" NOT NULL DEFAULT 'SUBSCRIPTION';
ALTER TABLE "activation_keys" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
    "id"             TEXT NOT NULL,
    "clientId"       TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount"         DECIMAL(10,2) NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'INR',
    "method"         "PaymentMethod" NOT NULL,
    "receivedBy"     "PaymentReceiver" NOT NULL,
    "paymentDate"    TIMESTAMP(3) NOT NULL,
    "note"           TEXT,
    "status"         "PaymentStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "isRenewal"      BOOLEAN NOT NULL DEFAULT false,
    "recordedById"   TEXT NOT NULL,
    "approvedById"   TEXT,
    "approvedAt"     TIMESTAMP(3),
    "rejectionNote"  TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
