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
    const isAdmin = canDo(matrix, 'reports', 'read');
    const ownFilter = isAdmin ? {} : { createdById: session.user.id };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build last 6 months labels and date ranges
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        label: date.toLocaleString("en-US", { month: "short" }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    });

    const [
      [
        totalClients,
        activeClients,
        trialClients,
        totalExpensesResult,
        pendingExpenses,
        monthlyExpensesResult,
        recentClients,
        expenseByCategory,
        clientsByStatus,
        ...monthlyTrendResults
      ],
      topSpendersGroupBy,
    ] = await Promise.all([
      Promise.all([
        // Total clients
        db.client.count(),
        // Active clients
        db.client.count({ where: { status: "ACTIVE" } }),
        // Trial clients
        db.client.count({ where: { status: "TRIAL" } }),
        // Total approved expenses sum
        db.expense.aggregate({
          where: { status: "APPROVED", ...ownFilter },
          _sum: { amount: true },
        }),
        // Pending expenses count
        db.expense.count({ where: { status: "PENDING", ...ownFilter } }),
        // Monthly approved expenses sum
        db.expense.aggregate({
          where: {
            status: "APPROVED",
            ...ownFilter,
            expenseDate: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        // Recent 5 clients
        db.client.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            company: true,
            status: true,
            createdAt: true,
          },
        }),
        // Expense by category (APPROVED only)
        db.expense.groupBy({
          by: ["category"],
          where: { status: "APPROVED", ...ownFilter },
          _sum: { amount: true },
        }),
        // Clients by status
        db.client.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        // Monthly expense trend — one query per month
        ...last6Months.map((month) =>
          db.expense.aggregate({
            where: {
              status: "APPROVED",
              ...ownFilter,
              expenseDate: { gte: month.start, lte: month.end },
            },
            _sum: { amount: true },
          })
        ),
      ]),
      // Top 5 spenders by total submitted amount
      db.expense.groupBy({
        by: ["createdById"],
        where: ownFilter,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
    ]);

    const spenderIds = topSpendersGroupBy.map((s: { createdById: string }) => s.createdById);
    const spenderUsers = (
      spenderIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: spenderIds } },
            select: { id: true, name: true, role: true },
          })
        : []
    ) as Array<{ id: string; name: string; role: string }>;

    const topSpenders = topSpendersGroupBy.map((s: { createdById: string; _sum: { amount?: unknown }; _count: { id: number } }) => {
      const user = spenderUsers.find((u) => u.id === s.createdById);
      return {
        userId: s.createdById,
        name: user?.name ?? "Unknown",
        role: user?.role ?? "",
        total: Number(s._sum.amount ?? 0),
        count: s._count.id,
      };
    });

    const monthlyExpenseTrend = last6Months.map((month, i) => ({
      label: month.label,
      total: Number(monthlyTrendResults[i]._sum.amount ?? 0),
    }));

    return NextResponse.json({
      totalClients,
      activeClients,
      trialClients,
      totalExpenses: Number(totalExpensesResult._sum.amount ?? 0),
      pendingExpenses,
      monthlyExpenses: Number(monthlyExpensesResult._sum.amount ?? 0),
      recentClients,
      expenseByCategory: expenseByCategory.map((item: { category: string; _sum: { amount?: unknown } }) => ({
        category: item.category,
        total: Number(item._sum.amount ?? 0),
      })),
      clientsByStatus: clientsByStatus.map((item: { status: string; _count: { id: number } }) => ({
        status: item.status,
        count: item._count.id,
      })),
      monthlyExpenseTrend,
      topSpenders,
      isAdmin,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
