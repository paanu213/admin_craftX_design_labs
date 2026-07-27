import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeEffectivePermissions, MODULES, type PermissionMatrix } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const userId = session.user.id;

    // Re-run exact same logic as auth.ts jwt callback
    const groups = await db.userGroup.findMany({
      where: { members: { some: { userId } }, isActive: true },
      select: { id: true, name: true, permissions: true, isActive: true },
    }) as Array<{ id: string; name: string; permissions: unknown; isActive: boolean }>;

    const effective = computeEffectivePermissions(
      groups.map(g => g.permissions as Partial<PermissionMatrix>)
    );

    const hasFullAccessSentinel = groups.some(
      g => (g.permissions as Record<string, unknown>)?.__fullAccess === true
    );
    const isSuperAdminGroup = groups.some(
      g => g.name.toLowerCase() === "super admin"
    );
    const allModulesTrue = MODULES.every(m =>
      effective[m.key]?.read && effective[m.key]?.create &&
      effective[m.key]?.update && effective[m.key]?.delete
    );

    return NextResponse.json({
      userId,
      email: session.user.email,
      role: session.user.role,
      groups: groups.map(g => ({
        name: g.name,
        isActive: g.isActive,
        hasFullAccessSentinel: (g.permissions as Record<string, unknown>)?.__fullAccess === true,
        hasProductsRead: (g.permissions as Record<string, Record<string, unknown>>)?.products?.read === true,
      })),
      checks: {
        hasFullAccessSentinel,
        isSuperAdminGroup,
        allModulesTrue,
        wouldGetFullPermissions: hasFullAccessSentinel || isSuperAdminGroup || allModulesTrue,
      },
      sessionPermissionMatrix: {
        productsRead: session.user.permissionMatrix?.products?.read ?? null,
        usersCreate: session.user.permissionMatrix?.users?.create ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
