import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateUserApiSchema } from "@/lib/validations/auth.schema";
import { canDo } from "@/lib/permissions";

const updateUserWithGroupSchema = updateUserApiSchema.extend({
  groupIds: z.array(z.string()).nullable().optional(),
  password: z.string().min(8).optional(),
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
  groupMemberships: {
    select: {
      group: { select: { id: true, name: true } },
    },
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

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
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

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'update')) {
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

    // Validate group IDs if provided
    if (result.data.groupIds && result.data.groupIds.length > 0) {
      for (const groupId of result.data.groupIds) {
        const group = await db.userGroup.findUnique({ where: { id: groupId } });
        if (!group) {
          return NextResponse.json({ error: `Group not found: ${groupId}` }, { status: 404 });
        }
      }
    }

    const hashedPassword = result.data.password
      ? await bcrypt.hash(result.data.password, 10)
      : undefined;

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(result.data.role !== undefined && {
          role: result.data.role as Parameters<typeof db.user.update>[0]["data"]["role"],
        }),
        ...(result.data.isActive !== undefined && { isActive: result.data.isActive }),
        ...(hashedPassword !== undefined && { password: hashedPassword }),
      },
      select: userSelect,
    });

    // Update group memberships if groupIds provided
    if (result.data.groupIds !== undefined) {
      // Delete existing memberships
      await db.userGroupMember.deleteMany({ where: { userId: id } });

      // Create new memberships
      if (result.data.groupIds && result.data.groupIds.length > 0) {
        await db.userGroupMember.createMany({
          data: result.data.groupIds.map((groupId) => ({
            userId: id,
            groupId,
          })),
          skipDuplicates: true,
        });
      }

      // Re-fetch with updated memberships
      const updatedWithGroups = await db.user.findUnique({
        where: { id },
        select: userSelect,
      });
      return NextResponse.json(updatedWithGroups);
    }

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

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
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
