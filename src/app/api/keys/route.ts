/**
 * Key Generation — Security Model
 * ────────────────────────────────────────────────────────────────────
 * Source:    Node.js crypto.randomBytes() — wraps the OS CSPRNG
 *            (getrandom syscall on Linux, CryptGenRandom on Windows).
 *            This is the same entropy source used for TLS session keys.
 *
 * Algorithm: 20 bytes (160 bits) of raw random → map each byte to one
 *            character from a 32-char unambiguous alphabet.
 *
 *            Alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789  (32 chars)
 *              - Omits 0, O, 1, I  → zero visual confusion when reading aloud
 *              - 32 = 2^5; 256 = 2^8; 256 ÷ 32 = 8 exactly → zero modulo bias
 *
 * Entropy:   32^20 = 2^100 ≈ 1.27 × 10^30 possible keys
 *
 * Format:  CX-XXXXX-XXXXX-XXXXX-XXXXX
 * ────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateKeySchema } from "@/lib/validations/payment.schema";
import { canDo } from "@/lib/permissions";
import type { KeyType, PaymentMethod, PaymentReceiver } from "@/generated/prisma/enums";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateActivationKey(): string {
  const raw = randomBytes(20);
  const chars = Array.from(raw, (byte) => CHARSET[byte % 32]).join("");
  return `CX-${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}-${chars.slice(15, 20)}`;
}

async function generateUniqueKey(): Promise<string> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const key = generateActivationKey();
    const existing = await db.activationKey.findUnique({ where: { key } });
    if (!existing) return key;
    console.warn(`[keys] Key collision on attempt ${attempt} — retrying`);
  }
  throw new Error("Key generation failed after 5 attempts");
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keys = await db.activationKey.findMany({
      orderBy: { generatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, company: true, status: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error("[GET /api/keys]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'activationKeys', 'create')) {
      return NextResponse.json(
        { error: "You do not have permission to generate activation keys" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = generateKeySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clientId, keyType, payment } = result.data;

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: { subscription: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (keyType === "SUBSCRIPTION" && !client.subscription) {
      return NextResponse.json(
        { error: "Add a subscription plan to this client before generating a subscription key" },
        { status: 400 }
      );
    }

    // Calculate expiry
    const now = new Date();
    let expiresAt: Date | null = null;
    if (keyType === "TRIAL") {
      expiresAt = addDays(now, 15);
    } else if (client.subscription?.renewalDate) {
      expiresAt = new Date(client.subscription.renewalDate);
    }

    // New client status
    const newClientStatus = keyType === "TRIAL" ? "TRIAL" : "KEY_GENERATED";

    const uniqueKey = await generateUniqueKey();

    await db.activationKey.deleteMany({ where: { clientId } });

    const [record] = await db.$transaction([
      db.activationKey.create({
        data: {
          clientId,
          key: uniqueKey,
          keyType: keyType as KeyType,
          expiresAt,
          generatedById: session.user.id,
        },
        include: {
          generatedBy: { select: { id: true, name: true, role: true } },
        },
      }),
      db.client.update({
        where: { id: clientId },
        data: { status: newClientStatus },
      }),
    ]);

    // Record payment if provided (CEO/SUPER_ADMIN auto-approve own payment)
    if (payment && keyType === "SUBSCRIPTION") {
      await db.payment.create({
        data: {
          clientId,
          subscriptionId: client.subscription?.id ?? null,
          amount: payment.amount,
          currency: payment.currency ?? "INR",
          method: payment.method as PaymentMethod,
          receivedBy: payment.receivedBy as PaymentReceiver,
          paymentDate: new Date(payment.paymentDate),
          note: payment.note ?? null,
          isRenewal: payment.isRenewal ?? false,
          status: "APPROVED",
          recordedById: session.user.id,
          approvedById: session.user.id,
          approvedAt: now,
        },
      });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[POST /api/keys]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
