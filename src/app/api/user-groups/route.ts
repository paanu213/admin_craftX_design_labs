import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  permissions: z.record(z.string(), z.unknown()).optional(),
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

    const groups = await db.userGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("[GET /api/user-groups]", error);
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

    const result = createGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.userGroup.findUnique({ where: { name: result.data.name } });
    if (existing) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }

    const group = await db.userGroup.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        permissions: (result.data.permissions ?? {}) as Parameters<typeof db.userGroup.create>[0]["data"]["permissions"],
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("[POST /api/user-groups]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
