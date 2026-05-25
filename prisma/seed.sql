-- ─────────────────────────────────────────────────────────────────────────────
-- CraftX Design Labs — Seed Data
-- Run AFTER migration.sql in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Users (passwords are bcrypt hashed)
INSERT INTO "users" ("id", "name", "email", "password", "role", "isActive", "createdAt", "updatedAt") VALUES
  ('usr_admin001', 'Admin User',      'admin@craftxlabs.com', '$2b$10$Cr4S81t.rcxW3kxntNj3ZOp84vO1srZ48PKr7AndQwW4CDhktekw2', 'SUPER_ADMIN', true, NOW(), NOW()),
  ('usr_ceo00001', 'Alex Johnson',    'ceo@craftxlabs.com',   '$2b$10$rnP4ILhj/6FQMYpbnLlIn.Rz/ddWWsQtw3a161e46BPaZ2h64DGjG', 'CEO',         true, NOW(), NOW()),
  ('usr_cfo00001', 'Sarah Chen',      'cfo@craftxlabs.com',   '$2b$10$KdJwXpipHbppVy0fKf7EYObMUW5GTWEKZ2vmK37L9pVElh38fYtOG', 'CFO',         true, NOW(), NOW()),
  ('usr_cmo00001', 'Marcus Williams', 'cmo@craftxlabs.com',   '$2b$10$OpPHLFvUSRmDd9cjyEV/SuN8vTAkWtyTjodi.Acf8VRbUFfHV/Fby', 'CMO',         true, NOW(), NOW()),
  ('usr_cto00001', 'Jordan Kim',      'cto@craftxlabs.com',   '$2b$10$2bmXSXwQpyZc6VnN2Et06uqSmc7VuH550wXVXvCvxsRcqMofSUQRe', 'CTO',         true, NOW(), NOW());

-- Sample Clients
INSERT INTO "clients" ("id", "name", "email", "phone", "company", "industry", "website", "city", "country", "status", "notes", "createdAt", "updatedAt") VALUES
  ('cli_tech0001', 'David Park',     'contact@techcorp.com', '+1-415-555-0100', 'TechCorp Solutions', 'Technology', 'https://techcorp.example.com', 'San Francisco', 'United States', 'ACTIVE', 'Enterprise client since 2023. High-value account.', NOW(), NOW()),
  ('cli_grow0001', 'Emma Thompson',  'hello@growthco.io',    '+44-20-7946-0200', 'GrowthCo Digital',  'Marketing',  NULL,                          'London',        'United Kingdom', 'TRIAL',  '30-day trial, potential for professional upgrade.', NOW(), NOW()),
  ('cli_nova0001', 'Riya Patel',     'riya@novadesign.io',   '+91-98765-43210',  'Nova Design Studio','Design',     'https://novadesign.example.io', 'Mumbai',       'India',          'ACTIVE', 'Design agency partnership.', NOW(), NOW());

-- Sample Subscriptions
INSERT INTO "subscriptions" ("id", "clientId", "planName", "price", "currency", "billingCycle", "startDate", "renewalDate", "isAutoRenew", "features", "createdAt", "updatedAt") VALUES
  ('sub_tech0001', 'cli_tech0001', 'Enterprise',          2500.00, 'USD', 'MONTHLY',  '2023-01-01', '2026-01-01', true, ARRAY['Unlimited Users', 'Priority Support', 'Custom Branding', 'API Access'], NOW(), NOW()),
  ('sub_grow0001', 'cli_grow0001', 'Professional Trial',     0.00, 'USD', 'MONTHLY',  '2025-05-01', '2025-06-01', false, ARRAY['5 Users', 'Basic Analytics', 'Email Support'], NOW(), NOW()),
  ('sub_nova0001', 'cli_nova0001', 'Professional',          799.00, 'USD', 'MONTHLY',  '2024-06-01', '2025-06-01', true, ARRAY['10 Users', 'Advanced Analytics', 'Priority Support'], NOW(), NOW());

-- Sample Expenses
INSERT INTO "expenses" ("id", "title", "description", "amount", "currency", "category", "expenseDate", "status", "createdById", "approvedById", "approvedAt", "createdAt", "updatedAt") VALUES
  ('exp_00000001', 'Figma Professional Plan',    'Annual design tool subscription', 576.00,   'USD', 'SAAS',           '2025-05-01', 'APPROVED', 'usr_admin001', 'usr_cfo00001', NOW(), NOW(), NOW()),
  ('exp_00000002', 'AWS Infrastructure',          'Monthly cloud hosting',          1240.50,  'USD', 'INFRASTRUCTURE', '2025-05-05', 'APPROVED', 'usr_admin001', 'usr_cfo00001', NOW(), NOW(), NOW()),
  ('exp_00000003', 'Team Marketing Campaign',     'Q2 social media ads',            3500.00,  'USD', 'MARKETING',      '2025-05-10', 'PENDING',  'usr_cmo00001', NULL, NULL, NOW(), NOW()),
  ('exp_00000004', 'GitHub Copilot Seats',        '4 developer AI seats',             76.00,  'USD', 'SAAS',           '2025-05-12', 'PENDING',  'usr_admin001', NULL, NULL, NOW(), NOW()),
  ('exp_00000005', 'Office Supplies',             'Q2 stationery and equipment',      320.00, 'USD', 'OPERATIONS',     '2025-04-20', 'APPROVED', 'usr_cfo00001', 'usr_ceo00001', NOW(), NOW(), NOW()),
  ('exp_00000006', 'Conference Travel - Google IO','Flights and hotel',              2100.00,  'USD', 'TRAVEL',        '2025-04-15', 'APPROVED', 'usr_cto00001', 'usr_ceo00001', NOW(), NOW(), NOW());
