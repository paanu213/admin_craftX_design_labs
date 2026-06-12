import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const categories = await db.appCategoryMaster.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[GET /api/master-data/categories]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!canDo(session.user.permissionMatrix, "users", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { key, label } = body as { key?: string; label?: string };

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    if (!normalizedKey) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const existing = await db.appCategoryMaster.findUnique({ where: { key: normalizedKey } });
    if (existing) {
      return NextResponse.json({ error: "A category with this key already exists" }, { status: 409 });
    }

    const maxOrder = await db.appCategoryMaster.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const category = await db.appCategoryMaster.create({
      data: { key: normalizedKey, label: label.trim(), sortOrder },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("[POST /api/master-data/categories]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
