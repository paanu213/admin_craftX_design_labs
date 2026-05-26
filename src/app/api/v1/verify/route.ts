/**
 * PUBLIC API — No session required.
 * Shared with third-party developers to validate a CraftX activation key
 * and retrieve the associated client and subscription details.
 *
 * ─── Request ────────────────────────────────────────────────────────────────
 * POST /api/v1/verify
 * Content-Type: application/json
 * { "key": "CX-XXXXX-XXXXX-XXXXX-XXXXX" }
 *
 * ─── Success 200 ────────────────────────────────────────────────────────────
 * {
 *   "success": true,
 *   "client": {
 *     "name": "Acme Corp",
 *     "email": "contact@acme.com",
 *     "phone": "+91 98765 43210",
 *     "company": "Acme Corp Pvt Ltd",
 *     "businessType": "Private Limited",
 *     "gstNumber": "29ABCDE1234F1Z5",
 *     "panNumber": "ABCDE1234F",
 *     "address": {
 *       "line1": "123 MG Road",
 *       "line2": "Near Central Mall",
 *       "locality": "Indiranagar",
 *       "city": "Bengaluru",
 *       "state": "Karnataka",
 *       "pincode": "560038"
 *     }
 *   },
 *   "subscription": {
 *     "plan": "Professional",
 *     "amount": 4999.00,
 *     "currency": "INR",
 *     "billingCycle": "MONTHLY",
 *     "startDate": "2026-05-01T00:00:00.000Z",
 *     "endDate": null,
 *     "renewalDate": "2026-06-01T00:00:00.000Z",
 *     "isActive": true
 *   }
 * }
 *
 * ─── Error responses ────────────────────────────────────────────────────────
 * 400  { "success": false, "error": "key is required" }
 * 404  { "success": false, "error": "Invalid activation key" }
 * 403  { "success": false, "error": "This key has been revoked. Contact CraftX support." }
 * 402  { "success": false, "error": "No active subscription found. Contact CraftX support." }
 * 500  { "success": false, "error": "Internal server error" }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BillingCycle } from "@/generated/prisma/enums";

function nextRenewalDate(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { key } = body as { key?: string };

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json(
        { success: false, error: "key is required" },
        { status: 400 }
      );
    }

    const record = await db.activationKey.findUnique({
      where: { key: key.trim() },
      include: {
        client: { include: { subscription: true } },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Invalid activation key" },
        { status: 404 }
      );
    }

    if (record.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This key has been revoked. Contact CraftX support." },
        { status: 403 }
      );
    }

    const { client } = record;

    if (!client.subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found. Contact CraftX support." },
        { status: 402 }
      );
    }

    // First use — activate the key and start the subscription
    if (record.status === "PENDING") {
      const now = new Date();
      const renewal = nextRenewalDate(now, client.subscription.billingCycle);

      await db.$transaction([
        db.activationKey.update({
          where: { key: key.trim() },
          data: { status: "ACTIVE", activatedAt: now },
        }),
        db.subscription.update({
          where: { clientId: client.id },
          data: { startDate: now, renewalDate: renewal },
        }),
        db.client.update({
          where: { id: client.id },
          data: { status: "ACTIVE" },
        }),
      ]);

      // Refresh subscription dates after activation
      client.subscription.startDate = now;
      client.subscription.renewalDate = renewal;
    }

    const sub = client.subscription;

    return NextResponse.json({
      success: true,
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        businessType: client.businessType,
        gstNumber: client.gstNumber,
        panNumber: client.panNumber,
        address: {
          line1: client.addressLine1,
          line2: client.addressLine2,
          locality: client.locality,
          city: client.city,
          state: client.state,
          pincode: client.pincode,
        },
      },
      subscription: {
        plan: sub.planName,
        amount: Number(sub.price),
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        startDate: sub.startDate,
        endDate: sub.endDate,
        renewalDate: sub.renewalDate,
        isActive: client.status === "ACTIVE",
      },
    });
  } catch (error) {
    console.error("[POST /api/v1/verify]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
