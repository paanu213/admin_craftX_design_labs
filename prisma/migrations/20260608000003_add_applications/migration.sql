-- Create enums
CREATE TYPE "AppCategory" AS ENUM ('BILLING', 'INVENTORY', 'POS', 'RESTAURANT', 'HOSPITAL', 'SCHOOL', 'REAL_ESTATE', 'LOGISTICS', 'CRM', 'HR_PAYROLL', 'FINANCE', 'MANUFACTURING', 'E_COMMERCE', 'OTHER');
CREATE TYPE "AppStatus" AS ENUM ('ACTIVE', 'BETA', 'MAINTENANCE', 'DEPRECATED');

-- Create applications table
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AppCategory" NOT NULL,
    "version" TEXT NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "monthlyPrice" DECIMAL(10,2),
    "yearlyPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "website" TEXT,
    "playStoreUrl" TEXT,
    "appStoreUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- Add applicationId to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "applicationId" TEXT;

-- Add FK constraints
ALTER TABLE "applications" ADD CONSTRAINT "applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
