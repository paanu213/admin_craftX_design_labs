"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
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
import { Tag } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  minAmount?: number;
  maxUses?: number;
  usedCount?: number;
  totalDiscountGiven?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export default function TravelanCouponsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("ALL");

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "coupons", page, activeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (activeFilter !== "ALL") params.set("isActive", activeFilter);
      return travelanFetch(`coupons?${params}`);
    },
    retry: 1,
  });

  const coupons = extractList<Coupon>(data);
  const { total, totalPages } = extractPagination(data);

  return (
    <>
      <Header title="Coupons" />
      <PageWrapper>
        <PageHeader title="Coupons" description={`${total} discount codes`} />

        <div className="flex gap-3">
          <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Coupons</SelectItem>
              <SelectItem value="true">Active Only</SelectItem>
              <SelectItem value="false">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {coupons.length === 0 && !isLoading && !error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No coupons found</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min. Amount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Total Saved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
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
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">{coupon.code}</code>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discount}%`
                          : `₹${(coupon.discount / 100).toLocaleString("en-IN")}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.minAmount ? `₹${(coupon.minAmount / 100).toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.usedCount ?? 0}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.totalDiscountGiven !== undefined
                          ? `₹${(coupon.totalDiscountGiven / 100).toLocaleString("en-IN")}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"} className="text-[10px]">
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
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
