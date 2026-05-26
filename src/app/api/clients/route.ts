import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ClientStatus } from "@/generated/prisma/enums";

const ALLOWED_CREATE_ROLES = ["SUPER_ADMIN", "CEO", "CMO"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.max(1, Number(searchParams.get("limit") ?? 10));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as ClientStatus | null;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
    };

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { subscription: true },
      }),
      db.client.count({ where }),
    ]);

    return NextResponse.json({
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/clients]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_CREATE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const client = await db.client.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        company: body.company,
        industry: body.industry ?? null,
        website: body.website ?? null,
        businessType: body.businessType ?? null,
        gstNumber: body.gstNumber ?? null,
        panNumber: body.panNumber ?? null,
        pincode: body.pincode ?? null,
        state: body.state ?? null,
        city: body.city ?? null,
        locality: body.locality ?? null,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        appRequirements: body.appRequirements ?? [],
        status: body.status ?? "TRIAL",
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[POST /api/clients]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
