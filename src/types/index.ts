import type {
  UserRole,
  ClientStatus,
  BillingCycle,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseApprovalStatus,
  KeyStatus,
} from "@/generated/prisma/enums";

export type { UserRole, ClientStatus, BillingCycle, ExpenseCategory, ExpenseStatus, ExpenseApprovalStatus, KeyStatus };

export interface ActivationKey {
  id: string;
  clientId: string;
  key: string;
  status: KeyStatus;
  generatedById: string;
  generatedAt: Date;
  activatedAt: Date | null;
  generatedBy: { id: string; name: string; role: string };
}

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
  gstNumber: string | null;
  panNumber: string | null;
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
  activationKey: ActivationKey | null;
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

export interface ExpenseApproval {
  id: string;
  expenseId: string;
  approverId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  decidedAt: string | null;
  createdAt: string;
  approver: { id: string; name: string; role: string };
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
  approvals: ExpenseApproval[];
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
