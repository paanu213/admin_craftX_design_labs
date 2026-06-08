"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FileText, Upload, X, ImageIcon } from "lucide-react";
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

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
]);

interface ReceiptFile {
  file: File;
  previewName: string;
  isPdf: boolean;
}

interface ExpenseFormProps {
  expense?: ExpenseWithRelations;
  onSuccess?: () => void;
}

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const router = useRouter();
  const isEditing = !!expense;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receipt, setReceipt] = useState<ReceiptFile | null>(null);
  const [uploading, setUploading] = useState(false);
  // When editing, track existing receipt URL
  const [existingReceiptUrl] = useState<string | null>(expense?.receiptUrl ?? null);

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
          currency: expense.currency as ExpenseFormData["currency"],
          category: expense.category,
          expenseDate: format(new Date(expense.expenseDate), "yyyy-MM-dd"),
          receiptUrl: expense.receiptUrl ?? "",
        }
      : {
          currency: "INR",
          expenseDate: format(new Date(), "yyyy-MM-dd"),
        },
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Only JPEG, PNG, GIF, WebP, and PDF files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File must be under 2 MB");
      e.target.value = "";
      return;
    }

    setReceipt({ file, previewName: file.name, isPdf: file.type === "application/pdf" });
  }

  function clearReceipt() {
    setReceipt(null);
    setValue("receiptUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadReceipt(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/receipt", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Upload failed");
    }
    const { url } = await res.json();
    return url as string;
  }

  async function onSubmit(data: ExpenseFormData) {
    let receiptUrl = data.receiptUrl ?? "";

    // Upload new file if one is selected
    if (receipt) {
      setUploading(true);
      try {
        receiptUrl = await uploadReceipt(receipt.file);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Receipt upload failed");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const url = isEditing ? `/api/expenses/${expense.id}` : "/api/expenses";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, receiptUrl: receiptUrl || null }),
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

  const isWorking = uploading || isSubmitting;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? "Edit Expense" : "Add New Expense"}
        description={
          isEditing ? "Update expense details" : "Submit a new expense for approval"
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
              All founders must approve before an expense is marked as approved
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="Monthly Figma subscription" {...register("title")} />
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
                onValueChange={(v) => setValue("currency", v as ExpenseFormData["currency"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                onValueChange={(v) => setValue("category", v as ExpenseFormData["category"])}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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
              <Input id="expenseDate" type="date" {...register("expenseDate")} />
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

            {/* Receipt Upload */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Receipt / Bill</Label>

              {/* Show existing receipt when editing */}
              {isEditing && existingReceiptUrl && !receipt && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    Existing receipt attached
                  </span>
                  <a
                    href={existingReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              )}

              {receipt ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  {receipt.isPdf ? (
                    <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                  )}
                  <span className="text-sm flex-1 truncate">{receipt.previewName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(receipt.file.size / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={clearReceipt}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to upload receipt</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, GIF, WebP or PDF · max 2 MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isWorking}>
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Saving..."}
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
