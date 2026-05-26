import type {
  UserRole,
  ClientStatus,
  BillingCycle,
  ExpenseCategory,
  ExpenseStatus,
} from "@/generated/prisma/enums";

export type { UserRole, ClientStatus, BillingCycle, ExpenseCategory, ExpenseStatus };

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWithRelations {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  businessType: string | null;
  pincode: string | null;
  state: string | null;
  locality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  appRequirements: string[];
  status: ClientStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: Contact[];
  subscription: Subscription | null;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  clientId: string;
  planName: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate: Date | null;
  renewalDate: Date | null;
  isAutoRenew: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseWithRelations {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  expenseDate: Date;
  receiptUrl: string | null;
  status: ExpenseStatus;
  rejectionNote: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: SafeUser;
  approvedBy: SafeUser | null;
}

export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
