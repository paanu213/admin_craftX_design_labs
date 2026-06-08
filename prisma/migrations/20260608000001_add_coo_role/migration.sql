-- Add COO (Chief Operating Officer) to the UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COO';
