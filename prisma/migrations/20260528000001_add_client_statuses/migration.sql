-- Add REGISTERED and KEY_GENERATED values to the ClientStatus enum
-- These drive the client lifecycle: REGISTERED → KEY_GENERATED → ACTIVE

ALTER TYPE "ClientStatus" ADD VALUE IF NOT EXISTS 'REGISTERED';
ALTER TYPE "ClientStatus" ADD VALUE IF NOT EXISTS 'KEY_GENERATED';
