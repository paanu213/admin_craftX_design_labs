import type { UserRole } from "@/types";

export const PERMISSIONS = {
  // User Management
  manageUsers: ["SUPER_ADMIN"] as UserRole[],

  // Client Management
  viewClients: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  createClients: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  editClients: ["SUPER_ADMIN", "CEO", "CMO", "COO"] as UserRole[],
  deleteClients: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Expense Management
  viewExpenses: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  viewAllExpenses: ["SUPER_ADMIN", "CEO", "CFO", "CTO", "COO"] as UserRole[],
  createExpenses: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  editExpenses: ["SUPER_ADMIN", "CEO", "CFO", "CTO", "CMO", "COO"] as UserRole[],
  deleteExpenses: ["SUPER_ADMIN", "CEO", "CFO", "CTO", "CMO", "COO"] as UserRole[],
  approveExpenses: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Reports
  viewReports: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  exportReports: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],

  // Activation Keys
  generateKey: ["SUPER_ADMIN", "CEO"] as UserRole[],
  viewKey: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  revokeKey: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Application Management
  viewApplications: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  createApplications: ["SUPER_ADMIN", "CEO", "CMO"] as UserRole[],
  editApplications: ["SUPER_ADMIN", "CEO", "CMO"] as UserRole[],
  deleteApplications: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Payments
  viewPayments: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  recordPayments: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[],
  approvePayments: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Settings
  viewSettings: ["SUPER_ADMIN"] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
