import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

// These are designations (job titles), not access roles.
// Access control is managed through User Groups, not this field.
export const USER_ROLES = ["CEO", "COO", "CMO", "CFO", "CTO", "EMPLOYEE"] as const;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: strongPassword,
    confirmPassword: z.string(),
    role: z.enum(USER_ROLES),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createUserApiSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: strongPassword,
  role: z.enum(USER_ROLES),
});

export const updateUserApiSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Enter a valid email address").optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
