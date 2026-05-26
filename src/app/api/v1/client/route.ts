/**
 * PUBLIC API — No session required. Used by the CraftX client EXE application
 * to sync the latest client/subscription details after initial activation.
 *
 * GET /api/v1/client?key=CX-XXXXX-XXXXX-XXXXX-XXXXX
 *
 * Returns the same payload shape as /api/v1/activate for consistency.
 *
 * Success 200:
 * {
 *   "success": true,
 *   "client": { ...same shape as activate response... }
 * }
 *
 * Error responses:
 *   400: { "success": false, "error": "key query parameter is required" }
 *   401: { "success": false, "error": "Invalid activation key" }
 *   403: { "success": false, "error": "Key revoked or not yet activated" }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "key query parameter is required" },
        { status: 400 }
      );
    }

    const record = await db.activationKey.findUnique({
      where: { key },
      include: {
        client: { include: { subscription: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: "Invalid activation key" }, { status: 401 });
    }

    if (record.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Key revoked or not yet activated" },
        { status: 403 }
      );
    }

    const c = record.client;
    return NextResponse.json({
      success: true,
      client: {
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        businessType: c.businessType,
        gstNumber: c.gstNumber,
        panNumber: c.panNumber,
        address: {
          addressLine1: c.addressLine1,
          addressLine2: c.addressLine2,
          locality: c.locality,
          city: c.city,
          state: c.state,
          pincode: c.pincode,
        },
        appRequirements: c.appRequirements,
        status: c.status,
        subscription: c.subscription
          ? {
              planName: c.subscription.planName,
              billingCycle: c.subscription.billingCycle,
              price: Number(c.subscription.price),
              currency: c.subscription.currency,
              startDate: c.subscription.startDate,
              renewalDate: c.subscription.renewalDate,
              endDate: c.subscription.endDate,
              isAutoRenew: c.subscription.isAutoRenew,
              features: c.subscription.features,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/v1/client]", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
