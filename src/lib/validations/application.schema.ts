import { z } from "zod";

export const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  version: z.string().min(1, "Version is required"),
  status: z.enum(["ACTIVE","BETA","MAINTENANCE","DEPRECATED"]).default("ACTIVE"),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  monthlyPrice: z.number().min(0).optional().nullable(),
  yearlyPrice: z.number().min(0).optional().nullable(),
  currency: z.enum(["INR","USD","EUR","GBP"]).default("INR"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  playStoreUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  appStoreUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;
