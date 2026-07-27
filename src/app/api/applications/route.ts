import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationSchema } from "@/lib/validations/application.schema";
import { canDo } from "@/lib/permissions";
import type { AppStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 12)));

    const where = {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(category && category !== "ALL" && { category }),
      ...(status && status !== "ALL" && { status: status as AppStatus }),
    };

    const [apps, total] = await Promise.all([
      db.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          _count: { select: { subscriptions: true } },
        },
      }),
      db.application.count({ where }),
    ]);

    const activeCountsRaw = await db.subscription.groupBy({
      by: ["applicationId"],
      where: { applicationId: { not: null } },
      _count: { id: true },
    }) as Array<{ applicationId: string | null; _count: { id: number } }>;
    const activeMap = Object.fromEntries(
      activeCountsRaw
        .filter((r) => r.applicationId)
        .map((r) => [r.applicationId!, r._count.id])
    );

    const data = apps.map((app: { id: string; monthlyPrice: unknown; yearlyPrice: unknown; [k: string]: unknown }) => ({
      ...app,
      monthlyPrice: app.monthlyPrice ? Number(app.monthlyPrice) : null,
      yearlyPrice: app.yearlyPrice ? Number(app.yearlyPrice) : null,
      activeSubscriptions: activeMap[app.id] ?? 0,
    }));

    return NextResponse.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/applications]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'applications', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = applicationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const app = await db.application.create({
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
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { subscriptions: true } },
      },
    });

    return NextResponse.json(
      {
        ...app,
        monthlyPrice: app.monthlyPrice ? Number(app.monthlyPrice) : null,
        yearlyPrice: app.yearlyPrice ? Number(app.yearlyPrice) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/applications]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
