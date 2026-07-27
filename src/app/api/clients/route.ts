import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientSchema } from "@/lib/validations/client.schema";
import { canDo } from "@/lib/permissions";
import type { ClientStatus } from "@/generated/prisma/enums";

function periodFilter(period: string | null): { gte?: Date; lt?: Date } | undefined {
  if (!period || period === "all") return undefined;
  const now = new Date();
  if (period === "this_month") return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (period === "last_month") return {
    gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    lt: new Date(now.getFullYear(), now.getMonth(), 1),
  };
  if (period === "yearly") return { gte: new Date(now.getFullYear(), 0, 1) };
  return undefined;
}

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
    const period = searchParams.get("period");
    const dateRange = periodFilter(period);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
          { clientCode: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
      ...(dateRange && { createdAt: dateRange }),
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
      data: clients.map((c: {
        appRequirements: unknown;
        subscription: { price: unknown; features: unknown; [k: string]: unknown } | null;
        [k: string]: unknown;
      }) => ({
        ...c,
        appRequirements: Array.isArray(c.appRequirements) ? c.appRequirements : [],
        subscription: c.subscription
          ? {
              ...c.subscription,
              price: Number(c.subscription.price),
              features: Array.isArray(c.subscription.features)
                ? c.subscription.features
                : [],
            }
          : null,
      })),
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

    const matrix = session.user.permissionMatrix;
    if (!canDo(matrix, 'clients', 'create')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const result = clientSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const [{ nextval }] = await db.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('client_code_seq')`;
    const clientCode = `CX-${String(nextval).padStart(4, "0")}`;

    const client = await db.client.create({
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
        status: "REGISTERED",
        notes: data.notes || null,
        clientCode,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[POST /api/clients]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
