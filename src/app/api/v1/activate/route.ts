/**
 * PUBLIC API — No session required. Used by the CraftX client EXE application.
 *
 * POST /api/v1/activate
 * Body: { "key": "CX-XXXXX-XXXXX-XXXXX-XXXXX" }
 *
 * Behavior:
 *   - PENDING key  → activates subscription (startDate = now), returns full client profile
 *   - ACTIVE key   → idempotent; returns current client profile (handles reinstall)
 *   - REVOKED key  → 403 Forbidden
 *   - Unknown key  → 404 Not Found
 *
 * Success response 200:
 * {
 *   "success": true,
 *   "alreadyActivated": false,        // true if this was a reinstall
 *   "activatedAt": "ISO date string",
 *   "client": {
 *     "id": "...",
 *     "name": "...",
 *     "company": "...",
 *     "email": "...",
 *     "phone": "...",
 *     "businessType": "...",
 *     "gstNumber": "...",
 *     "panNumber": "...",
 *     "address": {
 *       "addressLine1": "...",
 *       "addressLine2": "...",
 *       "locality": "...",
 *       "city": "...",
 *       "state": "...",
 *       "pincode": "..."
 *     },
 *     "appRequirements": ["WEB", "MOBILE", "DESKTOP"],
 *     "status": "ACTIVE",
 *     "subscription": {
 *       "planName": "...",
 *       "billingCycle": "MONTHLY|QUARTERLY|ANNUALLY",
 *       "price": 9999.00,
 *       "currency": "INR",
 *       "startDate": "ISO date string",
 *       "renewalDate": "ISO date string",
 *       "endDate": "ISO date string | null",
 *       "isAutoRenew": true,
 *       "features": ["feature1", "feature2"]
 *     }
 *   }
 * }
 *
 * Error responses:
 *   400: { "success": false, "error": "key is required" }
 *   403: { "success": false, "error": "This key has been revoked. Contact your admin." }
 *   404: { "success": false, "error": "Invalid activation key" }
 *   422: { "success": false, "error": "No subscription found. Contact your admin." }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BillingCycle } from "@/generated/prisma/enums";

function calculateRenewalDate(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

function buildClientPayload(client: {
  id: string; name: string; company: string; email: string; phone: string | null;
  businessType: string | null; gstNumber: string | null; panNumber: string | null;
  addressLine1: string | null; addressLine2: string | null; locality: string | null;
  city: string | null; state: string | null; pincode: string | null;
  appRequirements: string[]; status: string;
  subscription: {
    planName: string; billingCycle: BillingCycle; price: object;
    currency: string; startDate: Date; renewalDate: Date | null;
    endDate: Date | null; isAutoRenew: boolean; features: string[];
  } | null;
}) {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    businessType: client.businessType,
    gstNumber: client.gstNumber,
    panNumber: client.panNumber,
    address: {
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      locality: client.locality,
      city: client.city,
      state: client.state,
      pincode: client.pincode,
    },
    appRequirements: client.appRequirements,
    status: client.status,
    subscription: client.subscription
      ? {
          planName: client.subscription.planName,
          billingCycle: client.subscription.billingCycle,
          price: Number(client.subscription.price),
          currency: client.subscription.currency,
          startDate: client.subscription.startDate,
          renewalDate: client.subscription.renewalDate,
          endDate: client.subscription.endDate,
          isAutoRenew: client.subscription.isAutoRenew,
          features: client.subscription.features,
        }
      : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { key } = body as { key?: string };

    if (!key) {
      return NextResponse.json({ success: false, error: "key is required" }, { status: 400 });
    }

    const record = await db.activationKey.findUnique({
      where: { key },
      include: {
        client: { include: { subscription: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: "Invalid activation key" }, { status: 404 });
    }

    if (record.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This key has been revoked. Contact your admin." },
        { status: 403 }
      );
    }

    if (!record.client.subscription) {
      return NextResponse.json(
        { success: false, error: "No subscription found. Contact your admin." },
        { status: 422 }
      );
    }

    // Already activated — idempotent (handles reinstall scenario)
    if (record.status === "ACTIVE") {
      return NextResponse.json({
        success: true,
        alreadyActivated: true,
        activatedAt: record.activatedAt,
        client: buildClientPayload(record.client),
      });
    }

    // First activation
    const now = new Date();
    const renewal = calculateRenewalDate(now, record.client.subscription.billingCycle);

    const [updatedKey, , updatedClient] = await db.$transaction([
      db.activationKey.update({
        where: { key },
        data: { status: "ACTIVE", activatedAt: now },
      }),
      db.subscription.update({
        where: { clientId: record.clientId },
        data: { startDate: now, renewalDate: renewal },
      }),
      db.client.update({
        where: { id: record.clientId },
        data: { status: "ACTIVE" },
        include: { subscription: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      alreadyActivated: false,
      activatedAt: updatedKey.activatedAt,
      client: buildClientPayload(updatedClient),
    });
  } catch (error) {
    console.error("[POST /api/v1/activate]", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
