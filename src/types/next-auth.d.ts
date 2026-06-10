import type { UserRole } from "@/types";
import type { PermissionMatrix } from "@/lib/permissions";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      image?: string | null;
      permissionMatrix: PermissionMatrix;
      groups: { id: string; name: string }[];
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    permissionMatrix: PermissionMatrix;
    groups: { id: string; name: string }[];
  }
}
