"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  agency?: { id: string; name: string; email: string };
  amount: number;
  reason?: string;
  status: string;
  gatewayRefundId?: string;
  createdAt: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

function today() { return new Date().toISOString().slice(0, 10); }
function threeMonthsAgo() {
  const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
}

export default function TravelanRefundsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [from, setFrom] = useState(threeMonthsAgo());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: threeMonthsAgo(), to: today() });

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "refunds", page, statusFilter, applied],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("from", applied.from);
      params.set("to", applied.to);
      return travelanFetch(`refunds?${params}`);
    },
    retry: 1,
  });

  const refunds = extractList<Refund>(data);
  const { total, totalPages } = extractPagination(data);
  const rawData = data as Record<string, unknown> | undefined;
  const totalAmount = typeof rawData?.totalRefundAmount === "number" ? rawData.totalRefundAmount : undefined;

  return (
    <>
      <Header title="Refunds" />
      <PageWrapper>
        <PageHeader
          title="Refunds"
          description={`${total} refund requests${totalAmount !== undefined ? ` · Total: ₹${(totalAmount / 100).toLocaleString("en-IN")}` : ""}`}
        />

        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-from" className="text-xs">From</Label>
            <Input id="rf-from" type="date" className="w-36" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-to" className="text-xs">To</Label>
            <Input id="rf-to" type="date" className="w-36" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setApplied({ from, to }); setPage(1); }}>Apply</Button>
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
                  <TableHead>Gateway Ref</TableHead>
                  <TableHead>Requested</TableHead>
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
                      <TableCell className="text-sm font-medium">{refund.agency?.name ?? "—"}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                        {refund.gatewayRefundId ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(refund.createdAt).toLocaleDateString()}
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
