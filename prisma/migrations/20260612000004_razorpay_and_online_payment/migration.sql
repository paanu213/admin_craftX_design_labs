-- Add ONLINE to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';

-- Create razorpay_payment_links table
CREATE TABLE IF NOT EXISTS "razorpay_payment_links" (
  "id"               TEXT NOT NULL,
  "client_id"        TEXT NOT NULL,
  "subscription_id"  TEXT,
  "razorpay_link_id" TEXT NOT NULL,
  "url"              TEXT NOT NULL,
  "short_url"        TEXT,
  "amount"           DECIMAL(10, 2) NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'INR',
  "description"      TEXT,
  "status"           TEXT NOT NULL DEFAULT 'created',
  "expires_at"       TIMESTAMP(3),
  "paid_at"          TIMESTAMP(3),
  "created_by_id"    TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "razorpay_payment_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "razorpay_payment_links_razorpay_link_id_key"
  ON "razorpay_payment_links"("razorpay_link_id");

ALTER TABLE "razorpay_payment_links"
  ADD CONSTRAINT "razorpay_payment_links_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "razorpay_payment_links"
  ADD CONSTRAINT "razorpay_payment_links_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "razorpay_payment_links"
  ADD CONSTRAINT "razorpay_payment_links_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
