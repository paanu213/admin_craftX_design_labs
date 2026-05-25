import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    ] = await Promise.all([
      // Total clients
      db.client.count(),

      // Active clients
      db.client.count({ where: { status: "ACTIVE" } }),

      // Trial clients
      db.client.count({ where: { status: "TRIAL" } }),

      // Total approved expenses sum
      db.expense.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),

      // Pending expenses count
      db.expense.count({ where: { status: "PENDING" } }),

      // Monthly approved expenses sum
      db.expense.aggregate({
        where: {
          status: "APPROVED",
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
        where: { status: "APPROVED" },
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
            expenseDate: { gte: month.start, lte: month.end },
          },
          _sum: { amount: true },
        })
      ),
    ]);

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
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
