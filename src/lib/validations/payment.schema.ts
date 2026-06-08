import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

export const recordPaymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  subscriptionId: z.string().optional().nullable(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("INR"),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  receivedBy: z.enum(["EMPLOYEE", "COMPANY"]),
  paymentDate: z
    .string()
    .min(1, "Payment date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  note: z.string().optional(),
  isRenewal: z.boolean().default(false),
});

export const generateKeySchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  keyType: z.enum(["TRIAL", "SUBSCRIPTION"]),
  payment: recordPaymentSchema
    .omit({ clientId: true })
    .optional(),
});

export type RecordPaymentData = z.infer<typeof recordPaymentSchema>;
export type GenerateKeyData = z.infer<typeof generateKeySchema>;
