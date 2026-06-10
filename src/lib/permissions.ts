export const MODULES = [
  { key: 'clients',        label: 'Clients' },
  { key: 'payments',       label: 'Payments' },
  { key: 'expenses',       label: 'Expenses' },
  { key: 'reports',        label: 'Reports' },
  { key: 'applications',   label: 'Applications' },
  { key: 'activationKeys', label: 'Activation Keys' },
  { key: 'devAccess',      label: 'Dev Access' },
  { key: 'users',          label: 'Users & Groups' },
  { key: 'settings',       label: 'Settings' },
] as const;

export type ModuleKey = (typeof MODULES)[number]['key'];
export type Action = 'read' | 'create' | 'update' | 'delete';

export type ModulePermissions = Record<Action, boolean>;
export type PermissionMatrix = Record<ModuleKey, ModulePermissions>;

export const EMPTY_PERMISSIONS: PermissionMatrix = Object.fromEntries(
  MODULES.map(m => [m.key, { read: false, create: false, update: false, delete: false }])
) as PermissionMatrix;

export const FULL_PERMISSIONS: PermissionMatrix = Object.fromEntries(
  MODULES.map(m => [m.key, { read: true, create: true, update: true, delete: true }])
) as PermissionMatrix;

// Map old permission keys → [module, action] for backward compat
const OLD_KEY_MAP: Record<string, [ModuleKey, Action]> = {
  viewClients:         ['clients',        'read'],
  createClients:       ['clients',        'create'],
  editClients:         ['clients',        'update'],
  deleteClients:       ['clients',        'delete'],
  viewPayments:        ['payments',       'read'],
  recordPayments:      ['payments',       'create'],
  approvePayments:     ['payments',       'update'],
  viewExpenses:        ['expenses',       'read'],
  viewAllExpenses:     ['expenses',       'read'],
  createExpenses:      ['expenses',       'create'],
  editExpenses:        ['expenses',       'update'],
  deleteExpenses:      ['expenses',       'delete'],
  approveExpenses:     ['expenses',       'update'],
  viewReports:         ['reports',        'read'],
  exportReports:       ['reports',        'read'],
  viewApplications:    ['applications',   'read'],
  createApplications:  ['applications',   'create'],
  editApplications:    ['applications',   'update'],
  deleteApplications:  ['applications',   'delete'],
  viewKey:             ['activationKeys', 'read'],
  generateKey:         ['activationKeys', 'create'],
  revokeKey:           ['activationKeys', 'delete'],
  viewDevAccess:       ['devAccess',      'read'],
  generateDevAccess:   ['devAccess',      'create'],
  manageUsers:         ['users',          'create'],
  viewSettings:        ['settings',       'read'],
  manageSettings:      ['settings',       'update'],
};

export type Permission = keyof typeof OLD_KEY_MAP;

// Compute effective PermissionMatrix as union across groups
export function computeEffectivePermissions(
  groupPermissions: Partial<PermissionMatrix>[]
): PermissionMatrix {
  const result = structuredClone(EMPTY_PERMISSIONS);
  for (const gp of groupPermissions) {
    for (const mod of MODULES) {
      const src = gp[mod.key];
      if (!src) continue;
      if (src.read)   result[mod.key].read   = true;
      if (src.create) result[mod.key].create = true;
      if (src.update) result[mod.key].update = true;
      if (src.delete) result[mod.key].delete = true;
    }
  }
  return result;
}

// Check a single old-style permission key against a computed PermissionMatrix
export function can(matrix: PermissionMatrix, permission: Permission): boolean {
  const mapping = OLD_KEY_MAP[permission];
  if (!mapping) return false;
  return matrix[mapping[0]][mapping[1]];
}

// Check module+action directly
export function canDo(matrix: PermissionMatrix, module: ModuleKey, action: Action): boolean {
  return matrix[module]?.[action] ?? false;
}

// ROLE-BASED FALLBACK (for users with no groups during transition)
const ROLE_FALLBACK_PERMISSIONS: Record<string, PermissionMatrix> = {
  SUPER_ADMIN: FULL_PERMISSIONS,
  CEO: computeEffectivePermissions([{
    clients:        { read: true, create: true, update: true, delete: true },
    payments:       { read: true, create: true, update: true, delete: false },
    expenses:       { read: true, create: true, update: true, delete: true },
    reports:        { read: true, create: true, update: true, delete: false },
    applications:   { read: true, create: true, update: true, delete: true },
    activationKeys: { read: true, create: true, update: false, delete: true },
    devAccess:      { read: true, create: true, update: false, delete: false },
    users:          { read: true, create: false, update: false, delete: false },
    settings:       { read: true, create: false, update: true, delete: false },
  }]),
  CMO: computeEffectivePermissions([{
    clients:        { read: true, create: true, update: true, delete: false },
    payments:       { read: true, create: true, update: false, delete: false },
    expenses:       { read: true, create: true, update: false, delete: false },
    reports:        { read: true, create: false, update: false, delete: false },
    applications:   { read: true, create: false, update: false, delete: false },
    activationKeys: { read: true, create: false, update: false, delete: false },
    devAccess:      { read: false, create: false, update: false, delete: false },
    users:          { read: false, create: false, update: false, delete: false },
    settings:       { read: true, create: false, update: false, delete: false },
  }]),
};
// Default fallback for other roles
ROLE_FALLBACK_PERMISSIONS.CFO = ROLE_FALLBACK_PERMISSIONS.CMO;
ROLE_FALLBACK_PERMISSIONS.CTO = ROLE_FALLBACK_PERMISSIONS.CMO;
ROLE_FALLBACK_PERMISSIONS.COO = ROLE_FALLBACK_PERMISSIONS.CMO;

export function getPermissionsFromRole(role: string): PermissionMatrix {
  return ROLE_FALLBACK_PERMISSIONS[role] ?? EMPTY_PERMISSIONS;
}

// Legacy exports kept for any code that imports hasPermission / hasAnyPermission
export function hasPermission(role: string, permission: Permission): boolean {
  return can(getPermissionsFromRole(role), permission);
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
