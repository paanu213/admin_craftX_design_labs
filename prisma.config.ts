import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection.
    // On Vercel + Supabase: set DIRECT_DATABASE_URL to the direct connection string
    // (port 5432, from Supabase → Project Settings → Database → Connection string → URI)
    // DATABASE_URL can remain the pooler URL (port 6543) for runtime queries.
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
