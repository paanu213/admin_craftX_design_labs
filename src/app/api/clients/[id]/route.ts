import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientSchema } from "@/lib/validations/client.schema";

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

    const client = await db.client.findUnique({ where: { id } });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let contacts: unknown[] = [];
    let subscription = null;
    let activationKey = null;

    try {
      contacts = await db.contact.findMany({ where: { clientId: id } });
    } catch {}

    try {
      subscription = await db.subscription.findUnique({ where: { clientId: id } });
    } catch {}

    try {
      activationKey = await db.activationKey.findUnique({
        where: { clientId: id },
        include: {
          generatedBy: { select: { id: true, name: true, role: true } },
        },
      });
    } catch {}

    return NextResponse.json({
      ...client,
      // pg adapter may return text[] as raw "{val}" strings — normalise to JS arrays
      appRequirements: Array.isArray(client.appRequirements)
        ? client.appRequirements
        : [],
      contacts,
      subscription: subscription
        ? {
            ...subscription,
            price: Number(subscription.price),
            features: Array.isArray((subscription as { features: unknown }).features)
              ? (subscription as { features: string[] }).features
              : [],
          }
        : null,
      activationKey,
    });
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

    const result = clientSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const data = result.data;

    const updated = await db.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company,
        industry: data.industry || null,
        website: data.website || null,
        businessType: data.businessType || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        pincode: data.pincode || null,
        state: data.state || null,
        city: data.city || null,
        locality: data.locality || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        appRequirements: data.appRequirements ?? [],
        status: data.status,
        notes: data.notes || null,
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
