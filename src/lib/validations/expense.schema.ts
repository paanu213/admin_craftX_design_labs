import { z } from "zod";

export const expenseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("INR"),
  category: z.enum([
    "SAAS",
    "PAYROLL",
    "MARKETING",
    "OPERATIONS",
    "INFRASTRUCTURE",
    "TRAVEL",
    "OTHER",
  ]),
  expenseDate: z.string().min(1, "Date is required"),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type ApprovalFormData = z.infer<typeof approvalSchema>;
