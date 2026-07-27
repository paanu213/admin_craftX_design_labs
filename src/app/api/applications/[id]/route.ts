import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationSchema } from "@/lib/validations/application.schema";
import { canDo } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const app = await db.application.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { subscriptions: true } },
        subscriptions: {
          include: {
            client: { select: { id: true, name: true, company: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json({
      ...app,
      monthlyPrice: app.monthlyPrice ? Number(app.monthlyPrice) : null,
      yearlyPrice: app.yearlyPrice ? Number(app.yearlyPrice) : null,
      subscriptions: app.subscriptions.map((s: { price: unknown; [k: string]: unknown }) => ({ ...s, price: Number(s.price) })),
    });
  } catch (error) {
    console.error("[GET /api/applications/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'applications', 'update')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = applicationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.application.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const data = result.data;
    const updated = await db.application.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        version: data.version,
        status: data.status ?? "ACTIVE",
        logoUrl: data.logoUrl || null,
        monthlyPrice: data.monthlyPrice ?? null,
        yearlyPrice: data.yearlyPrice ?? null,
        currency: data.currency ?? "INR",
        website: data.website || null,
        playStoreUrl: data.playStoreUrl || null,
        appStoreUrl: data.appStoreUrl || null,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { subscriptions: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      monthlyPrice: updated.monthlyPrice ? Number(updated.monthlyPrice) : null,
      yearlyPrice: updated.yearlyPrice ? Number(updated.yearlyPrice) : null,
    });
  } catch (error) {
    console.error("[PUT /api/applications/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'applications', 'delete')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.application.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (existing._count.subscriptions > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing._count.subscriptions} active subscription(s) linked to this application`,
        },
        { status: 409 }
      );
    }

    await db.application.delete({ where: { id } });
    return NextResponse.json({ message: "Application deleted" });
  } catch (error) {
    console.error("[DELETE /api/applications/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
