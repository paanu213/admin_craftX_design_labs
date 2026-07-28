"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Search, Filter, Eye, CheckCircle, XCircle, Trash2,
  TrendingUp, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
} from "@/lib/utils";
import type { ExpenseStatus, ExpenseWithRelations } from "@/types";

interface SpendingSummaryItem {
  userId: string;
  name: string;
  role: string;
  total: number;
  count: number;
  approvedAmount: number;
  pendingCount: number;
}

const DESIGNATION_LABELS: Record<string, string> = {
  CEO: "CEO",
  CMO: "CMO",
  CFO: "CFO",
  CTO: "CTO",
  COO: "COO",
  EMPLOYEE: "Employee",
  CUSTOMER_CARE: "Customer Care",
};

const STATUS_VARIANT: Record<ExpenseStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

interface ExpensesResponse {
  data: ExpenseWithRelations[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_LIMIT = 12;

export function ExpensesContent({ canApprove }: { canApprove: boolean }) {
  const router = useRouter();
  const isAdmin = canApprove;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data: summary } = useQuery<SpendingSummaryItem[]>({
    queryKey: ["expenses-summary"],
    queryFn: async () => {
      const r = await fetch("/api/expenses/summary");
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to load summary");
      return json;
    },
  });

  const { data, isLoading, refetch } = useQuery<ExpensesResponse>({
    queryKey: ["expenses", page, search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(categoryFilter !== "ALL" && { category: categoryFilter }),
      });
      const r = await fetch(`/api/expenses?${params}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to load expenses");
      return json;
    },
  });

  async function handleApprove(id: string, decision: "APPROVED" | "REJECTED") {
    let note: string | undefined;

    if (decision === "REJECTED") {
      const input = prompt("Reason for rejection (required):");
      if (!input?.trim()) {
        toast.error("A rejection reason is required");
        return;
      }
      note = input.trim();
    }

    const res = await fetch(`/api/expenses/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, ...(note && { note }) }),
    });

    if (res.ok) {
      toast.success(decision === "APPROVED" ? "Expense approved" : "Expense rejected");
      refetch();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update expense");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete expense "${title}"?`)) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Expense deleted");
      refetch();
    } else {
      toast.error("Failed to delete expense");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description="Track and manage company expenses"
        actions={
          <Button onClick={() => router.push("/expenses/new")}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        }
      />

      {/* Spending Summary */}
      {summary && summary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {isAdmin ? "Spending by Team Member" : "My Spending Overview"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                    {isAdmin && (
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                    )}
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Approved</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground"># Expenses</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((item) => (
                    <tr key={item.userId} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      {isAdmin && (
                        <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">
                          {DESIGNATION_LABELS[item.role] ?? item.role}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-2 text-right text-emerald-600 hidden md:table-cell">
                        {formatCurrency(item.approvedAmount)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.count}</td>
                      <td className="px-4 py-2 text-right hidden md:table-cell">
                        {item.pendingCount > 0 ? (
                          <Badge variant="warning">{item.pendingCount} pending</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="SAAS">SaaS</SelectItem>
            <SelectItem value="PAYROLL">Payroll</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="OPERATIONS">Operations</SelectItem>
            <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
            <SelectItem value="TRAVEL">Travel</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-muted-foreground text-sm">No expenses found</p>
              <Button variant="outline" size="sm" onClick={() => router.push("/expenses/new")}>
                <Plus className="h-4 w-4" />
                Add your first expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expense</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Added by</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{expense.title}</p>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {expense.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary">
                          {EXPENSE_CATEGORY_LABELS[expense.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(Number(expense.amount), expense.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={STATUS_VARIANT[expense.status]}>
                            {EXPENSE_STATUS_LABELS[expense.status]}
                          </Badge>
                          {expense.status === "PENDING" && expense.approvals && expense.approvals.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {expense.approvals.filter((a) => a.status === "APPROVED").length}/
                              {expense.approvals.length} approved
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {expense.createdBy?.name}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => router.push(`/expenses/${expense.id}`)}
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
                              {expense.status === "PENDING" && (
                                <RoleGuard permission="approveExpenses">
                                  <>
                                    <DropdownMenuItem
                                      className="text-emerald-600 focus:text-emerald-700"
                                      onClick={() => handleApprove(expense.id, "APPROVED")}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleApprove(expense.id, "REJECTED")}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                </RoleGuard>
                              )}
                              <RoleGuard permission="deleteExpenses">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(expense.id, expense.title)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </RoleGuard>
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
            {Math.min(page * PAGE_LIMIT, data.meta.total)} of {data.meta.total} expenses
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
    </div>
  );
}
