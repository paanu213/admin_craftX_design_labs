"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, IndianRupee, ReceiptText, Wallet } from "lucide-react";

interface FinanceSummary {
  revenue?: number;
  gst?: number;
  refunds?: number;
  expenses?: number;
  profit?: number;
  currency?: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function TravelanFinancePage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: firstOfMonth(), to: today() });

  const { data, isLoading, error } = useQuery<FinanceSummary>({
    queryKey: ["travelan", "finance", applied.from, applied.to],
    queryFn: () => {
      const params = new URLSearchParams({ from: applied.from, to: applied.to });
      return travelanFetch(`finance/summary?${params}`);
    },
    retry: 1,
  });

  const metrics = [
    { label: "Revenue", value: data?.revenue, icon: IndianRupee, positive: true },
    { label: "GST Collected", value: data?.gst, icon: ReceiptText, positive: true },
    { label: "Refunds", value: data?.refunds, icon: TrendingDown, positive: false },
    { label: "Expenses", value: data?.expenses, icon: Wallet, positive: false },
    { label: "Net Profit", value: data?.profit, icon: TrendingUp, positive: true },
  ];

  return (
    <>
      <Header title="Finance" />
      <PageWrapper>
        <PageHeader
          title="Finance Summary"
          description="Revenue, GST, refunds, expenses, and profit for the selected period"
        />

        {/* Date range filter */}
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input
              id="from"
              type="date"
              className="w-40"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input
              id="to"
              type="date"
              className="w-40"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => setApplied({ from, to })}>
            Apply
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map(({ label, value, icon: Icon, positive }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${positive ? "text-muted-foreground" : "text-destructive/60"}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <p className={`text-xl font-bold ${value !== undefined && !positive && value > 0 ? "text-destructive" : ""}`}>
                    {value !== undefined
                      ? `₹${(value / 100).toLocaleString("en-IN")}`
                      : "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    </>
  );
}
