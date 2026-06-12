import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth.schema";
import type { UserRole } from "@/types";
import {
  computeEffectivePermissions,
  getPermissionsFromRole,
  FULL_PERMISSIONS,
  MODULES,
  type PermissionMatrix,
} from "@/lib/permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user as { role: UserRole }).role;
      }

      // Re-fetch group permissions on EVERY token refresh (not just sign-in).
      // This means group permission changes take effect immediately without re-login.
      if (token.id) {
        try {
          const groups = await db.userGroup.findMany({
            where: {
              members: { some: { userId: token.id as string } },
              isActive: true,
            },
            select: { id: true, name: true, permissions: true },
          });

          if (groups.length > 0) {
            token.groups = groups.map(g => ({ id: g.id, name: g.name }));
            const effective = computeEffectivePermissions(
              groups.map(g => g.permissions as Partial<PermissionMatrix>)
            );
            // If group permissions cover every module fully → grant FULL_PERMISSIONS
            // so adding new modules to MODULES auto-grants them too
            const isGroupFullAdmin = MODULES.every(m =>
              effective[m.key]?.read && effective[m.key]?.create &&
              effective[m.key]?.update && effective[m.key]?.delete
            );
            token.permissionMatrix = isGroupFullAdmin ? FULL_PERMISSIONS : effective;
          } else {
            token.groups = [];
            token.permissionMatrix = getPermissionsFromRole(token.role as string);
          }
        } catch {
          // DB unavailable — keep existing token permissions or fall back to role
          if (!token.permissionMatrix) {
            token.permissionMatrix = getPermissionsFromRole(token.role as string);
          }
        }
      }

      // Fallback for sessions predating the permissionMatrix field
      if (!token.permissionMatrix && token.role) {
        token.permissionMatrix = getPermissionsFromRole(token.role as string);
      }

      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.permissionMatrix = token.permissionMatrix as PermissionMatrix;
        session.user.groups = (token.groups as { id: string; name: string }[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
});
