"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Tag,
  FileText,
  ImageIcon,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/utils";
import type { ExpenseStatus, ExpenseWithRelations } from "@/types";

const STATUS_VARIANT: Record<ExpenseStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

const APPROVAL_STATUS_VARIANT = {
  PENDING: "secondary" as const,
  APPROVED: "success" as const,
  REJECTED: "destructive" as const,
};

function getReceiptMeta(url: string): { name: string; isPdf: boolean } {
  try {
    const pathname = new URL(url).pathname;
    const raw = decodeURIComponent(pathname.split("/").pop() ?? "receipt");
    // strip UUID prefix (uuid-originalname.ext)
    const name = raw.replace(/^[0-9a-f-]{36}-/i, "") || raw;
    const isPdf = name.toLowerCase().endsWith(".pdf");
    return { name, isPdf };
  } catch {
    return { name: "receipt", isPdf: false };
  }
}

export function ExpenseDetail({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: expense, isLoading } = useQuery<ExpenseWithRelations>({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      const res = await fetch(`/api/expenses/${expenseId}`);
      if (!res.ok) throw new Error("Failed to load expense");
      return res.json();
    },
  });

  async function handleDecision(decision: "APPROVED" | "REJECTED", note?: string) {
    const res = await fetch(`/api/expenses/${expenseId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, ...(note?.trim() && { note: note.trim() }) }),
    });

    if (res.ok) {
      toast.success(decision === "APPROVED" ? "Expense approved" : "Expense rejected");
      setRejectingId(null);
      setRejectNote("");
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update expense");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete expense "${expense?.title}"?`)) return;
    const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Expense deleted");
      router.push("/expenses");
    } else {
      toast.error("Failed to delete expense");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Expense not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <ExpenseForm
        expense={expense}
        onSuccess={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }}
      />
    );
  }

  const currentUserId = session?.user?.id;
  const myApproval = expense.approvals?.find((a) => a.approverId === currentUserId);
  const approvedCount = expense.approvals?.filter((a) => a.status === "APPROVED").length ?? 0;
  const totalApprovers = expense.approvals?.length ?? 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">{expense.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.expenseDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[expense.status]}>
            {EXPENSE_STATUS_LABELS[expense.status]}
          </Badge>
          <RoleGuard permission="editExpenses">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </RoleGuard>
          <RoleGuard permission="deleteExpenses">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Expense Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Amount</span>
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(Number(expense.amount), expense.currency)}
            </span>
          </div>
          <Separator />

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Category:</span>
              <Badge variant="secondary">
                {EXPENSE_CATEGORY_LABELS[expense.category]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span>{formatDate(expense.expenseDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Submitted by:</span>
              <span>
                {expense.createdBy?.name} (
                {ROLE_LABELS[expense.createdBy?.role ?? ""] ?? expense.createdBy?.role})
              </span>
            </div>
          </div>

          {expense.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {expense.description}
                </p>
              </div>
            </>
          )}

          {expense.rejectionNote && (
            <>
              <Separator />
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-destructive/80">{expense.rejectionNote}</p>
              </div>
            </>
          )}

          {expense.receiptUrl && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Receipt</p>
                {(() => {
                  const { name, isPdf } = getReceiptMeta(expense.receiptUrl);
                  return (
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors group"
                    >
                      {isPdf ? (
                        <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                      )}
                      <span className="text-sm truncate max-w-[260px]">{name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  );
                })()}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approval Panel */}
      {expense.approvals && expense.approvals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Founder Approvals</CardTitle>
              <span className="text-xs text-muted-foreground">
                {approvedCount}/{totalApprovers} approved
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {expense.approvals.map((approval) => (
              <div key={approval.id} className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{approval.approver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[approval.approver.role] ?? approval.approver.role}
                    </p>
                    {approval.note && (
                      <p className="text-xs text-destructive mt-0.5 italic">
                        "{approval.note}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {approval.status === "PENDING" ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Pending</span>
                    </div>
                  ) : (
                    <Badge variant={APPROVAL_STATUS_VARIANT[approval.status]} className="text-xs">
                      {approval.status === "APPROVED" ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Approved</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />Rejected</>
                      )}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {/* Current user's action — only if their approval is PENDING and expense is PENDING */}
            {expense.status === "PENDING" && myApproval?.status === "PENDING" && (
              <>
                <Separator />
                {rejectingId === "self" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Rejection reason</p>
                    <Textarea
                      placeholder="Required: explain why you're rejecting this expense..."
                      rows={2}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRejectingId(null); setRejectNote(""); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!rejectNote.trim()}
                        onClick={() => handleDecision("REJECTED", rejectNote)}
                      >
                        <XCircle className="h-4 w-4" />
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingId("self")}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleDecision("APPROVED")}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
