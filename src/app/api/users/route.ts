import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createUserApiSchema } from "@/lib/validations/auth.schema";

const createUserWithGroupSchema = createUserApiSchema.extend({
  groupId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
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
        groupId: true,
        group: {
          select: { id: true, name: true, defaultRole: true },
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

    if (session.user.role !== "SUPER_ADMIN") {
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

    const existing = await db.user.findUnique({ where: { email: result.data.email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    // If groupId provided, fetch the group and use its defaultRole
    let resolvedRole = result.data.role;
    let resolvedGroupId: string | undefined = result.data.groupId;
    if (resolvedGroupId) {
      const group = await db.userGroup.findUnique({ where: { id: resolvedGroupId } });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      resolvedRole = group.defaultRole;
    }

    const user = await db.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        password: hashedPassword,
        role: resolvedRole as Parameters<typeof db.user.create>[0]["data"]["role"],
        ...(resolvedGroupId ? { groupId: resolvedGroupId } : {}),
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
        groupId: true,
        group: {
          select: { id: true, name: true, defaultRole: true },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
