"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, CheckCircle, XCircle, ArrowUpCircle, Eye,
  Ban, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECEIVER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/utils";
import type { Payment } from "@/types";

interface ClientPaymentsContentProps {
  clientId: string;
  currentUserId: string;
  canApprove: boolean;
  canCancel: boolean;
}

export function ClientPaymentsContent({
  clientId,
  currentUserId,
  canApprove,
  canCancel,
}: ClientPaymentsContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [cancelPayment, setCancelPayment] = useState<Payment | null>(null);
  const [cancellationNote, setCancellationNote] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectPayment, setRejectPayment] = useState<Payment | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["client-payments", clientId],
    queryFn: () => fetch(`/api/payments?clientId=${clientId}`).then((r) => r.json()),
    enabled: !!clientId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["client-payments", clientId] });
  }

  async function handleDeposit(paymentId: string) {
    setDepositingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit" }),
    });
    setDepositingId(null);
    if (res.ok) {
      toast.success("Marked as deposited");
      invalidate();
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
      invalidate();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to approve");
    }
  }

  async function handleReject() {
    if (!rejectPayment) return;
    if (!rejectionNote.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    setIsRejecting(true);
    const res = await fetch(`/api/payments/${rejectPayment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: rejectionNote.trim() }),
    });
    setIsRejecting(false);
    if (res.ok) {
      toast.success("Payment rejected");
      setRejectPayment(null);
      setRejectionNote("");
      invalidate();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to reject");
    }
  }

  async function handleCancel() {
    if (!cancelPayment) return;
    if (!cancellationNote.trim()) {
      toast.error("Enter a cancellation reason");
      return;
    }
    setIsCancelling(true);
    const res = await fetch(`/api/payments/${cancelPayment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", cancellationNote: cancellationNote.trim() }),
    });
    setIsCancelling(false);
    if (res.ok) {
      toast.success("Payment cancelled");
      setCancelPayment(null);
      setCancellationNote("");
      invalidate();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to cancel");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">Payment History</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !payments?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={PAYMENT_STATUS_VARIANT[payment.status] ?? "secondary"}
                          className="text-xs whitespace-nowrap"
                        >
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {payment.isRenewal ? "Renewal" : "Payment"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(payment.paymentDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.recordedBy.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="View details"
                            onClick={() => setViewPayment(payment)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {payment.status === "PENDING_DEPOSIT" &&
                            payment.recordedById === currentUserId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600"
                                title="Mark deposited"
                                onClick={() => handleDeposit(payment.id)}
                                disabled={depositingId === payment.id}
                              >
                                {depositingId === payment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowUpCircle className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}

                          {canApprove && payment.status === "PENDING_APPROVAL" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600"
                                title="Approve"
                                onClick={() => handleApprove(payment.id)}
                                disabled={approvingId === payment.id}
                              >
                                {approvingId === payment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                title="Reject"
                                onClick={() => { setRejectPayment(payment); setRejectionNote(""); }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}

                          {canCancel && payment.status !== "CANCELLED" && payment.status !== "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Cancel payment"
                              onClick={() => { setCancelPayment(payment); setCancellationNote(""); }}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payment Details Dialog */}
      <Dialog open={!!viewPayment} onOpenChange={(open) => { if (!open) setViewPayment(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatCurrency(viewPayment.amount, viewPayment.currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={PAYMENT_STATUS_VARIANT[viewPayment.status] ?? "secondary"} className="text-xs">
                  {PAYMENT_STATUS_LABELS[viewPayment.status]}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Type</span>
                <span>{viewPayment.isRenewal ? "Renewal" : "First Payment"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Method</span>
                <span>{PAYMENT_METHOD_LABELS[viewPayment.method]}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Received By</span>
                <span>{PAYMENT_RECEIVER_LABELS[viewPayment.receivedBy]}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Payment Date</span>
                <span>{formatDate(viewPayment.paymentDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Recorded By</span>
                <span>{viewPayment.recordedBy.name}</span>
              </div>
              {viewPayment.approvedBy && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Approved By</span>
                  <span>{viewPayment.approvedBy.name} · {viewPayment.approvedAt ? formatDate(viewPayment.approvedAt) : ""}</span>
                </div>
              )}
              {viewPayment.note && (
                <div className="py-1 border-b border-border/50">
                  <p className="text-muted-foreground mb-1">Note</p>
                  <p className="italic">{viewPayment.note}</p>
                </div>
              )}
              {viewPayment.status === "REJECTED" && viewPayment.rejectionNote && (
                <div className="py-1 border-b border-border/50">
                  <p className="text-muted-foreground mb-1">Rejection Reason</p>
                  <p className="text-destructive">{viewPayment.rejectionNote}</p>
                </div>
              )}
              {viewPayment.status === "CANCELLED" && (
                <>
                  {viewPayment.cancelledBy && (
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Cancelled By</span>
                      <span>{viewPayment.cancelledBy.name} · {viewPayment.cancelledAt ? formatDate(viewPayment.cancelledAt) : ""}</span>
                    </div>
                  )}
                  {viewPayment.cancellationNote && (
                    <div className="py-1">
                      <p className="text-muted-foreground mb-1">Cancellation Reason</p>
                      <p className="text-destructive">{viewPayment.cancellationNote}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPayment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Payment Dialog */}
      <Dialog open={!!cancelPayment} onOpenChange={(open) => { if (!open) { setCancelPayment(null); setCancellationNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Payment</DialogTitle>
            <DialogDescription>
              {cancelPayment && (
                <>Cancel {formatCurrency(cancelPayment.amount, cancelPayment.currency)} recorded on {formatDate(cancelPayment.paymentDate)}?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter the reason for cancelling this payment..."
              rows={3}
              value={cancellationNote}
              onChange={(e) => setCancellationNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelPayment(null); setCancellationNote(""); }}>
              Keep Payment
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? <><Loader2 className="h-4 w-4 animate-spin" />Cancelling...</> : "Cancel Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={!!rejectPayment} onOpenChange={(open) => { if (!open) { setRejectPayment(null); setRejectionNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              {rejectPayment && (
                <>Reject {formatCurrency(rejectPayment.amount, rejectPayment.currency)}?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason for rejection *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter the reason for rejecting this payment..."
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectPayment(null); setRejectionNote(""); }}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? <><Loader2 className="h-4 w-4 animate-spin" />Rejecting...</> : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
