import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvalSchema } from "@/lib/validations/expense.schema";

const ALLOWED_ROLES = ["SUPER_ADMIN", "CEO", "CFO"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();

    const result = approvalSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await db.expense.update({
      where: { id },
      data: {
        status: result.data.status,
        rejectionNote:
          result.data.status === "REJECTED" ? (result.data.rejectionNote ?? null) : null,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch (error) {
    console.error("[POST /api/expenses/[id]/approve]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
