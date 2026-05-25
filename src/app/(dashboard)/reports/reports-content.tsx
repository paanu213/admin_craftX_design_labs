"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import { formatCurrency, EXPENSE_CATEGORY_LABELS } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#f97316",
];

interface DashboardData {
  totalExpenses: number;
  monthlyExpenses: number;
  expenseByCategory: Array<{ category: string; total: number }>;
  monthlyExpenseTrend: Array<{ label: string; total: number }>;
  clientsByStatus: Array<{ status: string; count: number }>;
  totalClients: number;
  activeClients: number;
}

function exportToCSV(data: unknown[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0] as object);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsContent() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const categoryData = (data?.expenseByCategory ?? []).map((item) => ({
    ...item,
    name: EXPENSE_CATEGORY_LABELS[item.category] ?? item.category,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and summaries for business insights"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                data?.expenseByCategory ?? [],
                "expense-by-category.csv"
              )
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Expenses (All Time)</p>
            <p className="text-3xl font-bold mt-1">
              {formatCurrency(data?.totalExpenses ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-3xl font-bold mt-1">
              {formatCurrency(data?.monthlyExpenses ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Clients</p>
            <p className="text-3xl font-bold mt-1">{data?.totalClients ?? 0}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {data?.activeClients ?? 0} active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">6-Month Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.monthlyExpenseTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v ?? 0)), "Expenses"]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="total"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v ?? 0)), "Total"]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {!categoryData.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No approved expenses yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">
                      Total (Approved)
                    </th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoryData.map((item) => (
                    <tr key={item.category}>
                      <td className="py-2 font-medium">{item.name}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {data?.totalExpenses
                          ? ((item.total / data.totalExpenses) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">
                      {formatCurrency(data?.totalExpenses ?? 0)}
                    </td>
                    <td className="pt-2 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
