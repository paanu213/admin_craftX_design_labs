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
  .max(14, "Phone number is too long — max 14 characters including country code")
  .regex(INDIAN_PHONE_REGEX, "Enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210)")
  .optional()
  .or(z.literal(""));

export const clientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Enter a valid email address (e.g. name@company.com)"),
  phone: phoneField,
  company: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters"),
  industry: z.string().max(100, "Industry cannot exceed 100 characters").optional(),
  website: z
    .string()
    .url("Enter a valid URL starting with https:// (e.g. https://example.com)")
    .optional()
    .or(z.literal("")),
  businessType: z.enum(BUSINESS_TYPES).optional().or(z.literal("")),
  gstNumber: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST number — format: 22AAAAA0000A1Z5 (15 characters)"
    )
    .optional()
    .or(z.literal("")),
  panNumber: z
    .string()
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      "Invalid PAN number — format: ABCDE1234F (10 characters)"
    )
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
  addressLine1: z.string().max(200, "Address cannot exceed 200 characters").optional(),
  addressLine2: z.string().max(200, "Address cannot exceed 200 characters").optional(),
  appRequirements: z.array(z.string()),
  status: z.enum(["REGISTERED", "KEY_GENERATED", "ACTIVE", "INACTIVE", "TRIAL", "CHURNED"]),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

export const subscriptionSchema = z.object({
  applicationId: z.string().optional().nullable(),
  price: z.number().min(0, "Price cannot be negative"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("INR"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  renewalDate: z
    .string()
    .refine((d) => !d || !isNaN(Date.parse(d)), "Invalid renewal date")
    .optional()
    .or(z.literal("")),
  isAutoRenew: z.boolean().default(true),
  features: z.array(z.string()).default([]),
});

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: phoneField,
  role: z.string().max(100, "Role cannot exceed 100 characters").optional(),
  isPrimary: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type SubscriptionFormData = z.infer<typeof subscriptionSchema> & { planName?: string };
export type ContactFormData = z.infer<typeof contactSchema>;
