import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "CEO", "CFO"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ ...expense, amount: Number(expense.amount) });
  } catch (error) {
    console.error("[GET /api/expenses/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const updated = await db.expense.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description ?? null,
        amount: body.amount,
        currency: body.currency,
        category: body.category,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        receiptUrl: body.receiptUrl ?? null,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch (error) {
    console.error("[PUT /api/expenses/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/expenses/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
