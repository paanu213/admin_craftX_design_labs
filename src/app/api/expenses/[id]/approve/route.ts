import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const FOUNDER_ROLES = ["CEO", "CTO", "CFO", "COO", "CMO", "SUPER_ADMIN"];

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.decision === "REJECTED" && !data.note?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A rejection reason is required",
      path: ["note"],
    });
  }
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!FOUNDER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Only founders can approve expenses" }, { status: 403 });
    }

    const { id } = await params;

    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        approvals: true,
      },
    });

    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    if (expense.status !== "PENDING") {
      return NextResponse.json({ error: "Expense is no longer pending" }, { status: 409 });
    }

    const body = await request.json();
    const result = decisionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { decision, note } = result.data;

    // Find this founder's approval record — if none exists (e.g. the creator or late-added founder), create one
    const existing = await db.expenseApproval.findUnique({
      where: { expenseId_approverId: { expenseId: id, approverId: session.user.id } },
    });

    if (!existing) {
      // Creator or someone without a pre-created record shouldn't be reviewing their own expense
      if (expense.createdById === session.user.id) {
        return NextResponse.json({ error: "You cannot approve your own expense" }, { status: 403 });
      }
      // Create the record on the fly
      await db.expenseApproval.create({
        data: { expenseId: id, approverId: session.user.id, status: decision, note: note ?? null, decidedAt: new Date() },
      });
    } else {
      await db.expenseApproval.update({
        where: { expenseId_approverId: { expenseId: id, approverId: session.user.id } },
        data: { status: decision, note: note ?? null, decidedAt: new Date() },
      });
    }

    // Re-fetch all approvals for this expense
    const allApprovals = await db.expenseApproval.findMany({ where: { expenseId: id } });

    let newExpenseStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";

    if (allApprovals.some((a) => a.status === "REJECTED")) {
      newExpenseStatus = "REJECTED";
    } else if (
      allApprovals.length > 0 &&
      allApprovals.every((a) => a.status === "APPROVED")
    ) {
      newExpenseStatus = "APPROVED";
    }

    const updated = await db.expense.update({
      where: { id },
      data: {
        status: newExpenseStatus,
        ...(newExpenseStatus !== "PENDING" && {
          approvedById: session.user.id,
          approvedAt: new Date(),
          rejectionNote:
            newExpenseStatus === "REJECTED"
              ? allApprovals.find((a) => a.status === "REJECTED")?.note ?? null
              : null,
        }),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        approvals: { include: { approver: { select: { id: true, name: true, role: true } } } },
      },
    });

    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch (error) {
    console.error("[POST /api/expenses/[id]/approve]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
