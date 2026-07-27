"use client";

import { useQuery } from "@tanstack/react-query";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, Ticket, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalAgencies?: number;
  activeSubscriptions?: number;
  openTickets?: number;
  monthlyRevenue?: number;
  currency?: string;
}

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

export default function TravelanOverviewPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["travelan", "dashboard"],
    queryFn: () => travelanFetch("overview"),
    retry: false,
    // Silently ignore 404s — the backend may not expose this endpoint yet
    throwOnError: false,
  });

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
          <StatCard title="Total Agencies" value={data?.totalAgencies} icon={Users} loading={isLoading} />
          <StatCard title="Active Subscriptions" value={data?.activeSubscriptions} icon={CreditCard} loading={isLoading} />
          <StatCard title="Open Tickets" value={data?.openTickets} icon={Ticket} loading={isLoading} />
          <StatCard
            title="Monthly Revenue"
            value={data?.monthlyRevenue !== undefined ? `₹${(data.monthlyRevenue / 100).toLocaleString("en-IN")}` : undefined}
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>
      </PageWrapper>
    </>
  );
}
