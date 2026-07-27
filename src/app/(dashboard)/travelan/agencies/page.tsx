"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, Building2, Phone, Mail, Globe } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  plan?: string;
  status?: string;
  createdAt?: string;
  agencyCode?: string;
}

interface AgenciesResponse {
  data: Agency[];
  meta?: { total: number; page: number; totalPages: number };
}

const PLAN_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  FREE: "outline",
  PRO: "default",
  BUSINESS: "secondary",
};

export default function TravelanAgenciesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<AgenciesResponse>({
    queryKey: ["travelan", "agencies", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      return travelanFetch(`agencies?${params}`);
    },
    retry: 1,
  });

  const agencies = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <>
      <Header title="Agencies" />
      <PageWrapper>
        <PageHeader
          title="Agencies"
          description={`${total} registered agencies on Travelan`}
        />

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search agencies…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
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
                      {agency.agencyCode && (
                        <p className="text-[10px] text-muted-foreground">{agency.agencyCode}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {agency.plan && (
                        <Badge variant={PLAN_COLORS[agency.plan] ?? "outline"} className="text-[10px]">
                          {agency.plan}
                        </Badge>
                      )}
                      {agency.status && (
                        <Badge variant={agency.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                          {agency.status}
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
                    {agency.website && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 shrink-0" />
                        <a href={agency.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground">
                          {agency.website}
                        </a>
                      </div>
                    )}
                  </div>
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
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
