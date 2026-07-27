import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    const isAdmin = canDo(matrix, 'expenses', 'update');
    const ownFilter = isAdmin ? {} : { createdById: session.user.id };

    const [allGrouped, approvedGrouped, pendingGrouped]: [
      Array<{ createdById: string; _sum: { amount: unknown }; _count: { id: number } }>,
      Array<{ createdById: string; _sum: { amount: unknown } }>,
      Array<{ createdById: string; _count: { id: number } }>,
    ] = await Promise.all([
      db.expense.groupBy({
        by: ["createdById"],
        where: ownFilter,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      db.expense.groupBy({
        by: ["createdById"],
        where: { status: "APPROVED", ...ownFilter },
        _sum: { amount: true },
      }),
      db.expense.groupBy({
        by: ["createdById"],
        where: { status: "PENDING", ...ownFilter },
        _count: { id: true },
      }),
    ]);

    const userIds = allGrouped.map((g) => g.createdById);
    const users: Array<{ id: string; name: string; role: string }> =
      userIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, role: true },
          })
        : [];

    const summary = allGrouped.map((g) => {
      const user = users.find((u) => u.id === g.createdById);
      const approved = approvedGrouped.find((a) => a.createdById === g.createdById);
      const pending = pendingGrouped.find((p) => p.createdById === g.createdById);
      return {
        userId: g.createdById,
        name: user?.name ?? "Unknown",
        role: user?.role ?? "",
        total: Number(g._sum.amount ?? 0),
        count: g._count.id,
        approvedAmount: Number(approved?._sum.amount ?? 0),
        pendingCount: pending?._count.id ?? 0,
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/expenses/summary]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
