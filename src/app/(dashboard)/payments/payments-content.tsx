"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2, CheckCircle, XCircle, ArrowUpCircle,
  Filter, Banknote, Eye, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PaymentsResponse {
  data: Payment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_LIMIT = 12;

export function PaymentsContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<Payment | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const isCEO = ["CEO", "SUPER_ADMIN"].includes(session?.user?.role ?? "");

  const { data, isLoading, isError, refetch } = useQuery<PaymentsResponse>({
    queryKey: ["payments", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/payments?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load payments");
      return json;
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

  async function handleRejectConfirm() {
    if (!rejectDialog) return;
    if (!rejectionNote.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    setIsRejecting(true);
    const res = await fetch(`/api/payments/${rejectDialog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: rejectionNote.trim() }),
    });
    setIsRejecting(false);
    if (res.ok) {
      toast.success("Payment rejected");
      setRejectDialog(null);
      setRejectionNote("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to reject");
    }
  }

  const payments = data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description={isCEO ? "Review and approve client payments" : "Track payments you have recorded"}
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
          ) : !payments.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Banknote className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Method</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Received By</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Recorded By</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
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
                          className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                          onClick={() => router.push(`/clients/${payment.clientId}`)}
                        >
                          {payment.client?.company ?? "—"}
                        </button>
                        {payment.client?.clientCode && (
                          <p className="text-xs font-mono text-muted-foreground">{payment.client.clientCode}</p>
                        )}
                        {payment.isRenewal && (
                          <Badge variant="secondary" className="text-xs mt-0.5">Renewal</Badge>
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
                          <Badge variant={PAYMENT_STATUS_VARIANT[payment.status] ?? "secondary"} className="text-xs">
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </Badge>
                          {payment.status === "REJECTED" && payment.rejectionNote && (
                            <p className="text-xs text-destructive">{payment.rejectionNote}</p>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => router.push(`/clients/${payment.clientId}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {payment.status === "PENDING_DEPOSIT" && payment.recordedById === session?.user?.id && (
                                <DropdownMenuItem
                                  disabled={depositingId === payment.id}
                                  onClick={() => handleDeposit(payment.id)}
                                >
                                  {depositingId === payment.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Mark Deposited
                                </DropdownMenuItem>
                              )}
                              {isCEO && payment.status === "PENDING_APPROVAL" && (
                                <>
                                  <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-700"
                                    disabled={approvingId === payment.id}
                                    onClick={() => handleApprove(payment.id)}
                                  >
                                    {approvingId === payment.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => { setRejectDialog(payment); setRejectionNote(""); }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground text-center sm:text-left">
            Showing {(page - 1) * PAGE_LIMIT + 1}–
            {Math.min(page * PAGE_LIMIT, data.meta.total)} of {data.meta.total} payments
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Rejection Reason *</Label>
            <Input
              id="reject-note"
              placeholder="Enter reason..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={isRejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={isRejecting}>
              {isRejecting ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
