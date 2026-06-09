import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const GENERATE_ROLES = ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"];
const ADMIN_ROLES = ["SUPER_ADMIN", "CEO"];

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateDevPassword(): string {
  const raw = randomBytes(12);
  const chars = Array.from(raw, (byte: number) => CHARSET[byte % 32]).join("");
  return `CXD-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const isAdmin = ADMIN_ROLES.includes(session.user.role);

    const passwords = await db.devAccessPassword.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(!isAdmin ? { generatedById: session.user.id } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        generatedById: true,
        reason: true,
        expiresAt: true,
        usedAt: true,
        usedFromIp: true,
        createdAt: true,
        client: { select: { id: true, name: true, company: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(passwords);
  } catch (error) {
    console.error("[GET /api/dev-passwords]", error);
    return NextResponse.json({ error: "Internal Server Error", detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GENERATE_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to generate dev access passwords" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { clientId, reason } = body as { clientId?: string; reason?: string };

    if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Read expiry from SystemConfig (default 2 hours)
    const config = await db.systemConfig.findUnique({
      where: { key: "DEV_PASSWORD_EXPIRY_HOURS" },
    });
    const expiryHours = config ? parseInt(config.value, 10) || 2 : 2;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const plaintext = generateDevPassword();
    const passwordHash = hashPassword(plaintext);

    const record = await db.devAccessPassword.create({
      data: {
        clientId,
        generatedById: session.user.id,
        passwordHash,
        reason: reason.trim(),
        expiresAt,
      },
      select: {
        id: true,
        clientId: true,
        generatedById: true,
        reason: true,
        expiresAt: true,
        usedAt: true,
        usedFromIp: true,
        createdAt: true,
        client: { select: { id: true, name: true, company: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(
      { ...record, plaintext, expiryHours },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/dev-passwords]", error);
    return NextResponse.json({ error: "Internal Server Error", detail: String(error) }, { status: 500 });
  }
}
