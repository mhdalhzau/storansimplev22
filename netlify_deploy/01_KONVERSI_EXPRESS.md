# 01. Konversi Express Server ke Netlify Functions

## 🎯 Overview

Mengkonversi Express.js server menjadi serverless function yang kompatibel dengan Netlify Functions.

## 📦 Dependencies yang Diperlukan

```bash
npm install serverless-http @netlify/functions
```

## 🔧 Membuat Netlify Function

### 1. Struktur File

```
netlify/
└── functions/
    └── api.js              # Main serverless function
```

### 2. Template Function (`netlify/functions/api.js`)

```javascript
const express = require('express');
const serverless = require('serverless-http');

// Import original server modules (convert to CommonJS)
const { registerRoutes } = require('../../server/routes');
const { setupAuth } = require('../../server/auth');

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Setup authentication
setupAuth(app);

// Setup routes
registerRoutes(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions'
  });
});

// Export the serverless handler
module.exports.handler = serverless(app);
```

## 🔄 Konversi Module ES6 ke CommonJS

### Masalah: ES6 Modules di Serverless

Original server menggunakan ES6 imports yang tidak kompatibel dengan Netlify Functions. Perlu konversi.

### Solusi 1: Separate CommonJS Functions

**File: `netlify/functions/api.js` (CommonJS version)**

```javascript
const express = require('express');
const serverless = require('serverless-http');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const session = require('express-session');

// Import database setup (will need CommonJS version)
const { db, pool } = require('./db-setup');

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Authentication strategy
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    // Add authentication logic here
    // Query database for user
    const user = await getUserByEmail(email);
    if (user && await verifyPassword(password, user.password)) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// API Routes
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json(req.user);
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json(req.user);
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Export serverless handler
module.exports.handler = serverless(app);
```

### Solusi 2: Database Helper (CommonJS)

**File: `netlify/functions/db-setup.js`**

```javascript
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

// Database connection
const databaseUrl = process.env.AIVEN_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('AIVEN_DATABASE_URL must be set');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

// Helper functions
async function getUserByEmail(email) {
  // Add database query logic
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0];
}

async function getUserById(id) {
  const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0];
}

async function verifyPassword(inputPassword, storedPassword) {
  // Add password verification logic
  return inputPassword === storedPassword; // Simplified - use proper hashing
}

module.exports = {
  db,
  pool,
  getUserByEmail,
  getUserById,
  verifyPassword
};
```

## 🔧 Modifikasi Package.json

### Update Scripts

```json
{
  "scripts": {
    "dev": "NODE_ENV=development NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/index.ts",
    "build": "cd client && npm install && npm run build",
    "build:netlify": "npm run build",
    "start": "NODE_ENV=production node dist/index.js",
    "netlify-dev": "netlify dev"
  }
}
```

## 🧪 Testing Function Locally

### Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Test Local Development

```bash
# Test the function locally
netlify dev

# Access API at:
# http://localhost:8888/.netlify/functions/api/health
```

## ⚠️ Challenges & Solutions

### Challenge 1: Session Management
**Problem**: Serverless functions are stateless
**Solution**: Use database-backed sessions with PostgreSQL

### Challenge 2: ES6 Modules
**Problem**: Netlify Functions require CommonJS
**Solution**: Create separate CommonJS versions or use build tools

### Challenge 3: Database Connections
**Problem**: Connection pooling in serverless
**Solution**: Use single connection with proper cleanup

### Challenge 4: File Uploads
**Problem**: No persistent storage
**Solution**: Use external storage (AWS S3, Cloudinary)

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] Function structure created
- [ ] Database connection working
- [ ] Authentication routes functional
- [ ] API endpoints responding
- [ ] Local testing successful

## 🔄 Next Steps

Setelah konversi selesai, lanjut ke `02_KONFIGURASI_BUILD.md` untuk setup Netlify configuration.