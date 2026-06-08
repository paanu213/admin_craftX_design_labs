-- Add ExpenseApprovalStatus enum
CREATE TYPE "ExpenseApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Expense approvals table (one row per founder per expense)
CREATE TABLE "expense_approvals" (
    "id"         TEXT NOT NULL,
    "expenseId"  TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status"     "ExpenseApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note"       TEXT,
    "decidedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_approvals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "expense_approvals_expenseId_approverId_key"
    ON "expense_approvals"("expenseId", "approverId");
ALTER TABLE "expense_approvals"
    ADD CONSTRAINT "expense_approvals_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_approvals"
    ADD CONSTRAINT "expense_approvals_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
