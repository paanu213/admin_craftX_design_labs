-- Add ExpenseApprovalStatus enum (idempotent)
DO $$ BEGIN CREATE TYPE "ExpenseApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Expense approvals table (idempotent)
CREATE TABLE IF NOT EXISTS "expense_approvals" (
    "id"         TEXT NOT NULL,
    "expenseId"  TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status"     "ExpenseApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note"       TEXT,
    "decidedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_approvals_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX "expense_approvals_expenseId_approverId_key"
        ON "expense_approvals"("expenseId", "approverId");
EXCEPTION WHEN duplicate_table THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "expense_approvals"
        ADD CONSTRAINT "expense_approvals_expenseId_fkey"
        FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "expense_approvals"
        ADD CONSTRAINT "expense_approvals_approverId_fkey"
        FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
