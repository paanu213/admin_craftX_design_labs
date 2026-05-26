import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const GENERATE_ROLES = ["SUPER_ADMIN", "CEO"];

function generateActivationKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[randomInt(0, chars.length)]).join("");
  return `CX-${segment(5)}-${segment(5)}-${segment(5)}-${segment(5)}`;
}

// GET - list all clients with their key status (any logged-in user)
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

// POST { clientId } - generate activation key (CEO / SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!GENERATE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Only CEO or Super Admin can generate keys" }, { status: 403 });
    }

    const { clientId } = await request.json();
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!client) return NextResponse.json({ error: "Client has no subscription. Add a subscription first." }, { status: 400 });

    // Revoke existing key if present before generating a new one
    await db.activationKey.deleteMany({ where: { clientId } });

    const key = await db.activationKey.create({
      data: {
        clientId,
        key: generateActivationKey(),
        generatedById: session.user.id,
      },
      include: {
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    console.error("[POST /api/keys]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
