"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Subscription {
  id: string;
  agency?: { id: string; name: string; email: string; country?: string };
  plan: string;
  amount: number;
  gstAmount?: number;
  billingCycle: string;
  status: string;
  startDate: string;
  endDate?: string;
  couponRedemptions?: Array<{ discountAmount: number; coupon: { code: string } }>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function threeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

export default function TravelanSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [billingFilter, setBillingFilter] = useState("ALL");
  const [from, setFrom] = useState(threeMonthsAgo());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: threeMonthsAgo(), to: today() });

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "subscriptions", page, statusFilter, planFilter, billingFilter, applied],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (planFilter !== "ALL") params.set("plan", planFilter);
      if (billingFilter !== "ALL") params.set("billingCycle", billingFilter);
      params.set("from", applied.from);
      params.set("to", applied.to);
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

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Plan</Label>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Plans</SelectItem>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Billing</Label>
            <Select value={billingFilter} onValueChange={(v) => { setBillingFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Billing</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-from" className="text-xs">From</Label>
            <Input id="sub-from" type="date" className="w-36" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-to" className="text-xs">To</Label>
            <Input id="sub-to" type="date" className="w-36" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setApplied({ from, to }); setPage(1); }}>Apply</Button>
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
                      <p className="font-medium text-sm">{sub.agency?.name ?? "—"}</p>
                      {sub.agency?.email && <p className="text-xs text-muted-foreground">{sub.agency.email}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      ₹{(sub.amount / 100).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{sub.billingCycle?.toLowerCase()}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
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
