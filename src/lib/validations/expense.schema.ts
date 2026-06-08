import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./client.schema";

export const expenseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("INR"),
  category: z.enum([
    "SAAS",
    "PAYROLL",
    "MARKETING",
    "OPERATIONS",
    "INFRASTRUCTURE",
    "TRAVEL",
    "OTHER",
  ]),
  expenseDate: z
    .string()
    .min(1, "Date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  receiptUrl: z.string().optional().or(z.literal("")),
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
