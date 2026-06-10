"use client";

import { useSession } from "next-auth/react";
import { can as checkPermission, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();

  const can = (permission: Permission): boolean => {
    if (!session?.user?.permissionMatrix) return false;
    return checkPermission(session.user.permissionMatrix, permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!session?.user?.permissionMatrix) return false;
    return permissions.some((p) => checkPermission(session.user.permissionMatrix, p));
  };

  return { can, canAny, role: session?.user?.role };
}
