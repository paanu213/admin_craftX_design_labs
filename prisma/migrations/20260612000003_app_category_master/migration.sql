-- Change Application.category from enum to text (allow custom categories)
ALTER TABLE "applications" ALTER COLUMN "category" TYPE TEXT;

-- Drop the AppCategory enum type
DROP TYPE IF EXISTS "AppCategory";

-- Create app_category_master table
CREATE TABLE "app_category_master" (
  "id"         TEXT        NOT NULL,
  "key"        TEXT        NOT NULL,
  "label"      TEXT        NOT NULL,
  "is_active"  BOOLEAN     NOT NULL DEFAULT true,
  "is_system"  BOOLEAN     NOT NULL DEFAULT false,
  "sort_order" INTEGER     NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_category_master_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_category_master_key_key" ON "app_category_master"("key");

-- Seed built-in system categories
INSERT INTO "app_category_master" ("id","key","label","is_active","is_system","sort_order","created_at","updated_at") VALUES
  ('cat_billing',       'BILLING',       'Billing',        true, true,  1,  NOW(), NOW()),
  ('cat_inventory',     'INVENTORY',     'Inventory',      true, true,  2,  NOW(), NOW()),
  ('cat_pos',           'POS',           'Point of Sale',  true, true,  3,  NOW(), NOW()),
  ('cat_restaurant',    'RESTAURANT',    'Restaurant',     true, true,  4,  NOW(), NOW()),
  ('cat_hospital',      'HOSPITAL',      'Hospital',       true, true,  5,  NOW(), NOW()),
  ('cat_school',        'SCHOOL',        'School',         true, true,  6,  NOW(), NOW()),
  ('cat_real_estate',   'REAL_ESTATE',   'Real Estate',    true, true,  7,  NOW(), NOW()),
  ('cat_logistics',     'LOGISTICS',     'Logistics',      true, true,  8,  NOW(), NOW()),
  ('cat_crm',           'CRM',           'CRM',            true, true,  9,  NOW(), NOW()),
  ('cat_hr_payroll',    'HR_PAYROLL',    'HR & Payroll',   true, true,  10, NOW(), NOW()),
  ('cat_finance',       'FINANCE',       'Finance',        true, true,  11, NOW(), NOW()),
  ('cat_manufacturing', 'MANUFACTURING', 'Manufacturing',  true, true,  12, NOW(), NOW()),
  ('cat_e_commerce',    'E_COMMERCE',    'E-Commerce',     true, true,  13, NOW(), NOW()),
  ('cat_other',         'OTHER',         'Other',          true, true,  14, NOW(), NOW());
