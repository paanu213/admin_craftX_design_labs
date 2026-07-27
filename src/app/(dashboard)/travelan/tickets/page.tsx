"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  agencyName?: string;
  createdAt: string;
  updatedAt?: string;
  repliesCount?: number;
}

interface TicketsResponse {
  data: Ticket[];
  meta?: { total: number; page: number; totalPages: number };
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
  CLOSED: "outline",
};

const PRIORITY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  URGENT: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
};

export default function TravelanTicketsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<TicketsResponse>({
    queryKey: ["travelan", "tickets", page, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return travelanFetch(`tickets?${params}`);
    },
    retry: 1,
  });

  const tickets = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <Header title="Support Tickets" />
      <PageWrapper>
        <PageHeader title="Support Tickets" description={`${total} tickets`} />

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No tickets found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => router.push(`/travelan/tickets/${ticket.id}`)}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ticket.title}</p>
                    {ticket.agencyName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.agencyName}</p>
                    )}
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      {ticket.repliesCount !== undefined && (
                        <>
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{ticket.repliesCount}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={STATUS_VARIANTS[ticket.status] ?? "outline"} className="text-[10px]">
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    {ticket.priority && (
                      <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "outline"} className="text-[10px]">
                        {ticket.priority}
                      </Badge>
                    )}
                  </div>
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
