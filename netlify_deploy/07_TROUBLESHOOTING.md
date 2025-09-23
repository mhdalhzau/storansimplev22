# 07. Troubleshooting Netlify Deployment

## 🎯 Overview

Solusi untuk masalah umum yang mungkin terjadi saat dan setelah deployment ke Netlify.

## 🚨 Build Errors

### Error 1: "Command failed with exit code 1"

**Symptoms:**
```bash
Build failed: Command failed with exit code 1
npm ERR! Missing script: "build:netlify"
```

**Solutions:**

1. **Check package.json scripts:**
```json
{
  "scripts": {
    "build:netlify": "cd client && npm install && npm run build"
  }
}
```

2. **Verify build command di netlify.toml:**
```toml
[build]
  command = "npm run build:netlify"
  publish = "client/build"
```

3. **Alternative build commands:**
```bash
# If using separate frontend/backend
command = "cd client && npm ci && npm run build"

# If using workspace
command = "npm install && npm run build --workspace=client"
```

### Error 2: "Module not found" di Functions

**Symptoms:**
```bash
Runtime.ImportModuleError: Error: Cannot find module 'express'
```

**Solutions:**

1. **Add external modules di netlify.toml:**
```toml
[functions]
  external_node_modules = ["express", "pg", "drizzle-orm", "passport"]
  node_bundler = "esbuild"
```

2. **Install dependencies di root:**
```bash
npm install express serverless-http @netlify/functions
```

3. **Use CommonJS di functions:**
```javascript
// ❌ ES6 modules (not supported)
import express from 'express';

// ✅ CommonJS (supported)  
const express = require('express');
```

### Error 3: Database Schema/Migration Issues

**Symptoms:**
```bash
Database error: relation "users" does not exist
```

**Solutions:**

1. **Push schema ke Aiven database:**
```bash
# From Replit environment
npm run db:push --force
```

2. **Verify environment variables:**
```bash
# Check AIVEN_DATABASE_URL di Netlify dashboard
# Ensure connection string is correct
```

3. **Test database connectivity:**
```javascript
// netlify/functions/db-test.js
const { Pool } = require('pg');

exports.handler = async () => {
  const pool = new Pool({
    connectionString: process.env.AIVEN_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'connected', 
        time: result.rows[0].now 
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        status: 'error', 
        message: error.message 
      })
    };
  }
};
```

## 🌐 Runtime Errors

### Error 1: API Endpoints Return 404

**Symptoms:**
```bash
GET /.netlify/functions/api/user → 404 Not Found
```

**Solutions:**

1. **Verify function deployment:**
```bash
# Check if function exists di Netlify dashboard
# Go to Functions tab dan verify 'api' function is deployed
```

2. **Check netlify.toml redirects:**
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true
```

3. **Test function directly:**
```bash
# Access function directly
https://your-app.netlify.app/.netlify/functions/api/health
```

4. **Verify function export:**
```javascript
// netlify/functions/api.js
const serverless = require('serverless-http');
const app = require('./app'); // Your Express app

// ✅ Correct export
module.exports.handler = serverless(app);

// ❌ Wrong export
exports.handler = app;
```

### Error 2: CORS Issues

**Symptoms:**
```bash
Access to fetch at '/.netlify/functions/api/user' 
from origin 'https://your-app.netlify.app' has been blocked by CORS policy
```

**Solutions:**

1. **Add CORS headers di function:**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
```

2. **Add CORS headers di netlify.toml:**
```toml
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

3. **Update frontend API calls:**
```typescript
// Include credentials untuk cookies
fetch('/api/user', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### Error 3: Authentication/Session Issues

**Symptoms:**
```bash
User always appears as unauthenticated
Session data not persisting
```

**Solutions:**

1. **Check session configuration:**
```javascript
// Ensure session store is database-backed
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    pool: pool, // Your database pool
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

2. **Alternative: Use JWT tokens:**
```javascript
// Instead of sessions, use JWT
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verify token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}
```

## 🔧 Performance Issues

### Issue 1: Cold Start Delays

**Symptoms:**
```bash
First API request takes 3-5 seconds
Subsequent requests are fast
```

**Solutions:**

1. **Optimize function size:**
```javascript
// Keep functions small dan focused
// Avoid large dependencies where possible

// ✅ Good - minimal imports
const express = require('express');
const { Pool } = require('pg');

