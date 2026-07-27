"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, Building2, Phone, Mail, Users, Map } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  email: string;
  slug?: string;
  phone?: string;
  country?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  createdAt?: string;
  userCount?: number;
  customerCount?: number;
  tripCount?: number;
}

const PLAN_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  FREE: "outline",
  PRO: "default",
  BUSINESS: "secondary",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  INACTIVE: "outline",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};

export default function TravelanAgenciesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "agencies", page, search, statusFilter, planFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (planFilter !== "ALL") params.set("plan", planFilter);
      return travelanFetch(`agencies?${params}`);
    },
    retry: 1,
  });

  const agencies = extractList<Agency>(data);
  const { total, totalPages } = extractPagination(data);

  return (
    <>
      <Header title="Agencies" />
      <PageWrapper>
        <PageHeader title="Agencies" description={`${total} registered agencies on Travelan`} />

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Plans</SelectItem>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="BUSINESS">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : agencies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No agencies found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies.map((agency) => (
              <Card key={agency.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{agency.name}</p>
                      {agency.slug && <p className="text-[10px] text-muted-foreground">{agency.slug}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      {agency.subscriptionPlan && (
                        <Badge variant={PLAN_COLORS[agency.subscriptionPlan] ?? "outline"} className="text-[10px]">
                          {agency.subscriptionPlan}
                        </Badge>
                      )}
                      {agency.subscriptionStatus && (
                        <Badge variant={STATUS_COLORS[agency.subscriptionStatus] ?? "secondary"} className="text-[10px]">
                          {agency.subscriptionStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {agency.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{agency.email}</span>
                      </div>
                    )}
                    {agency.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{agency.phone}</span>
                      </div>
                    )}
                    {agency.country && (
                      <div className="flex items-center gap-1.5">
                        <Map className="h-3 w-3 shrink-0" />
                        <span>{agency.country}</span>
                      </div>
                    )}
                  </div>
                  {(agency.userCount !== undefined || agency.customerCount !== undefined) && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {agency.userCount !== undefined && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{agency.userCount} users</span>
                      )}
                      {agency.customerCount !== undefined && (
                        <span>{agency.customerCount} customers</span>
                      )}
                      {agency.tripCount !== undefined && (
                        <span>{agency.tripCount} trips</span>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-auto gap-2"
                    onClick={() => router.push(`/travelan/agencies/${agency.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
