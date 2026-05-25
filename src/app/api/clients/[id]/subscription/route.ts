import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { BillingCycle } from "@/generated/prisma/enums";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();

    const {
      planName,
      price,
      currency,
      billingCycle,
      startDate,
      endDate,
      renewalDate,
      isAutoRenew,
      features,
    }: {
      planName: string;
      price: number;
      currency: string;
      billingCycle: BillingCycle;
      startDate: string;
      endDate?: string;
      renewalDate?: string;
      isAutoRenew: boolean;
      features: string[];
    } = body;

    const subscription = await db.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        planName,
        price,
        currency: currency ?? "USD",
        billingCycle: billingCycle ?? "MONTHLY",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        isAutoRenew: isAutoRenew ?? true,
        features: features ?? [],
      },
      update: {
        planName,
        price,
        currency: currency ?? "USD",
        billingCycle: billingCycle ?? "MONTHLY",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        isAutoRenew: isAutoRenew ?? true,
        features: features ?? [],
      },
    });

    return NextResponse.json({
      ...subscription,
      price: Number(subscription.price),
    });
  } catch (error) {
    console.error("[POST /api/clients/[id]/subscription]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
