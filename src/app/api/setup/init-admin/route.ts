import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// One-time admin initializer.
// Protected by SETUP_TOKEN env var — if the var is not set, this route returns 404.
// After creating the admin, remove SETUP_TOKEN from your environment.
export async function POST(request: NextRequest) {
  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token || token !== setupToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const hashed = await bcrypt.hash("Admin@123", 12);

    await db.user.upsert({
      where: { email: "admin@craftxlabs.com" },
      update: {
        password: hashed,
        isActive: true,
        role: "CEO",
      },
      create: {
        name: "Admin User",
        email: "admin@craftxlabs.com",
        password: hashed,
        role: "CEO",
        isActive: true,
      },
    });

    // Ensure the user is in a Super Admin group with full permissions
    const fullPermissions = Object.fromEntries(
      [
        "dashboard","clients","applications","expenses","payments",
        "users","settings","keys","master-data","dev-passwords","user-groups",
      ].map((m) => [m, { read: true, create: true, update: true, delete: true }])
    );

    const group = await db.userGroup.upsert({
      where: { name: "Super Admin" },
      update: { permissions: fullPermissions, isActive: true },
      create: {
        name: "Super Admin",
        description: "Full system access",
        permissions: fullPermissions,
        isActive: true,
      },
    });

    const admin = await db.user.findUnique({ where: { email: "admin@craftxlabs.com" } });
    if (admin) {
      await db.userGroupMember.upsert({
        where: { userId_groupId: { userId: admin.id, groupId: group.id } },
        update: {},
        create: { userId: admin.id, groupId: group.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created/reset. Remove SETUP_TOKEN from your environment after logging in.",
      email: "admin@craftxlabs.com",
    });
  } catch (error) {
    console.error("[POST /api/setup/init-admin]", error);
    return NextResponse.json({ error: "Failed to initialize admin" }, { status: 500 });
  }
}
