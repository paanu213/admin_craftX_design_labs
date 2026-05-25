"use client";

import { useSession } from "next-auth/react";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { UserRole } from "@/types";

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!role) return false;
    return permissions.some((p) => hasPermission(role, p));
  };

  return { can, canAny, role };
}
