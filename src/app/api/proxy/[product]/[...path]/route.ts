import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { product: string; path: string[] };

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<Params> },
  method: string
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { product: slug, path } = await params;

    const product = await db.product.findUnique({ where: { slug } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found or inactive" }, { status: 404 });
    }
    if (!product.apiUrl || !product.apiKey) {
      return NextResponse.json({ error: "Product API is not configured" }, { status: 503 });
    }

    const apiPath = path.join("/");
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = `${product.apiUrl.replace(/\/$/, "")}/${apiPath}${queryString ? `?${queryString}` : ""}`;

    const headers: Record<string, string> = {
      "x-admin-api-key": product.apiKey,
      "Content-Type": "application/json",
    };

    const fetchInit: RequestInit = { method, headers };

    if (method !== "GET" && method !== "HEAD") {
      try {
        fetchInit.body = await request.text();
      } catch {
        // no body
      }
    }

    const upstream = await fetch(targetUrl, fetchInit);
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    console.error("[proxy]", error);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<Params> }) {
  return handleProxy(request, ctx, "GET");
}
export async function POST(request: NextRequest, ctx: { params: Promise<Params> }) {
  return handleProxy(request, ctx, "POST");
}
export async function PUT(request: NextRequest, ctx: { params: Promise<Params> }) {
  return handleProxy(request, ctx, "PUT");
}
export async function PATCH(request: NextRequest, ctx: { params: Promise<Params> }) {
  return handleProxy(request, ctx, "PATCH");
}
export async function DELETE(request: NextRequest, ctx: { params: Promise<Params> }) {
  return handleProxy(request, ctx, "DELETE");
}
