import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordPaymentSchema } from "@/lib/validations/payment.schema";
import { canDo } from "@/lib/permissions";
import type { PaymentMethod, PaymentReceiver, PaymentStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const canApprove = canDo(matrix, 'payments', 'update');

    const where: Record<string, unknown> = {};

    // Users without approve permission see only their own recorded payments
    if (!canApprove) {
      where.recordedById = session.user.id;
    }

    if (clientId) where.clientId = clientId;
    if (status) where.status = status as PaymentStatus;

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, company: true } },
        recordedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(
      payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      }))
    );
  } catch (error) {
    console.error("[GET /api/payments]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'payments', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = recordPaymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      clientId,
      subscriptionId,
      amount,
      currency,
      method,
      receivedBy,
      paymentDate,
      note,
      isRenewal,
    } = result.data;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const canApprove = canDo(matrix, 'payments', 'update');

    // Users with approve permission auto-approve; others: PENDING_DEPOSIT for employee-received, PENDING_APPROVAL for company
    let status: PaymentStatus;
    if (canApprove) {
      status = "APPROVED";
    } else if (receivedBy === "COMPANY") {
      status = "PENDING_APPROVAL";
    } else {
      status = "PENDING_DEPOSIT";
    }

    const now = new Date();

    const payment = await db.payment.create({
      data: {
        clientId,
        subscriptionId: subscriptionId ?? null,
        amount,
        currency: currency ?? "INR",
        method: method as PaymentMethod,
        receivedBy: receivedBy as PaymentReceiver,
        paymentDate: new Date(paymentDate),
        note: note ?? null,
        isRenewal: isRenewal ?? false,
        status,
        recordedById: session.user.id,
        approvedById: canApprove ? session.user.id : null,
        approvedAt: canApprove ? now : null,
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        recordedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(
      { ...payment, amount: Number(payment.amount) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
