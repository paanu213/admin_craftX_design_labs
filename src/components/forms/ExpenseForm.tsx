"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { expenseSchema, type ExpenseFormData } from "@/lib/validations/expense.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageWrapper";
import type { ExpenseWithRelations } from "@/types";
import { format } from "date-fns";

interface ExpenseFormProps {
  expense?: ExpenseWithRelations;
  onSuccess?: () => void;
}

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const router = useRouter();
  const isEditing = !!expense;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: expense
      ? {
          title: expense.title,
          description: expense.description ?? "",
          amount: Number(expense.amount),
          currency: expense.currency,
          category: expense.category,
          expenseDate: format(new Date(expense.expenseDate), "yyyy-MM-dd"),
          receiptUrl: expense.receiptUrl ?? "",
        }
      : {
          currency: "INR",
          expenseDate: format(new Date(), "yyyy-MM-dd"),
        },
  });

  async function onSubmit(data: ExpenseFormData) {
    const url = isEditing ? `/api/expenses/${expense.id}` : "/api/expenses";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save expense");
      return;
    }

    toast.success(isEditing ? "Expense updated" : "Expense submitted for approval");
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/expenses");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? "Edit Expense" : "Add New Expense"}
        description={
          isEditing
            ? "Update expense details"
            : "Submit a new expense for approval"
        }
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={(handleSubmit as any)(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Details</CardTitle>
            <CardDescription>
              Submitted expenses require approval from CEO or CFO
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Monthly Figma subscription"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="99.00"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                defaultValue={expense?.currency ?? "INR"}
                onValueChange={(v) => setValue("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                defaultValue={expense?.category}
                onValueChange={(v) =>
                  setValue("category", v as ExpenseFormData["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAAS">SaaS</SelectItem>
                  <SelectItem value="PAYROLL">Payroll</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="OPERATIONS">Operations</SelectItem>
                  <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                  <SelectItem value="TRAVEL">Travel</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                {...register("expenseDate")}
              />
              {errors.expenseDate && (
                <p className="text-xs text-destructive">{errors.expenseDate.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this expense..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="receiptUrl">Receipt URL</Label>
              <Input
                id="receiptUrl"
                type="url"
                placeholder="https://..."
                {...register("receiptUrl")}
              />
              {errors.receiptUrl && (
                <p className="text-xs text-destructive">{errors.receiptUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Submit Expense"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
