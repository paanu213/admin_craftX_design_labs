import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string, fmt: string = "MMM d, yyyy") {
  return format(new Date(date), fmt);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  CEO: "CEO",
  CMO: "CMO",
  CFO: "CFO",
  CTO: "CTO",
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  TRIAL: "Trial",
  CHURNED: "Churned",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SAAS: "SaaS",
  PAYROLL: "Payroll",
  MARKETING: "Marketing",
  OPERATIONS: "Operations",
  INFRASTRUCTURE: "Infrastructure",
  TRAVEL: "Travel",
  OTHER: "Other",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
};
