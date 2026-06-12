import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deposit") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    rejectionNote: z.string().min(1, "Rejection reason is required"),
  }),
  z.object({
    action: z.literal("cancel"),
    cancellationNote: z.string().min(1, "Cancellation reason is required"),
  }),
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        recordedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        cancelledBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    return NextResponse.json({ ...payment, amount: Number(payment.amount) });
  } catch (error) {
    console.error("[GET /api/payments/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    const { id } = await params;

    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const body = await request.json();
    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action } = result.data;

    if (action === "deposit") {
      // Employee marks their received cash as deposited → moves to PENDING_APPROVAL
      if (payment.recordedById !== session.user.id) {
        return NextResponse.json({ error: "You can only deposit your own payments" }, { status: 403 });
      }
      if (payment.status !== "PENDING_DEPOSIT") {
        return NextResponse.json({ error: "Payment is not in pending deposit state" }, { status: 400 });
      }

      const updated = await db.payment.update({
        where: { id },
        data: { status: "PENDING_APPROVAL" },
        include: {
          client: { select: { id: true, name: true, company: true } },
          recordedBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
          cancelledBy: { select: { id: true, name: true, role: true } },
        },
      });
      return NextResponse.json({ ...updated, amount: Number(updated.amount) });
    }

    if (action === "approve" || action === "reject") {
      if (!canDo(matrix, 'payments', 'update')) {
        return NextResponse.json({ error: "You do not have permission to approve payments" }, { status: 403 });
      }
      if (payment.status !== "PENDING_APPROVAL") {
        return NextResponse.json({ error: "Payment is not pending approval" }, { status: 400 });
      }

      const updated = await db.payment.update({
        where: { id },
        data:
          action === "approve"
            ? {
                status: "APPROVED",
                approvedById: session.user.id,
                approvedAt: new Date(),
                rejectionNote: null,
              }
            : {
                status: "REJECTED",
                approvedById: session.user.id,
                approvedAt: new Date(),
                rejectionNote: (result.data as { action: "reject"; rejectionNote: string }).rejectionNote,
              },
        include: {
          client: { select: { id: true, name: true, company: true } },
          recordedBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
          cancelledBy: { select: { id: true, name: true, role: true } },
        },
      });
      return NextResponse.json({ ...updated, amount: Number(updated.amount) });
    }

    if (action === "cancel") {
      if (!canDo(matrix, 'payments', 'delete')) {
        return NextResponse.json({ error: "You do not have permission to cancel payments" }, { status: 403 });
      }
      if (payment.status === "CANCELLED") {
        return NextResponse.json({ error: "Payment is already cancelled" }, { status: 400 });
      }

      const updated = await db.payment.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancellationNote: (result.data as { action: "cancel"; cancellationNote: string }).cancellationNote,
        },
        include: {
          client: { select: { id: true, name: true, company: true } },
          recordedBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
          cancelledBy: { select: { id: true, name: true, role: true } },
        },
      });
      return NextResponse.json({ ...updated, amount: Number(updated.amount) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/payments/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
