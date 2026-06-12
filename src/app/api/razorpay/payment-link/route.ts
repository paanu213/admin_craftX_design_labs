import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Razorpay from "razorpay";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment." },
        { status: 503 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { clientId, subscriptionId, amount, currency, description } =
      await request.json();

    if (!clientId || !amount) {
      return NextResponse.json(
        { error: "clientId and amount are required" },
        { status: 400 }
      );
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, email: true, phone: true, company: true, clientCode: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Normalize phone to E.164 format for Razorpay
    const rawPhone = client.phone?.replace(/[\s\-()]/g, "") ?? "";
    const normalizedPhone = rawPhone.startsWith("+91")
      ? rawPhone
      : rawPhone.startsWith("91") && rawPhone.length === 12
      ? `+${rawPhone}`
      : rawPhone.length === 10
      ? `+91${rawPhone}`
      : rawPhone;

    const amountPaise = Math.round(Number(amount) * 100);

    const linkPayload: Record<string, unknown> = {
      amount: amountPaise,
      currency: currency ?? "INR",
      accept_partial: false,
      description: description ?? `Subscription payment for ${client.company}`,
      customer: {
        name: client.name,
        email: client.email,
        contact: normalizedPhone || undefined,
      },
      notify: {
        sms: !!normalizedPhone,
        email: true,
        whatsapp: !!normalizedPhone,
      },
      reminder_enable: true,
      callback_url: process.env.RAZORPAY_CALLBACK_URL ?? undefined,
      callback_method: "get",
      notes: {
        clientId: client.id,
        clientCode: client.clientCode ?? "",
        subscriptionId: subscriptionId ?? "",
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link = await (razorpay.paymentLink as any).create(linkPayload);

    // Store in DB
    const saved = await db.razorpayPaymentLink.create({
      data: {
        clientId,
        subscriptionId: subscriptionId ?? null,
        razorpayLinkId: link.id,
        url: link.short_url ?? link.id,
        shortUrl: link.short_url ?? null,
        amount: Number(amount),
        currency: currency ?? "INR",
        description: description ?? null,
        status: link.status ?? "created",
        expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      id: saved.id,
      razorpayLinkId: link.id,
      url: link.short_url ?? link.id,
      shortUrl: link.short_url,
      amount: Number(amount),
      currency: currency ?? "INR",
      clientName: client.name,
      clientCompany: client.company,
      clientPhone: normalizedPhone,
    });
  } catch (error: unknown) {
    console.error("[POST /api/razorpay/payment-link]", error);
    const msg =
      error instanceof Error ? error.message : "Failed to create payment link";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
