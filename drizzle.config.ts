import { defineConfig } from "drizzle-kit";

// ONLY use Aiven database URL - no fallback to prevent using Replit database  
let databaseUrl = process.env.AIVEN_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("AIVEN_DATABASE_URL must be set. This application requires Aiven PostgreSQL database.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: process.env.AIVEN_CA_CERT ? {
      rejectUnauthorized: false,
      ca: process.env.AIVEN_CA_CERT
    } : { rejectUnauthorized: false },
  },
});
