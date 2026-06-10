import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createUserApiSchema } from "@/lib/validations/auth.schema";
import { canDo } from "@/lib/permissions";

const createUserWithGroupSchema = createUserApiSchema.extend({
  groupIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
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
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'users', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const result = createUserWithGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const normalizedEmail = result.data.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    // Validate all group IDs
    if (result.data.groupIds && result.data.groupIds.length > 0) {
      for (const groupId of result.data.groupIds) {
        const group = await db.userGroup.findUnique({ where: { id: groupId } });
        if (!group) {
          return NextResponse.json({ error: `Group not found: ${groupId}` }, { status: 404 });
        }
      }
    }

    const user = await db.user.create({
      data: {
        name: result.data.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: result.data.role as Parameters<typeof db.user.create>[0]["data"]["role"],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create group memberships
    if (result.data.groupIds && result.data.groupIds.length > 0) {
      await db.userGroupMember.createMany({
        data: result.data.groupIds.map((groupId) => ({
          userId: user.id,
          groupId,
        })),
        skipDuplicates: true,
      });
    }

    const userWithGroups = await db.user.findUnique({
      where: { id: user.id },
      select: {
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
      },
    });

    return NextResponse.json(userWithGroups, { status: 201 });
  } catch (error) {
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
