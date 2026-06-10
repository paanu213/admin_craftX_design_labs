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

        const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
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

        // Fetch groups and compute permission matrix on sign-in
        // Wrapped in try/catch so a missing migration never breaks login
        try {
          const groups = await db.userGroup.findMany({
            where: {
              members: { some: { userId: user.id as string } },
              isActive: true,
            },
            select: { id: true, name: true, permissions: true },
          });

          if (groups.length > 0) {
            token.groups = groups.map(g => ({ id: g.id, name: g.name }));
            token.permissionMatrix = computeEffectivePermissions(
              groups.map(g => g.permissions as Partial<PermissionMatrix>)
            );
          } else {
            token.groups = [];
            token.permissionMatrix = getPermissionsFromRole(token.role as string);
          }

          // SUPER_ADMIN role always gets full access regardless of group config
          if (token.role === 'SUPER_ADMIN') {
            token.permissionMatrix = FULL_PERMISSIONS;
          }
        } catch {
          token.groups = [];
          token.permissionMatrix = getPermissionsFromRole(token.role as string);
        }
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
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
});
