import type {
  UserRole,
  ClientStatus,
  BillingCycle,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseApprovalStatus,
  KeyStatus,
  KeyType,
  AppCategory,
  AppStatus,
  PaymentMethod,
  PaymentReceiver,
  PaymentStatus,
} from "@/generated/prisma/enums";

export type { UserRole, ClientStatus, BillingCycle, ExpenseCategory, ExpenseStatus, ExpenseApprovalStatus, KeyStatus, KeyType, AppCategory, AppStatus, PaymentMethod, PaymentReceiver, PaymentStatus };

export interface ActivationKey {
  id: string;
  clientId: string;
  key: string;
  status: KeyStatus;
  keyType: KeyType;
  generatedById: string;
  generatedAt: Date;
  activatedAt: Date | null;
  expiresAt: Date | null;
  generatedBy: { id: string; name: string; role: string };
}

export interface Payment {
  id: string;
  clientId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  receivedBy: PaymentReceiver;
  paymentDate: string;
  note: string | null;
  status: PaymentStatus;
  isRenewal: boolean;
  recordedById: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
  recordedBy: { id: string; name: string; role: string };
  approvedBy: { id: string; name: string; role: string } | null;
  client?: { id: string; name: string; company: string };
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: Record<string, Record<string, boolean>>;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
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
  groupMemberships: { group: { id: string; name: string } }[];
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
  applicationId?: string | null;
  application?: Application | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Application {
  id: string;
  name: string;
  description: string | null;
  category: AppCategory;
  version: string;
  status: AppStatus;
  logoUrl: string | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: string;
  website: string | null;
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; role: string };
  _count?: { subscriptions: number };
  activeSubscriptions?: number;
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

export interface DevAccessPassword {
  id: string;
  clientId: string;
  generatedById: string;
  reason: string;
  expiresAt: string;
  usedAt: string | null;
  usedFromIp: string | null;
  createdAt: string;
  generatedBy: { id: string; name: string; role: string };
  client?: { id: string; name: string; company: string };
}
