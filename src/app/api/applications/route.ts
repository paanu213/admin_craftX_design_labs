import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationSchema } from "@/lib/validations/application.schema";

const ADMIN_ROLES = ["SUPER_ADMIN", "CEO", "CFO", "CTO"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const where = {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(category && category !== "ALL" && { category: category as any }),
      ...(status && status !== "ALL" && { status: status as any }),
    };

    const apps = await db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { subscriptions: true } },
      },
    });

    const activeCountsRaw = await db.subscription.groupBy({
      by: ["applicationId"],
      where: { applicationId: { not: null } },
      _count: { id: true },
    });
    const activeMap = Object.fromEntries(
      activeCountsRaw
        .filter((r) => r.applicationId)
        .map((r) => [r.applicationId!, r._count.id])
    );

    const data = apps.map((app) => ({
      ...app,
      monthlyPrice: app.monthlyPrice ? Number(app.monthlyPrice) : null,
      yearlyPrice: app.yearlyPrice ? Number(app.yearlyPrice) : null,
      activeSubscriptions: activeMap[app.id] ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/applications]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = ADMIN_ROLES.includes(session.user.role) || session.user.role === "CMO";
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
