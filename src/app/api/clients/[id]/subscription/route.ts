import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptionSchema } from "@/lib/validations/client.schema";
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

    const result = subscriptionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      applicationId,
      planName,
      price,
      currency,
      billingCycle,
      startDate,
      endDate,
      renewalDate,
      isAutoRenew,
      features,
    } = result.data;

    const subscription = await db.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        applicationId: applicationId ?? null,
        planName,
        price,
        currency: currency ?? "INR",
        billingCycle: billingCycle as BillingCycle,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        isAutoRenew: isAutoRenew ?? true,
        features: features ?? [],
      },
      update: {
        applicationId: applicationId ?? null,
        planName,
        price,
        currency: currency ?? "INR",
        billingCycle: billingCycle as BillingCycle,
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
      features: Array.isArray(subscription.features) ? subscription.features : [],
    });
  } catch (error) {
    console.error("[POST /api/clients/[id]/subscription]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
