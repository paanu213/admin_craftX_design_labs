"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

export function ExpenseDetail({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: expense, isLoading } = useQuery<ExpenseWithRelations>({
    queryKey: ["expense", expenseId],
    queryFn: () => fetch(`/api/expenses/${expenseId}`).then((r) => r.json()),
  });

  async function handleApprove(status: "APPROVED" | "REJECTED") {
    const note =
      status === "REJECTED"
        ? prompt("Reason for rejection (optional):")
        : undefined;

    const res = await fetch(`/api/expenses/${expenseId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(note && { rejectionNote: note }) }),
    });

    if (res.ok) {
      toast.success(status === "APPROVED" ? "Expense approved" : "Expense rejected");
      queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } else {
      toast.error("Failed to update expense");
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{expense.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.expenseDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant={STATUS_VARIANT[expense.status]}>
            {EXPENSE_STATUS_LABELS[expense.status]}
          </Badge>
          {expense.status === "PENDING" && (
            <RoleGuard permission="approveExpenses">
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleApprove("APPROVED")}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApprove("REJECTED")}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </>
            </RoleGuard>
          )}
          <RoleGuard permission="editExpenses">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
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
                {ROLE_LABELS[expense.createdBy?.role ?? ""] ?? ""})
              </span>
            </div>
            {expense.approvedBy && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {expense.status === "APPROVED" ? "Approved by:" : "Reviewed by:"}
                </span>
                <span>{expense.approvedBy?.name}</span>
              </div>
            )}
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
                <p className="text-sm font-medium mb-1">Receipt</p>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Receipt
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
