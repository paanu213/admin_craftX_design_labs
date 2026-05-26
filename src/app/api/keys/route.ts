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
 * Collision odds:
 *   With 1,000,000 keys in the system:
 *   P(any collision) ≈ (10^6)² / (2 × 2^100) ≈ 4 × 10^−22
 *   → You would need to generate more keys than atoms in the solar
 *     system before a single collision becomes likely.
 *
 * Uniqueness:  DB UNIQUE constraint is the hard guarantee.
 *              The retry loop is a belt-and-suspenders fallback that
 *              will never trigger in practice.
 *
 * Format:  CX-XXXXX-XXXXX-XXXXX-XXXXX
 *   - CX prefix identifies CraftX keys
 *   - Dashes are visual separators only (not part of entropy)
 * ────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const GENERATE_ROLES = ["SUPER_ADMIN", "CEO"];

// 32-char alphabet — no 0/O/1/I.  32 divides 256 exactly → zero modulo bias.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateActivationKey(): string {
  // Single CSPRNG call — 160 bits of raw OS entropy
  const raw = randomBytes(20);
  const chars = Array.from(raw, (byte) => CHARSET[byte % 32]).join("");
  return `CX-${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}-${chars.slice(15, 20)}`;
}

/**
 * Generates a key and confirms it doesn't already exist in the DB.
 * Retries up to 5 times — given 2^100 entropy this will never be needed
 * but protects against any future state we can't anticipate.
 */
async function generateUniqueKey(): Promise<string> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const key = generateActivationKey();
    const existing = await db.activationKey.findUnique({ where: { key } });
    if (!existing) return key;
    console.warn(`[keys] Key collision on attempt ${attempt} — retrying`);
  }
  throw new Error("Key generation failed after 5 attempts — this should never happen");
}

// ─── GET: list all activation keys (any logged-in org user) ───────────────────

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

// ─── POST: generate activation key (CEO / SUPER_ADMIN only) ──────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!GENERATE_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only CEO or Super Admin can generate activation keys" },
        { status: 403 }
      );
    }

    const { clientId } = await request.json();
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: { subscription: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client.subscription) {
      return NextResponse.json(
        { error: "Add a subscription plan to this client before generating a key" },
        { status: 400 }
      );
    }

    const uniqueKey = await generateUniqueKey();

    // Delete any previous key before creating — ensures one key per client at all times
    await db.activationKey.deleteMany({ where: { clientId } });

    const record = await db.activationKey.create({
      data: {
        clientId,
        key: uniqueKey,
        generatedById: session.user.id,
      },
      include: {
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[POST /api/keys]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
