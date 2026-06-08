import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getPeriodRange(period: string): { gte?: Date; lt?: Date } | undefined {
  const now = new Date();

  if (period === "this_month") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (period === "last_month") {
    return {
      gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      lt: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  if (period === "yearly") {
    return { gte: new Date(now.getFullYear(), 0, 1) };
  }
  return undefined; // "all" — no filter
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const period = new URL(request.url).searchParams.get("period") ?? "all";
    const dateRange = getPeriodRange(period);
    const where = dateRange ? { createdAt: dateRange } : {};

    const groups = await db.client.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      byStatus[g.status] = g._count._all;
      total += g._count._all;
    }

    return NextResponse.json({ total, byStatus });
  } catch (error) {
    console.error("[GET /api/clients/stats]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
