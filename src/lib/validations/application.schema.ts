import { z } from "zod";

export const applicationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  category: z.string().min(1, "Please select a category"),
  version: z
    .string()
    .min(1, "Version is required")
    .max(20, "Version cannot exceed 20 characters"),
  status: z.enum(["ACTIVE", "BETA", "MAINTENANCE", "DEPRECATED"]).default("ACTIVE"),
  logoUrl: z
    .string()
    .url("Enter a valid URL starting with https://")
    .optional()
    .or(z.literal("")),
  monthlyPrice: z
    .number({ invalid_type_error: "Enter a valid price" })
    .min(0, "Price cannot be negative")
    .optional()
    .nullable(),
  yearlyPrice: z
    .number({ invalid_type_error: "Enter a valid price" })
    .min(0, "Price cannot be negative")
    .optional()
    .nullable(),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  website: z
    .string()
    .url("Enter a valid URL starting with https://")
    .optional()
    .or(z.literal("")),
  playStoreUrl: z
    .string()
    .url("Enter a valid Play Store URL")
    .optional()
    .or(z.literal("")),
  appStoreUrl: z
    .string()
    .url("Enter a valid App Store URL")
    .optional()
    .or(z.literal("")),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
