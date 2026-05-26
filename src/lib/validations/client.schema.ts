import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
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
