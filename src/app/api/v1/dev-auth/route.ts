/**
 * PUBLIC API — No session required.
 * Called by the client application to authenticate an employee for dev access.
 *
 * ─── Request ────────────────────────────────────────────────────────────────
 * POST /api/v1/dev-auth
 * Content-Type: application/json
 * {
 *   "email": "emp@craftx.com",
 *   "password": "CXD-XXXX-XXXX-XXXX",
 *   "clientKey": "CX-XXXXX-XXXXX-XXXXX-XXXXX"
 * }
 *
 * ─── Success 200 ────────────────────────────────────────────────────────────
 * {
 *   "success": true,
 *   "employee": { "id": "...", "name": "...", "email": "...", "role": "..." },
 *   "client": { "id": "...", "name": "...", "company": "..." },
 *   "expiresAt": "..."
 * }
 *
 * ─── Error responses ────────────────────────────────────────────────────────
 * 400  { "success": false, "error": "..." }
 * 401  { "success": false, "error": "Invalid credentials" }
 * 404  { "success": false, "error": "..." }
 * 500  { "success": false, "error": "Internal server error" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, clientKey } = body as {
      email?: string;
      password?: string;
      clientKey?: string;
    };

    if (!email || !password || !clientKey) {
      return NextResponse.json(
        { success: false, error: "email, password, and clientKey are required" },
        { status: 400 }
      );
    }

    // Find client by activation key
    const keyRecord = await db.activationKey.findUnique({
      where: { key: clientKey.trim() },
      include: { client: true },
    });

    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid client key" },
        { status: 404 }
      );
    }

    const client = keyRecord.client;

    // Find employee by email
    const employee = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Find a matching, unexpired, unused dev access password
    const now = new Date();
    const devPassword = await db.devAccessPassword.findFirst({
      where: {
        clientId: client.id,
        generatedById: employee.id,
        expiresAt: { gt: now },
        usedAt: null,
      },
    });

    if (!devPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify SHA-256 hash
    const inputHash = hashPassword(password.trim());
    if (inputHash !== devPassword.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Get IP address
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    // Mark as used
    await db.devAccessPassword.update({
      where: { id: devPassword.id },
      data: { usedAt: now, usedFromIp: ip },
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
      },
      expiresAt: devPassword.expiresAt,
    });
  } catch (error) {
    console.error("[POST /api/v1/dev-auth]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
