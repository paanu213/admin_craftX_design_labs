import type { UserRole } from "@/types";

export const PERMISSIONS = {
  // User Management
  manageUsers: ["SUPER_ADMIN"] as UserRole[],

  // Client Management
  viewClients: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO"] as UserRole[],
  createClients: ["SUPER_ADMIN", "CEO", "CMO"] as UserRole[],
  editClients: ["SUPER_ADMIN", "CEO", "CMO"] as UserRole[],
  deleteClients: ["SUPER_ADMIN", "CEO"] as UserRole[],

  // Expense Management
  viewExpenses: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO"] as UserRole[],
  createExpenses: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO"] as UserRole[],
  editExpenses: ["SUPER_ADMIN", "CEO", "CFO"] as UserRole[],
  deleteExpenses: ["SUPER_ADMIN", "CEO", "CFO"] as UserRole[],
  approveExpenses: ["SUPER_ADMIN", "CEO", "CFO"] as UserRole[],

  // Reports
  viewReports: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO"] as UserRole[],
  exportReports: ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO"] as UserRole[],

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
