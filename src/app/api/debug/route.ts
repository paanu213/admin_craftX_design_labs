import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Temporary diagnostic endpoint — CEO/SUPER_ADMIN only
// Checks whether each new DB table is reachable and returns errors if not
export async function GET() {
  const session = await auth();
  if (!session || !["CEO", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  const tests: [string, () => Promise<unknown>][] = [
    ["clients.count",          () => db.client.count()],
    ["clients.findMany",       () => db.client.findMany({ take: 1, include: { subscription: true } })],
    ["payments.count",         () => db.payment.count()],
    ["devAccessPassword.count",() => db.devAccessPassword.count()],
    ["systemConfig.count",     () => db.systemConfig.count()],
    ["payments.findFirst",     () => db.payment.findFirst({ include: { client: true, recordedBy: true } })],
    ["devPassword.findFirst",  () => db.devAccessPassword.findFirst({ include: { client: true, generatedBy: true } })],
  ];

  for (const [name, fn] of tests) {
    try {
      await fn();
      results[name] = "OK";
    } catch (e) {
      results[name] = String(e);
    }
  }

  return NextResponse.json(results);
}
