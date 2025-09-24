import express from 'express';
import serverless from 'serverless-http';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import connectPgSimple from 'connect-pg-simple';

const scryptAsync = promisify(scrypt);
const pgSession = connectPgSimple(session);

// Global connection pool (reused across function invocations)
let globalPool: Pool | null = null;
let globalDb: any = null;

function createDatabasePool(): Pool {
  if (globalPool) {
    return globalPool;
  }

  const databaseUrl = process.env.AIVEN_DATABASE_URL;
  const avenCaCert = process.env.AIVEN_CA_CERT;
  
  if (!databaseUrl) {
    throw new Error('AIVEN_DATABASE_URL must be set for Netlify deployment');
  }

  // SSL configuration - allow flexible SSL in production for Netlify
  const sslConfig = avenCaCert ? {
    ca: avenCaCert,
    rejectUnauthorized: false  // Netlify deployment requires this
  } : {
    rejectUnauthorized: false
  };

  // Optimized pool configuration untuk serverless
  globalPool = new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig,
    
    // Serverless-optimized pool settings
    max: 1,                    // Maximum 1 connection per function
    min: 0,                    // No minimum connections
    idleTimeoutMillis: 1000,   // Close idle connections quickly
    connectionTimeoutMillis: 5000, // Fast connection timeout
    acquireTimeoutMillis: 3000, // Quick acquire timeout
    
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
  if (!globalDb) {
    const pool = createDatabasePool();
    globalDb = drizzle(pool);
  }
  return globalDb;
}

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Database operations
async function getUserByEmail(email: string) {
  const pool = createDatabasePool();
  
  try {
    const result = await pool.query(`
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

async function getUserById(id: string) {
  const pool = createDatabasePool();
  
  try {
    const result = await pool.query(`
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

async function createUser(userData: any) {
  const pool = createDatabasePool();
  
  try {
    const { email, name, role, password } = userData;
    
    const result = await pool.query(`
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

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enforce secure session secret in production
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

// Session configuration for serverless with secure SSL
app.use(session({
  store: new pgSession({
    pool: createDatabasePool(),
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  name: 'spbu.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    } catch (error) {
      return done(error);
    }
  }),
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: any, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions',
    database: globalPool ? 'connected' : 'disconnected',
    ssl_enabled: !!process.env.AIVEN_CA_CERT
  });
});

// Authentication routes
app.post("/register", async (req, res, next) => {
  try {
    const existingUser = await getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("Email already exists");
    }

    const user = await createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json(req.user);
});

app.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

app.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

// Basic CRUD endpoints untuk testing
app.get("/users", async (req, res) => {
  try {
    if (!req.user || (req.user as any).role !== 'administrasi') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const pool = createDatabasePool();
    const result = await pool.query('SELECT id, email, name, role FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/stores", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const pool = createDatabasePool();
    const result = await pool.query('SELECT * FROM stores ORDER BY name');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Placeholder endpoints untuk unimplemented features
const unimplementedEndpoints = [
  '/dashboard/stats',
  '/dashboard/store-wallets', 
  '/customers',
  '/piutang'
];

unimplementedEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    res.status(400).json({ message: "Method not implemented." });
  });
});

// Sales endpoints (basic implementation)
app.get("/sales", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const pool = createDatabasePool();
    const result = await pool.query(`
      SELECT * FROM sales 
      WHERE store_id IN (
        SELECT store_id FROM user_stores WHERE user_id = $1
      )
      ORDER BY date DESC
      LIMIT 50
    `, [(req.user as any).id]);
    
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/cashflow", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const pool = createDatabasePool();
    const result = await pool.query(`
      SELECT * FROM cashflow 
      WHERE store_id IN (
        SELECT store_id FROM user_stores WHERE user_id = $1
      )
      ORDER BY date DESC
      LIMIT 50
    `, [(req.user as any).id]);
    
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Express error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export the serverless handler
export const handler = serverless(app);