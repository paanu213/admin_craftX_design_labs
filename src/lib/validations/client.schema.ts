import { z } from "zod";

const INDIAN_PHONE_REGEX = /^(\+91[\s-]?)?[6-9][0-9]{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

export const BUSINESS_TYPES = [
  "Ecommerce",
  "Billing App",
  "Inventory Management",
  "Store Management",
  "Restaurant Management",
  "Hospital Management",
  "School Management",
  "Real Estate",
  "Logistics & Supply Chain",
  "CRM",
  "HR & Payroll",
  "Finance & Accounting",
  "Manufacturing",
  "Travel & Hospitality",
  "Other",
] as const;

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

const phoneField = z
  .string()
  .regex(INDIAN_PHONE_REGEX, "Enter a valid 10-digit Indian mobile number")
  .optional()
  .or(z.literal(""));

export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: phoneField,
  company: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  businessType: z.enum(BUSINESS_TYPES).optional().or(z.literal("")),
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
  pincode: z
    .string()
    .regex(PINCODE_REGEX, "Pincode must be exactly 6 digits")
    .optional()
    .or(z.literal("")),
  state: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  appRequirements: z.array(z.string()),
  status: z.enum(["REGISTERED", "KEY_GENERATED", "ACTIVE", "INACTIVE", "TRIAL", "CHURNED"]),
  notes: z.string().optional(),
});

export const subscriptionSchema = z.object({
  applicationId: z.string().optional().nullable(),
  planName: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price cannot be negative"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("INR"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  endDate: z
    .string()
    .refine((d) => !d || !isNaN(Date.parse(d)), "Invalid end date")
    .optional()
    .or(z.literal("")),
  renewalDate: z
    .string()
    .refine((d) => !d || !isNaN(Date.parse(d)), "Invalid renewal date")
    .optional()
    .or(z.literal("")),
  isAutoRenew: z.boolean().default(true),
  features: z.array(z.string()).default([]),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: phoneField,
  role: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
