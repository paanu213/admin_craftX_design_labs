CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

ALTER TABLE "clients" ADD COLUMN "client_code" TEXT;

UPDATE "clients"
SET "client_code" = 'CX-' || LPAD(nextval('client_code_seq')::TEXT, 4, '0')
WHERE "client_code" IS NULL;

ALTER TABLE "clients" ADD CONSTRAINT "clients_client_code_key" UNIQUE ("client_code");
