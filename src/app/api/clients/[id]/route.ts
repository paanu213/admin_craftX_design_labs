import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_EDIT_ROLES = ["SUPER_ADMIN", "CEO", "CMO"];
const ALLOWED_DELETE_ROLES = ["SUPER_ADMIN", "CEO"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const client = await db.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        subscription: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("[GET /api/clients/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_EDIT_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updated = await db.client.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        company: body.company,
        industry: body.industry ?? null,
        website: body.website ?? null,
        businessType: body.businessType ?? null,
        pincode: body.pincode ?? null,
        state: body.state ?? null,
        city: body.city ?? null,
        locality: body.locality ?? null,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        appRequirements: body.appRequirements ?? [],
        status: body.status,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/clients/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_DELETE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await db.client.delete({ where: { id } });

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/clients/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
