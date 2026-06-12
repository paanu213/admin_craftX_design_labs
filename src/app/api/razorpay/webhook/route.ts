import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    // Verify webhook signature
    if (secret) {
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
      if (expectedSig !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event as string;

    if (event === "payment_link.paid") {
      const linkEntity = payload.payload?.payment_link?.entity;
      const paymentEntity = payload.payload?.payment?.entity;

      if (!linkEntity?.id) {
        return NextResponse.json({ ok: true });
      }

      // Find our stored payment link
      const stored = await db.razorpayPaymentLink.findUnique({
        where: { razorpayLinkId: linkEntity.id },
        include: {
          client: { select: { id: true } },
          subscription: { select: { id: true } },
        },
      });

      if (!stored) {
        return NextResponse.json({ ok: true });
      }

      // Mark link as paid
      await db.razorpayPaymentLink.update({
        where: { id: stored.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      // Create payment record
      await db.payment.create({
        data: {
          clientId: stored.clientId,
          subscriptionId: stored.subscriptionId ?? null,
          amount: stored.amount,
          currency: stored.currency,
          method: "ONLINE",
          receivedBy: "COMPANY",
          paymentDate: new Date(),
          note: `Razorpay payment | Link ID: ${stored.razorpayLinkId}${paymentEntity?.id ? ` | Payment ID: ${paymentEntity.id}` : ""}`,
          status: "APPROVED",
          isRenewal: false,
          recordedById: stored.createdById,
          approvedById: stored.createdById,
          approvedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/razorpay/webhook]", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
