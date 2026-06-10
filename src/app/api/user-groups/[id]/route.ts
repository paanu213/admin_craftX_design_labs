import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  isActive: z.boolean().optional(),
  permissions: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.userGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await request.json();

    const result = updateGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check name uniqueness if name is being changed
    if (result.data.name && result.data.name !== existing.name) {
      const nameConflict = await db.userGroup.findUnique({ where: { name: result.data.name } });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A group with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await db.userGroup.update({
      where: { id },
      data: {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.isActive !== undefined && { isActive: result.data.isActive }),
        ...(result.data.permissions !== undefined && { permissions: result.data.permissions as Parameters<typeof db.userGroup.update>[0]["data"]["permissions"] }),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/user-groups/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.userGroup.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (existing._count.members > 0) {
      return NextResponse.json(
        { error: "Cannot delete a group that has members. Remove all members first." },
        { status: 409 }
      );
    }

    await db.userGroup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/user-groups/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
