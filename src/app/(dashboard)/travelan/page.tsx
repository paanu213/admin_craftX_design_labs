"use client";

import { useQuery } from "@tanstack/react-query";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, IndianRupee, Ticket, MessageSquare, TrendingUp } from "lucide-react";

interface OverviewData {
  agencies?: {
    total?: number;
    newLast30Days?: number;
    byStatus?: Record<string, number>;
    byPlan?: Record<string, number>;
  };
  revenue?: {
    activeSubscriptionsTotalPaise?: number;
    monthlySubscriptionsPaise?: number;
    yearlySubscriptionsPaise?: number;
  };
  openTickets?: number;
  totalContactMessages?: number;
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number | undefined;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="text-2xl font-bold">{value !== undefined ? value : "—"}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function TravelanOverviewPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["travelan", "overview"],
    queryFn: () => travelanFetch("overview"),
    retry: false,
    throwOnError: false,
  });

  const totalAgencies = data?.agencies?.total;
  const activeAgencies = data?.agencies?.byStatus?.ACTIVE;
  const newAgencies = data?.agencies?.newLast30Days;
  const openTickets = data?.openTickets;
  const contactMessages = data?.totalContactMessages;
  const totalRevenuePaise = data?.revenue?.activeSubscriptionsTotalPaise;
  const totalRevenue = totalRevenuePaise !== undefined
    ? `₹${(totalRevenuePaise / 100).toLocaleString("en-IN")}`
    : undefined;

  return (
    <>
      <Header title="Travelan Overview" />
      <PageWrapper>
        <PageHeader
          title="Travelan Dashboard"
          description="Platform-wide overview of the Travelan travel agency SaaS"
          actions={<Badge variant="secondary" className="text-xs">Live Data</Badge>}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Agencies"
            value={totalAgencies}
            sub={newAgencies !== undefined ? `+${newAgencies} in last 30 days` : undefined}
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            title="Active Agencies"
            value={activeAgencies}
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            title="Active Subscription Revenue"
            value={totalRevenue}
            icon={IndianRupee}
            loading={isLoading}
          />
          <StatCard
            title="Open Tickets"
            value={openTickets}
            icon={Ticket}
            loading={isLoading}
          />
          <StatCard
            title="Contact Messages"
            value={contactMessages}
            icon={MessageSquare}
            loading={isLoading}
          />
        </div>

        {/* Plan breakdown */}
        {data?.agencies?.byPlan && !isLoading && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Agencies by Plan</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.agencies.byPlan).map(([plan, count]) => (
                <Badge key={plan} variant="outline" className="text-sm px-3 py-1">
                  {plan}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
