import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  businessType: z.string().optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number")
    .optional()
    .or(z.literal("")),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number")
    .optional()
    .or(z.literal("")),
  pincode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  appRequirements: z.array(z.string()),
  status: z.enum(["ACTIVE", "INACTIVE", "TRIAL", "CHURNED"]),
  notes: z.string().optional(),
});

export const subscriptionSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  price: z.number().positive("Price must be positive"),
  currency: z.string().default("INR"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  renewalDate: z.string().optional(),
  isAutoRenew: z.boolean().default(true),
  features: z.array(z.string()).default([]),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
