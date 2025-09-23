# 02. Setup Aiven Database

## Langkah 1: Persiapan Secrets

Aplikasi membutuhkan 2 environment variables yang harus diset sebagai secrets di Replit:

### 1. AIVEN_DATABASE_URL
Format connection string Aiven PostgreSQL:
```
postgresql://username:password@host:port/defaultdb?sslmode=require
```

**Cara mendapatkan:**
1. Login ke dashboard Aiven
2. Pilih service PostgreSQL Anda
3. Copy connection string dari tab "Overview"

### 2. AIVEN_CA_CERT
CA Certificate untuk SSL connection:

```
-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUFwqE9MW2mEfLCdNnlLOn7E9YBpYwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1NTA1ZDVlNjItNjU3OC00M2I1LTllMzItOWRkNWVkZmU0
YjljIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwOTIzMjA0ODIwWhcNMzUwOTIxMjA0
ODIwWjBAMT4wPAYDVQQDDDU1MDVkNWU2Mi02NTc4LTQzYjUtOWUzMi05ZGQ1ZWRm
ZTRiOWMgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBANX6xqiKh0StZPNRp1+KYn2FdBE6epqotkntBJdR3gVYNHF4+SnpR4BJ
B/R+FjyIzvfVfwezQL8ccIi1w0cjMoxC16OxBua3rTarDEPyWB0hEedOLnW6fF/9
l8ducEw9HxZaXiPcQZGXjM0AzKaVkGSqAZi0HTVWn3d41e6z72dq9okQp0TMViK2
NQ4dBSviFPT7nUeyQl7nQY9J+j2PSvfQT6qDvHg5bj1BBgsGZ9KUwaaepe4PWanu
uvYhBxPJDH3o1Y44fQguGyVOC7RkvbJE940s28FozJNBIW6Nh7FLlxje/ezfj+4k
YHFe+yh7SeJDDOfIShiv+reRpXaXcXZKs1Ssh5wQD4TGaxv3kbJ1xE1hLE/J/aZW
tkAB7ISTmW9kkIQxhxhJ2NJRqqOROGSsrNM+BfdazHmeccpL6xrtT8KVXGDhLqLP
ZVeMh63zxDLGOlNX4t3Xz93snduWm1yUerw3N0SZ7Zf2wpIiW27oAEywqdLbGRuX
+APOtWZiIQIDAQABo0IwQDAdBgNVHQ4EFgQU1/suOwpELUMO5XODwSfjyN0iM8Mw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBALHS63kqsjFiGIKByExMO18GUo+N+OrbHdysp6SC7+eJFYEfgcT7u+V+NAAP
SJCHfOFiyYwRWFqZxUsCutcQwT08+RRwgX9q/bk1bF00NnIp/wZYyZn1g0XAp4MB
Drr0i1VJE4oqxyTSpMk0FDL/3Y4JxzKsnhqMTYyL1KQTTwJeALKRyCu1muAFYivl
gxMXq35TTqWDMo+dyLvohghi7zlwMmz+Z63PulTOuLUaWV3Lhln4kXEXiHpvDmL/
RhtWTvhtUYKexr6PddSThzwhy3pO88iV+0ilRyRPxuSXpHC1wg7YdAHuHPk3/aOc
SJdQVjMT33kMydtwrSHrErtLP3qa3ZEpxSvD7+fo8RpmL7lh5saGloETvafPEceA
jRmCpiru7XW9s761Swt49UFok0lRbJtligf39q71oNmGAYRMpXYVw4VvQW/rcWQd
usRneiLXGYfESn2sXGmYsMDRvwTrSSsJ0r4oVpzCxCQPGXqiSol+s7qSVrAWqEG5
I7eWAg==
-----END CERTIFICATE-----
```

## Langkah 2: Set Secrets di Replit

1. Buka tab **Secrets** di project Replit
2. Add secret baru:
   - **Key**: `AIVEN_DATABASE_URL`
   - **Value**: Connection string Aiven Anda
3. Add secret kedua:
   - **Key**: `AIVEN_CA_CERT` 
   - **Value**: Copy paste seluruh certificate di atas

## Langkah 3: Verifikasi Database Configuration

File konfigurasi database di `server/db.ts`:

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

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
```

## Status: ✅ Database Configuration Selesai

Database Aiven PostgreSQL siap digunakan.