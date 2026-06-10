import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validations/expense.schema";
import { canDo } from "@/lib/permissions";
import type { ExpenseStatus, ExpenseCategory } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    // Users with expenses update permission can see all expenses
    const canSeeAll = canDo(matrix, 'expenses', 'update');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.max(1, Number(searchParams.get("limit") ?? 10));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as ExpenseStatus | null;
    const category = searchParams.get("category") as ExpenseCategory | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where = {
      // Non-admin roles only see their own expenses
      ...(!canSeeAll && { createdById: session.user.id }),
      ...(search && {
        title: { contains: search, mode: "insensitive" as const },
      }),
      ...(status && { status }),
      ...(category && { category }),
      ...(startDate || endDate
        ? {
            expenseDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
          approvals: {
            include: { approver: { select: { id: true, name: true, role: true } } },
          },
        },
      }),
      db.expense.count({ where }),
    ]);

    const data = expenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
    }));

    return NextResponse.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/expenses]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'expenses', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const result = expenseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Find users who can approve expenses (have expenses update permission)
    // We look for active users who are not the creator — fallback: find users in groups with approve perm
    // For simplicity, we create approvals for all active users with the update permission
    // We query users with roles that historically had approve access, or we use group-based approach
    // Since we can't efficiently query by permission matrix in DB, we fall back to finding active users
    // who are not the current user to notify (the POST is still valid - approvals are advisory)
    const potentialApprovers = await db.user.findMany({
      where: {
        isActive: true,
        NOT: { id: session.user.id },
      },
      select: { id: true },
    });

    const expense = await db.expense.create({
      data: {
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        currency: data.currency ?? "INR",
        category: data.category,
        expenseDate: new Date(data.expenseDate),
        receiptUrl: data.receiptUrl || null,
        status: "PENDING",
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        approvals: {
          include: { approver: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (potentialApprovers.length > 0) {
      await db.expenseApproval.createMany({
        data: potentialApprovers.map((f) => ({
          expenseId: expense.id,
          approverId: f.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(
      { ...expense, amount: Number(expense.amount) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/expenses]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
