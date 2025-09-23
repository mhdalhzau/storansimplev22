import { defineConfig } from "drizzle-kit";

// Use Aiven database URL if available, otherwise fall back to default DATABASE_URL
let databaseUrl = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL;
// For Aiven, SSL is required, so modify config to handle certificates properly
if (databaseUrl && databaseUrl.includes('sslmode=require')) {
  // Keep SSL enabled but ignore certificate verification
}

if (!databaseUrl) {
  throw new Error("AIVEN_DATABASE_URL or DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: { rejectUnauthorized: false },
  },
});
