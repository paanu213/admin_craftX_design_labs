"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Users,
  Receipt,
  TrendingUp,
  Clock,
  UserCheck,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, CLIENT_STATUS_LABELS, CLIENT_STATUS_VARIANT } from "@/lib/utils";
import {
  AreaChart,
  Area,
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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  TRIAL: "#3b82f6",
  INACTIVE: "#f59e0b",
  CHURNED: "#ef4444",
};

const CATEGORY_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#f97316",
];

interface TopSpender {
  userId: string;
  name: string;
  role: string;
  total: number;
  count: number;
}

interface DashboardData {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  totalExpenses: number;
  pendingExpenses: number;
  monthlyExpenses: number;
  isAdmin: boolean;
  topSpenders: TopSpender[];
  recentClients: Array<{
    id: string;
    name: string;
    company: string;
    status: string;
    createdAt: string;
  }>;
  expenseByCategory: Array<{ category: string; total: number }>;
  clientsByStatus: Array<{ status: string; count: number }>;
  monthlyExpenseTrend: Array<{ label: string; total: number }>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CLIENT_STATUS_VARIANT[status] ?? "secondary"}>
      {CLIENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CEO: "CEO",
  CMO: "CMO",
  CFO: "CFO",
  CTO: "CTO",
  COO: "COO",
};

export function DashboardContent({ userName }: { userName: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {userName.split(" ")[0]}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at CraftX today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Clients"
          value={data?.totalClients ?? 0}
          description={`${data?.activeClients ?? 0} active • ${data?.trialClients ?? 0} on trial`}
          icon={Users}
          iconClassName="bg-blue-500"
        />
        <StatCard
          title="Active Clients"
          value={data?.activeClients ?? 0}
          icon={UserCheck}
          iconClassName="bg-emerald-500"
        />
        <StatCard
          title="Trial Clients"
          value={data?.trialClients ?? 0}
          icon={Clock}
          iconClassName="bg-violet-500"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(data?.totalExpenses ?? 0)}
          icon={DollarSign}
          iconClassName="bg-rose-500"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(data?.monthlyExpenses ?? 0)}
          icon={TrendingUp}
          iconClassName="bg-amber-500"
        />
        <StatCard
          title="Pending Approval"
          value={data?.pendingExpenses ?? 0}
          description="Expenses awaiting review"
          icon={Receipt}
          iconClassName="bg-orange-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.monthlyExpenseTrend ?? []}>
                <defs>
                  <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#expGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clients by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.clientsByStatus ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={3}
                >
                  {(data?.clientsByStatus ?? []).map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? CATEGORY_COLORS[index]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [v, CLIENT_STATUS_LABELS[String(name)] ?? name]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Legend
                  formatter={(value) => CLIENT_STATUS_LABELS[value] ?? value}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Spenders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {data?.isAdmin ? "Top 5 Spenders" : "My Expense Summary"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground"
            onClick={() => router.push("/expenses")}
          >
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {!data?.topSpenders?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expenses recorded yet
            </p>
          ) : (
            <div className="space-y-1">
              {data.topSpenders.map((spender, index) => (
                <div
                  key={spender.userId}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{spender.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[spender.role] ?? spender.role} &middot; {spender.count} expense{spender.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(spender.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentClients?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No clients yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={client.status} />
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
