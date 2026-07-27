"use client";

import { useQuery } from "@tanstack/react-query";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, Ticket, TrendingUp } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  suffix,
}: {
  title: string;
  value: string | number | undefined;
  icon: React.ElementType;
  loading: boolean;
  suffix?: string;
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
          <p className="text-2xl font-bold">
            {value !== undefined ? value : "—"}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function pick(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number") return v;
    // handle nested: obj.agencies.total
    if (v && typeof v === "object") {
      const inner = v as Record<string, unknown>;
      for (const subKey of ["total", "count", "active", "open"]) {
        if (typeof inner[subKey] === "number") return inner[subKey] as number;
      }
    }
  }
  return undefined;
}

export default function TravelanOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["travelan", "overview"],
    queryFn: () => travelanFetch("overview"),
    retry: false,
    throwOnError: false,
  });

  const stats = (data ?? {}) as Record<string, unknown>;

  const totalAgencies = pick(stats, "totalAgencies", "agencyCount", "agencies");
  const activeSubscriptions = pick(stats, "activeSubscriptions", "subscriptionCount", "subscriptions");
  const openTickets = pick(stats, "openTickets", "ticketCount", "tickets");
  const revenue = pick(stats, "revenue", "totalRevenue", "revenueTotal", "monthlyRevenue");

  return (
    <>
      <Header title="Travelan Overview" />
      <PageWrapper>
        <PageHeader
          title="Travelan Dashboard"
          description="Overview of the Travelan travel agency SaaS platform"
          actions={
            <Badge variant="secondary" className="text-xs">
              Live Data
            </Badge>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Agencies" value={totalAgencies} icon={Users} loading={isLoading} />
          <StatCard title="Active Subscriptions" value={activeSubscriptions} icon={CreditCard} loading={isLoading} />
          <StatCard title="Open Tickets" value={openTickets} icon={Ticket} loading={isLoading} />
          <StatCard
            title="Revenue"
            value={revenue !== undefined ? `₹${(revenue / 100).toLocaleString("en-IN")}` : undefined}
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>
      </PageWrapper>
    </>
  );
}
