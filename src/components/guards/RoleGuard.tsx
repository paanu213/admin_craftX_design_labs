"use client";

import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/lib/permissions";

interface RoleGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ permission, children, fallback = null }: RoleGuardProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
