// Marks any failed migrations as rolled-back so prisma migrate deploy can proceed.
// A migration is "failed" when started_at is set but finished_at is NULL.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(`
      UPDATE "_prisma_migrations"
      SET "rolled_back_at" = NOW()
      WHERE "finished_at"     IS NULL
        AND "rolled_back_at"  IS NULL
        AND "started_at"      IS NOT NULL
    `);
    if (result.rowCount > 0) {
      console.log(`Cleared ${result.rowCount} failed migration(s).`);
    } else {
      console.log("No failed migrations found — nothing to clear.");
    }
  } catch (e) {
    // _prisma_migrations may not exist yet on a fresh DB — that is fine
    console.log("resolve-failed-migrations:", e.message);
  } finally {
    await pool.end();
  }
}

main();
