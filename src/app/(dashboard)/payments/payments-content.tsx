"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Filter,
  Banknote,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECEIVER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/utils";
import type { Payment } from "@/types";

export function PaymentsContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<Record<string, string>>({});

  const isCEO = ["CEO", "SUPER_ADMIN"].includes(session?.user?.role ?? "");

  const { data: payments, isLoading, isError, refetch } = useQuery<Payment[]>({
    queryKey: ["payments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/payments?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load payments");
      return Array.isArray(json) ? json : [];
    },
  });

  async function handleDeposit(paymentId: string) {
    setDepositingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit" }),
    });
    setDepositingId(null);
    if (res.ok) {
      toast.success("Marked as deposited — awaiting CEO approval");
      refetch();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update");
    }
  }

  async function handleApprove(paymentId: string) {
    setApprovingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setApprovingId(null);
    if (res.ok) {
      toast.success("Payment approved");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to approve");
    }
  }

  async function handleReject(paymentId: string) {
    const note = rejectionNote[paymentId];
    if (!note?.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    setRejectingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: note }),
    });
    setRejectingId(null);
    if (res.ok) {
      toast.success("Payment rejected");
      setRejectionNote((prev) => ({ ...prev, [paymentId]: "" }));
      refetch();
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to reject");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description={
          isCEO
            ? "Review and approve client payments"
            : "Track payments you have recorded"
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING_DEPOSIT">Pending Deposit</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-destructive text-sm">Failed to load payments. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : !payments?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Banknote className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Received By
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Recorded By
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          className="font-medium text-foreground hover:text-primary hover:underline text-left"
                          onClick={() =>
                            router.push(`/clients/${payment.clientId}`)
                          }
                        >
                          {payment.client?.company ?? "—"}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {payment.client?.name}
                        </p>
                        {payment.isRenewal && (
                          <Badge variant="secondary" className="text-xs mt-0.5">
                            Renewal
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {PAYMENT_RECEIVER_LABELS[payment.receivedBy]}
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge
                            variant={
                              PAYMENT_STATUS_VARIANT[payment.status] ??
                              "secondary"
                            }
                            className="text-xs"
                          >
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </Badge>
                          {payment.status === "REJECTED" &&
                            payment.rejectionNote && (
                              <p className="text-xs text-destructive">
                                {payment.rejectionNote}
                              </p>
                            )}
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {formatDate(payment.paymentDate)}
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {payment.recordedBy.name}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() =>
                              router.push(`/clients/${payment.clientId}`)
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>

                          {/* Employee: deposit button */}
                          {payment.status === "PENDING_DEPOSIT" &&
                            payment.recordedById === session?.user?.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleDeposit(payment.id)}
                                disabled={depositingId === payment.id}
                              >
                                {depositingId === payment.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowUpCircle className="h-3 w-3" />
                                )}
                                Deposited
                              </Button>
                            )}

                          {/* CEO: approve */}
                          {isCEO && payment.status === "PENDING_APPROVAL" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleApprove(payment.id)}
                                disabled={approvingId === payment.id}
                              >
                                {approvingId === payment.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() =>
                                  setRejectionNote((prev) => ({
                                    ...prev,
                                    [payment.id]: prev[payment.id] ?? "",
                                  }))
                                }
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Inline rejection input */}
                        {isCEO &&
                          payment.status === "PENDING_APPROVAL" &&
                          rejectionNote[payment.id] !== undefined && (
                            <div className="flex gap-1.5 items-center mt-1.5 justify-end">
                              <input
                                className="w-36 text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Reason..."
                                value={rejectionNote[payment.id]}
                                onChange={(e) =>
                                  setRejectionNote((prev) => ({
                                    ...prev,
                                    [payment.id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-xs"
                                onClick={() => handleReject(payment.id)}
                                disabled={rejectingId === payment.id}
                              >
                                {rejectingId === payment.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() =>
                                  setRejectionNote((prev) => {
                                    const next = { ...prev };
                                    delete next[payment.id];
                                    return next;
                                  })
                                }
                              >
                                ×
                              </Button>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
