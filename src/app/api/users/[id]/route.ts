import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateUserApiSchema } from "@/lib/validations/auth.schema";

const updateUserWithGroupSchema = updateUserApiSchema.extend({
  groupId: z.string().nullable().optional(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  groupId: true,
  group: {
    select: { id: true, name: true, defaultRole: true },
  },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/users/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();

    const result = updateUserWithGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Resolve role from group if groupId is being set
    let resolvedRole = result.data.role;
    if (result.data.groupId !== undefined && result.data.groupId !== null) {
      const group = await db.userGroup.findUnique({ where: { id: result.data.groupId } });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      resolvedRole = group.defaultRole;
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(resolvedRole !== undefined && {
          role: resolvedRole as Parameters<typeof db.user.update>[0]["data"]["role"],
        }),
        ...(result.data.isActive !== undefined && { isActive: result.data.isActive }),
        ...(result.data.groupId !== undefined && { groupId: result.data.groupId }),
      },
      select: userSelect,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/users/[id]]", error);
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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deactivated = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });

    return NextResponse.json(deactivated);
  } catch (error) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
