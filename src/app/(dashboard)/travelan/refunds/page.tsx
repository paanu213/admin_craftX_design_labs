"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCcw } from "lucide-react";

interface Refund {
  id: string;
  agencyName?: string;
  amount: number;
  reason?: string;
  status: string;
  originalPaymentDate?: string;
  refundedAt?: string;
  createdAt: string;
}

interface RefundsResponse {
  data: Refund[];
  meta?: { total: number; page: number; totalPages: number; totalRefundAmount?: number };
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  PROCESSED: "default",
  REJECTED: "destructive",
};

export default function TravelanRefundsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, error } = useQuery<RefundsResponse>({
    queryKey: ["travelan", "refunds", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return travelanFetch(`refunds?${params}`);
    },
    retry: 1,
  });

  const refunds = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalAmount = data?.meta?.totalRefundAmount;

  return (
    <>
      <Header title="Refunds" />
      <PageWrapper>
        <PageHeader
          title="Refunds"
          description={`${total} refund requests${totalAmount !== undefined ? ` · Total: ₹${(totalAmount / 100).toLocaleString("en-IN")}` : ""}`}
        />

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {refunds.length === 0 && !isLoading && !error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <RefreshCcw className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No refunds found</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Refunded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="text-sm font-medium">{refund.agencyName ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">
                        ₹{(refund.amount / 100).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {refund.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[refund.status] ?? "outline"} className="text-xs">
                          {refund.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {refund.refundedAt ? new Date(refund.refundedAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

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
