import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDo } from "@/lib/permissions";

function generateDevPassword(): string {
  // Cryptographically random 6-digit number (100000–999999)
  const n = parseInt(randomBytes(3).toString("hex"), 16) % 900000 + 100000;
  return n.toString();
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

    const matrix = session.user.permissionMatrix;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const canSeeAll = canDo(matrix, 'devAccess', 'create');

    const passwords = await db.devAccessPassword.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(!canSeeAll ? { generatedById: session.user.id } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        generatedById: true,
        reason: true,
        password: true,
        expiresAt: true,
        usedAt: true,
        usedFromIp: true,
        createdAt: true,
        client: { select: { id: true, name: true, company: true, clientCode: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    const now = new Date();
    return NextResponse.json(
      passwords.map((p: { usedAt: unknown; expiresAt: Date; password: unknown; [k: string]: unknown }) => ({
        ...p,
        // Only expose plaintext while the password is still active
        password: !p.usedAt && new Date(p.expiresAt) > now ? p.password : null,
      }))
    );
  } catch (error) {
    console.error("[GET /api/dev-passwords]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'devAccess', 'create')) {
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
        password: plaintext,
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
        client: { select: { id: true, name: true, company: true, clientCode: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(
      { ...record, plaintext, expiryHours },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/dev-passwords]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
