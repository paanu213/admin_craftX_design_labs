import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!canDo(session.user.permissionMatrix, "masterData", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { label, isActive } = body as { label?: string; isActive?: boolean };

    const category = await db.appCategoryMaster.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.appCategoryMaster.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/master-data/categories/:id]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!canDo(session.user.permissionMatrix, "masterData", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const category = await db.appCategoryMaster.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (category.isSystem) {
      return NextResponse.json({ error: "System categories cannot be deleted" }, { status: 403 });
    }

    await db.appCategoryMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/master-data/categories/:id]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
