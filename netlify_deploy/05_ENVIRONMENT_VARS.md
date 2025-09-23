# 05. Environment Variables Setup di Netlify

## 🎯 Overview

Konfigurasi environment variables yang diperlukan untuk deployment aplikasi di Netlify.

## 🔐 Required Environment Variables

### 1. Database Configuration

```bash
# Aiven PostgreSQL Database
AIVEN_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# SSL Certificate (copy exact content dengan newlines)
AIVEN_CA_CERT=-----BEGIN CERTIFICATE-----
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

### 2. Authentication & Security

```bash
# Session Secret (generate strong random string)
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters-long

# JWT Secret untuk token-based auth (optional)
JWT_SECRET=your-jwt-secret-key-for-token-authentication

# Password hashing salt rounds
BCRYPT_SALT_ROUNDS=12
```

### 3. Application Environment

```bash
# Environment
NODE_ENV=production

# SSL Configuration untuk Aiven
NODE_TLS_REJECT_UNAUTHORIZED=0

# Application URL (set automatically oleh Netlify)
# NETLIFY_URL=https://your-app.netlify.app (auto-generated)
```

### 4. External Services (Optional)

```bash
# Google Sheets Integration (jika digunakan)
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account"...}

# Other integrations
API_TIMEOUT=30000
MAX_REQUEST_SIZE=50mb
```

## 🛠️ Setup di Netlify Dashboard

### Step 1: Access Environment Variables

1. Login ke [Netlify Dashboard](https://app.netlify.com)
2. Select your site/project
3. Go to **Site Settings**
4. Click **Environment Variables** di sidebar
5. Click **Add new variable**

### Step 2: Add Variables One by One

**Database Variables:**

| Key | Value | Notes |
|-----|-------|-------|
| `AIVEN_DATABASE_URL` | `postgresql://user:pass@host:port/db?sslmode=require` | Copy dari Aiven dashboard |
| `AIVEN_CA_CERT` | Certificate content | Copy seluruh certificate dengan BEGIN/END |

**Security Variables:**

| Key | Value | Notes |
|-----|-------|-------|
| `SESSION_SECRET` | Random 32+ character string | Generate dengan: `openssl rand -hex 32` |
| `JWT_SECRET` | Random string | Generate dengan: `openssl rand -base64 32` |

**Environment Variables:**

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Set environment mode |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` | Allow Aiven SSL connections |

### Step 3: Verify Configuration

Setelah menambahkan semua variables, verify dengan:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Check deploy logs untuk errors
4. Test API endpoints setelah deploy selesai

## 🔐 Generating Secure Secrets

### 1. Session Secret

```bash
# Generate strong session secret
openssl rand -hex 32

# Alternative dengan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. JWT Secret

```bash
# Generate JWT secret
openssl rand -base64 32

# Alternative dengan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Password Salt

```bash
# Good default untuk production
BCRYPT_SALT_ROUNDS=12
```

## 📱 Testing Environment Variables

### 1. Create Test Function

**File: `netlify/functions/env-test.js`**

```javascript
exports.handler = async (event, context) => {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Not allowed in production' })
    };
  }
  
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    AIVEN_DATABASE_URL: process.env.AIVEN_DATABASE_URL ? 'configured' : 'missing',
    AIVEN_CA_CERT: process.env.AIVEN_CA_CERT ? 'configured' : 'missing',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'configured' : 'missing',
    JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
  };
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Environment variables status',
      environment: envStatus,
      timestamp: new Date().toISOString()
    })
  };
};
```

### 2. Test Database Connection

**File: `netlify/functions/db-test.js`**

```javascript
const { Pool } = require('pg');

exports.handler = async (event, context) => {
  if (process.env.NODE_ENV === 'production') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'DB test not allowed in production' })
    };
  }
  
  let pool;
  
  try {
    pool = new Pool({
      connectionString: process.env.AIVEN_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        database_time: result.rows[0].current_time,
        database_version: result.rows[0].db_version,
        connection: 'established'
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        connection: 'failed'
      })
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
};
```

## 🔍 Debugging Environment Issues

### Common Problems & Solutions

**1. Environment Variable tidak terbaca**
```bash
# Solution: Check spelling dan case sensitivity
# Netlify environment variables are case-sensitive
```

**2. Database connection gagal**
```bash
# Check format connection string:
postgresql://username:password@host:port/database?sslmode=require

# Common issues:
# - Missing ?sslmode=require
# - Wrong username/password
# - Incorrect port number
```

**3. SSL Certificate issues**
```bash
# Ensure AIVEN_CA_CERT contains complete certificate:
# - Must include -----BEGIN CERTIFICATE-----
# - Must include -----END CERTIFICATE-----
# - Preserve all line breaks
```

### Environment Variable Priority

Netlify loads environment variables dalam order:

1. **Build-time variables** (set di dashboard)
2. **Deploy context variables** (production/preview)
3. **File-based variables** (netlify.toml)
4. **Default values** dalam code

## ✅ Verification Checklist

- [ ] All required environment variables set
- [ ] Database connection string correct
- [ ] SSL certificate properly configured
- [ ] Session/JWT secrets generated securely
- [ ] Test functions deployed dan working
- [ ] No sensitive data di git repository
- [ ] Production vs development variables separated

## 🔄 Next Steps

Lanjut ke `06_DEPLOY_PROCESS.md` untuk step-by-step deployment process.