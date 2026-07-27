"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface Subscription {
  id: string;
  agencyName?: string;
  agencyEmail?: string;
  planName: string;
  price: number;
  billingCycle: string;
  status: string;
  startDate: string;
  endDate?: string;
  isAutoRenew?: boolean;
}


export default function TravelanSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "subscriptions", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      return travelanFetch(`subscriptions?${params}`);
    },
    retry: 1,
  });

  const subscriptions = extractList<Subscription>(data);
  const { total, totalPages } = extractPagination(data);

  return (
    <>
      <Header title="Subscriptions" />
      <PageWrapper>
        <PageHeader
          title="Subscriptions"
          description={`${total} subscriptions across all agencies`}
        />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search agency…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{sub.agencyName ?? "—"}</p>
                      {sub.agencyEmail && <p className="text-xs text-muted-foreground">{sub.agencyEmail}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.planName}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      ₹{(sub.price / 100).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{sub.billingCycle.toLowerCase()}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
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
