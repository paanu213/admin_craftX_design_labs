-- Add CANCELLED to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- Add cancellation fields to payments
ALTER TABLE "payments"
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_by_id" TEXT,
  ADD COLUMN "cancellation_note" TEXT;

-- Foreign key for cancelledBy
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
