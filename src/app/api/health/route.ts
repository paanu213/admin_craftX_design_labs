import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL not set" }, { status: 500 });
  }

  // Show redacted URL so we can verify format without exposing password
  const redacted = url.replace(/:([^:@]+)@/, ":***@");

  try {
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    const result = await pool.query("SELECT COUNT(*) as count FROM users");
    await pool.end();

    return NextResponse.json({
      ok: true,
      userCount: result.rows[0].count,
      urlFormat: redacted,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message,
      urlFormat: redacted,
    }, { status: 500 });
  }
}
