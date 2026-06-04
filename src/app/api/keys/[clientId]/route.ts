import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const REVOKE_ROLES = ["SUPER_ADMIN", "CEO"];

// GET - get key for a specific client (any logged-in user)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId } = await params;

    const key = await db.activationKey.findUnique({
      where: { clientId },
      include: {
        generatedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!key) return NextResponse.json({ error: "No key found for this client" }, { status: 404 });

    return NextResponse.json(key);
  } catch (error) {
    console.error("[GET /api/keys/[clientId]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - revoke key (CEO / SUPER_ADMIN only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!REVOKE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Only CEO or Super Admin can revoke keys" }, { status: 403 });
    }

    const { clientId } = await params;

    const existing = await db.activationKey.findUnique({ where: { clientId } });
    if (!existing) return NextResponse.json({ error: "No key found" }, { status: 404 });

    await db.$transaction([
      db.activationKey.update({
        where: { clientId },
        data: { status: "REVOKED" },
      }),
      db.client.update({
        where: { id: clientId },
        data: { status: "REGISTERED" },
      }),
    ]);

    return NextResponse.json({ message: "Key revoked" });
  } catch (error) {
    console.error("[DELETE /api/keys/[clientId]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
