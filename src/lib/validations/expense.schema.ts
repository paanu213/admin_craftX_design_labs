import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./client.schema";

export const expenseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than 0"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("INR"),
  category: z.enum(
    ["SAAS", "PAYROLL", "MARKETING", "OPERATIONS", "INFRASTRUCTURE", "TRAVEL", "OTHER"],
    { required_error: "Please select a category" }
  ),
  expenseDate: z
    .string()
    .min(1, "Expense date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  receiptUrl: z.string().nullable().optional().or(z.literal("")),
});

export const approvalSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.rejectionNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection note is required when rejecting an expense",
        path: ["rejectionNote"],
      });
    }
  });

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type ApprovalFormData = z.infer<typeof approvalSchema>;