// ❌ Bad - unnecessary imports
const express = require('express');
const lodash = require('lodash');
const moment = require('moment');
const axios = require('axios');
```

2. **Use connection pooling:**
```javascript
// Reuse database connections
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.AIVEN_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1, // Single connection untuk serverless
      idleTimeoutMillis: 1000
    });
  }
  return pool;
}
```

3. **Pre-warm functions:**
```bash
# Set up monitoring yang hits endpoints regularly
# Use external service (UptimeRobot, etc.) untuk ping functions
```

### Issue 2: Database Connection Timeouts

**Symptoms:**
```bash
TimeoutError: Connection timeout
Database connection failed after 30s
```

**Solutions:**

1. **Optimize connection settings:**
```javascript
const pool = new Pool({
  connectionString: process.env.AIVEN_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  
  // Serverless optimizations
  max: 1,
  min: 0,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 3000
});
```

2. **Add connection retry logic:**
```javascript
async function connectWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

3. **Use connection cleanup:**
```javascript
// Close connections properly
process.on('beforeExit', () => {
  if (pool) {
    pool.end();
  }
});
```

## 🔍 Debugging Tools

### 1. Function Logs

```bash
# View real-time logs
netlify functions:logs

# View specific function logs
netlify functions:logs --name=api

# Download logs
netlify functions:logs --download
```

### 2. Local Testing

```bash
# Test functions locally
netlify dev

# Test with specific environment
netlify dev --env=.env.local

# Debug mode
DEBUG=* netlify dev
```

### 3. Debug Function

```javascript
// netlify/functions/debug.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: event.headers,
        queryStringParameters: event.queryStringParameters
      },
      context: {
        functionName: context.functionName,
        functionVersion: context.functionVersion,
        remainingTimeInMillis: context.getRemainingTimeInMillis()
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabase: !!process.env.AIVEN_DATABASE_URL,
        hasSessionSecret: !!process.env.SESSION_SECRET
      }
    }, null, 2)
  };
};
```

## 📊 Monitoring & Alerts

### 1. Set Up Monitoring

```javascript
// netlify/functions/health.js
const { Pool } = require('pg');

exports.handler = async () => {
  const checks = {
    timestamp: new Date().toISOString(),
    database: 'unknown',
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  // Database health check
  try {
    const pool = new Pool({
      connectionString: process.env.AIVEN_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await pool.query('SELECT NOW()');
    checks.database = 'connected';
    checks.dbTime = result.rows[0].now;
    
    await pool.end();
  } catch (error) {
    checks.database = 'error';
    checks.dbError = error.message;
  }
  
  const status = checks.database === 'connected' ? 200 : 503;
  
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checks, null, 2)
  };
};
```

### 2. Error Tracking

```javascript
// Add to main function
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
```

## ✅ Troubleshooting Checklist

### Before Deployment
- [ ] All environment variables set correctly
- [ ] Database schema pushed to Aiven
- [ ] Build succeeds locally
- [ ] Functions tested dengan `netlify dev`
- [ ] No console errors di frontend

### After Deployment Issues
- [ ] Check build logs di Netlify dashboard
- [ ] Verify function deployment
- [ ] Test direct function URLs
- [ ] Check environment variables di Netlify
- [ ] Verify database connectivity
- [ ] Check frontend network requests
- [ ] Review function logs untuk errors

### Performance Issues
- [ ] Monitor cold start times
- [ ] Optimize function bundle size
- [ ] Check database connection pooling
- [ ] Review query performance
- [ ] Set up health monitoring

## 🆘 Getting Help

### 1. Netlify Support Resources

- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Community Forums](https://community.netlify.com)
- [Netlify Support](https://www.netlify.com/support/)

### 2. Common Error Patterns

```bash
# Search patterns di logs:
grep -i "error" netlify-deploy.log
grep -i "timeout" netlify-deploy.log
grep -i "connection" netlify-deploy.log
grep -i "module" netlify-deploy.log
```

### 3. Debug Information to Collect

When asking for help, include:
- Build logs dari Netlify dashboard
- Function logs untuk specific errors
- Network requests dari browser dev tools
- Environment variable configuration (sensitive values)
- Relevant code snippets
- Steps to reproduce the issue

**Success!** Dengan dokumentasi lengkap ini, Anda sekarang memiliki panduan komprehensif untuk deploy aplikasi SPBU ke Netlify dan mengatasi masalah yang mungkin terjadi.