-- Fix: stamp __fullAccess sentinel on all super-admin-style groups.
-- Previous migration used `lower(name) = 'super admin'` but the actual
-- group is named "Super Admins" (with trailing s). This uses LIKE to
-- cover "Super Admin", "Super Admins", and any similar variants.
UPDATE "user_groups"
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{
  "__fullAccess": true,
  "clients":        {"read":true,"create":true,"update":true,"delete":true},
  "payments":       {"read":true,"create":true,"update":true,"delete":true},
  "expenses":       {"read":true,"create":true,"update":true,"delete":true},
  "reports":        {"read":true,"create":true,"update":true,"delete":true},
  "applications":   {"read":true,"create":true,"update":true,"delete":true},
  "activationKeys": {"read":true,"create":true,"update":true,"delete":true},
  "devAccess":      {"read":true,"create":true,"update":true,"delete":true},
  "masterData":     {"read":true,"create":true,"update":true,"delete":true},
  "users":          {"read":true,"create":true,"update":true,"delete":true},
  "settings":       {"read":true,"create":true,"update":true,"delete":true},
  "products":       {"read":true,"create":true,"update":true,"delete":true}
}'::jsonb
WHERE lower(name) LIKE 'super admin%';
