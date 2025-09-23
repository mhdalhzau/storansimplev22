import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// ONLY use Aiven database URL - no fallback to prevent using Replit database
const databaseUrl = process.env.AIVEN_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "AIVEN_DATABASE_URL must be set. This application requires Aiven PostgreSQL database.",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });
