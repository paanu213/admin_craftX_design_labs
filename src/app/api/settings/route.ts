import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MANAGE_ROLES = ["SUPER_ADMIN", "CEO"];

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await db.systemConfig.findMany();
    const result: Record<string, string> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!MANAGE_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only CEO or Super Admin can update settings" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { key, value } = body as { key?: string; value?: string };

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    if (value === undefined || value === null) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }

    const config = await db.systemConfig.upsert({
      where: { key: key.trim() },
      update: {
        value: String(value),
        updatedById: session.user.id,
      },
      create: {
        key: key.trim(),
        value: String(value),
        updatedById: session.user.id,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[PATCH /api/settings]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
