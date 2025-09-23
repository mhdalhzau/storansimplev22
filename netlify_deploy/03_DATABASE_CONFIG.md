# 03. Database Configuration untuk Serverless

## 🎯 Overview

Konfigurasi database Aiven PostgreSQL untuk bekerja dengan Netlify Functions (serverless environment).

## ⚠️ Challenges Serverless Database

### Masalah Connection Pooling

**Problem**: Serverless functions create new connections setiap invocation
**Impact**: Database connection limit exceeded, performance issues

**Solution**: Optimize connection management untuk serverless

## 🔧 Database Setup untuk Netlify Functions

### 1. Optimized Database Connection

**File: `netlify/functions/db-config.js`**

```javascript
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

// Global connection pool (reused across function invocations)
let globalPool = null;

function createDatabasePool() {
  if (globalPool) {
    return globalPool;
  }

  const databaseUrl = process.env.AIVEN_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('AIVEN_DATABASE_URL must be set for Netlify deployment');
  }

  // Optimized pool configuration untuk serverless
  globalPool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    
    // Serverless-optimized pool settings
    max: 1,                    // Maximum 1 connection per function
    min: 0,                    // No minimum connections
    idleTimeoutMillis: 1000,   // Close idle connections quickly
    connectionTimeoutMillis: 2000, // Fast connection timeout
    acquireTimeoutMillis: 1000, // Quick acquire timeout
    
    // Keep connections alive for reuse
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });

  // Handle pool errors
  globalPool.on('error', (err) => {
    console.error('Database pool error:', err);
    globalPool = null; // Reset pool on error
  });

  return globalPool;
}

// Initialize database with optimized pool
function getDatabase() {
  const pool = createDatabasePool();
  return drizzle(pool);
}

// Connection cleanup untuk serverless
function closeDatabaseConnection() {
  if (globalPool) {
    globalPool.end().catch(console.error);
    globalPool = null;
  }
}

// Export for use in functions
module.exports = {
  getDatabase,
  createDatabasePool,
  closeDatabaseConnection
};
```

### 2. Database Operations Helper

**File: `netlify/functions/db-operations.js`**

```javascript
const { getDatabase } = require('./db-config');

// User operations
async function getUserByEmail(email) {
  const db = getDatabase();
  
  try {
    // Use direct SQL for better performance in serverless
    const result = await db.execute(`
      SELECT id, email, name, role, password 
      FROM users 
      WHERE email = $1 
      LIMIT 1
    `, [email]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
}

async function getUserById(id) {
  const db = getDatabase();
  
  try {
    const result = await db.execute(`
      SELECT id, email, name, role 
      FROM users 
      WHERE id = $1 
      LIMIT 1
    `, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}

async function createUser(userData) {
  const db = getDatabase();
  
  try {
    const { email, name, role, password } = userData;
    
    const result = await db.execute(`
      INSERT INTO users (email, name, role, password, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, email, name, role
    `, [email, name, role, password]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Sales operations
async function getSalesByStore(storeId, startDate, endDate) {
  const db = getDatabase();
  
  try {
    let query = 'SELECT * FROM sales WHERE store_id = $1';
    const params = [storeId];
    
    if (startDate) {
      query += ' AND date >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= $' + (params.length + 1);
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC';
    
    const result = await db.execute(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
}

async function createSales(salesData) {
  const db = getDatabase();
  
  try {
    const {
      storeId,
      userId,
      date,
      totalSales,
      transactions,
      fuelSales,
      nonFuelSales
    } = salesData;
    
    const result = await db.execute(`
      INSERT INTO sales (
        store_id, user_id, date, total_sales, 
        transactions, fuel_sales, non_fuel_sales, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [storeId, userId, date, totalSales, transactions, fuelSales, nonFuelSales]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating sales:', error);
    throw error;
  }
}

// Export all operations
module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  getSalesByStore,
  createSales
};
```

## 🔐 Session Management untuk Serverless

### Challenge: Stateless Sessions

**Problem**: Express sessions don't work well in serverless
**Solution**: Database-backed sessions atau JWT tokens

### Option 1: Database Sessions (PostgreSQL)

```javascript
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Session store configuration
const sessionStore = new pgSession({
  pool: createDatabasePool(),
  tableName: 'user_sessions',
  createTableIfMissing: true,
  
  // Serverless optimizations
  touchAfter: 24 * 3600, // 1 day lazy touch
  pruneSessionInterval: false, // Disable auto-cleanup
});

const sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'netlify-secret',
  resave: false,
  saveUninitialized: false,
  name: 'spbu.sid',
  
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
};
```

### Option 2: JWT Authentication (Recommended)

```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware untuk authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}
```

## 🚀 Performance Optimizations

### 1. Connection Warming

```javascript
// Function untuk warm up database connection
async function warmUpDatabase() {
  try {
    const db = getDatabase();
    await db.execute('SELECT 1');
    console.log('Database connection warmed up');
  } catch (error) {
    console.error('Database warm-up failed:', error);
  }
}

// Call di awal function
exports.handler = async (event, context) => {
  await warmUpDatabase();
  // ... rest of function logic
};
```

### 2. Query Optimization

```javascript
// Use prepared statements untuk queries yang sering dipakai
const preparedQueries = {
  getUserByEmail: 'SELECT * FROM users WHERE email = $1',
  getUserById: 'SELECT * FROM users WHERE id = $1',
  getSalesById: 'SELECT * FROM sales WHERE id = $1'
};

async function executeQuery(queryName, params) {
  const db = getDatabase();
  return await db.execute(preparedQueries[queryName], params);
}
```

### 3. Connection Cleanup

```javascript
// Cleanup function untuk end of function execution
process.on('beforeExit', () => {
  closeDatabaseConnection();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  closeDatabaseConnection();
  process.exit(0);
});
```

## 🔧 Environment Variables Required

### Netlify Dashboard Setup

```bash
# Database
AIVEN_DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
AIVEN_CA_CERT=-----BEGIN CERTIFICATE-----...

# Authentication
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-jwt-secret-key

# Node Environment
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## ✅ Verification Checklist

- [ ] Database connection optimized untuk serverless
- [ ] Connection pooling configured correctly
- [ ] Session management implemented
- [ ] Query operations tested
- [ ] Environment variables set
- [ ] Connection cleanup implemented

## 🔄 Next Steps

Lanjut ke `04_FRONTEND_UPDATES.md` untuk update API calls di React frontend.