import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// One-time first-run admin initializer.
// Only works when the users table is completely empty — auto-locks itself
// after the first account is created. No token or env var required.
export async function GET() {
  try {
    const count = await db.user.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Setup already complete — users already exist in this database." },
        { status: 403 }
      );
    }

    const hashed = await bcrypt.hash("Admin@123", 12);

    const admin = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@craftxlabs.com",
        password: hashed,
        role: "CEO",
        isActive: true,
      },
    });

    const fullPermissions = Object.fromEntries(
      [
        "dashboard", "clients", "applications", "expenses", "payments",
        "users", "settings", "keys", "master-data", "dev-passwords", "user-groups",
      ].map((m) => [m, { read: true, create: true, update: true, delete: true }])
    );

    const group = await db.userGroup.create({
      data: {
        name: "Super Admin",
        description: "Full system access",
        permissions: fullPermissions,
        isActive: true,
      },
    });

    await db.userGroupMember.create({
      data: { userId: admin.id, groupId: group.id },
    });

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully!",
      email: "admin@craftxlabs.com",
      password: "Admin@123",
      note: "This endpoint is now permanently locked — it will return 403 on future visits.",
    });
  } catch (error) {
    console.error("[GET /api/setup/init-admin]", error);
    return NextResponse.json({ error: "Setup failed. Check server logs." }, { status: 500 });
  }
}
