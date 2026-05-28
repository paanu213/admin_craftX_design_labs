import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validations/expense.schema";

const ADMIN_ROLES = ["SUPER_ADMIN", "CEO", "CFO", "CTO"];

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

    const { id } = await params;
    const body = await request.json();

    const result = expenseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const isAdmin = ADMIN_ROLES.includes(session.user.role);
    if (!isAdmin && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = result.data;

    const updated = await db.expense.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        expenseDate: new Date(data.expenseDate),
        receiptUrl: data.receiptUrl || null,
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

    const { id } = await params;

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const isAdminForDelete = ADMIN_ROLES.includes(session.user.role);
    if (!isAdminForDelete && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/expenses/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
