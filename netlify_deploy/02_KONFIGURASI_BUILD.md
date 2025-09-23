# 02. Konfigurasi Build untuk Netlify

## 🎯 Overview

Setup konfigurasi build dan deployment untuk Netlify menggunakan `netlify.toml`.

## 📄 File Konfigurasi Utama

### `netlify.toml` (Root Directory)

```toml
[build]
  # Build command untuk frontend
  command = "cd client && npm install && npm run build"
  
  # Publish directory (hasil build React)
  publish = "client/build"
  
  # Functions directory
  functions = "netlify/functions"

[build.environment]
  # Node.js version
  NODE_VERSION = "20"
  
  # Disable telemetry untuk build yang lebih cepat
  NEXT_TELEMETRY_DISABLED = "1"

[functions]
  # External node modules yang perlu dibundle
  external_node_modules = ["express", "pg", "drizzle-orm"]
  
  # Node bundler untuk functions
  node_bundler = "esbuild"
  
  # Include files di functions
  included_files = ["shared/**", "server/**"]

# Redirects dan rewrites
[[redirects]]
  # Redirect semua API calls ke function
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

# Handle React Router (SPA routing)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers untuk security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Headers untuk API responses
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"

# Development redirects (optional)
[context.dev]
  [[context.dev.redirects]]
    from = "/api/*"
    to = "http://localhost:5000/api/:splat"
    status = 200
    force = true

# Build settings untuk different branches
[context.production]
  [context.production.environment]
    NODE_ENV = "production"

[context.deploy-preview]
  [context.deploy-preview.environment]
    NODE_ENV = "staging"
```

## 🔧 Update Frontend Build

### Modify `client/package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "build:netlify": "VITE_API_URL=/.netlify/functions/api vite build"
  }
}
```

### Environment Variables untuk Build

**File: `client/.env.production`**

```env
VITE_API_URL=/.netlify/functions/api
VITE_NODE_ENV=production
```

**File: `client/.env.local`** (untuk development)

```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

## 🌐 Update API Base URL di Frontend

### Modify `client/src/lib/queryClient.ts`

**Sebelum:**
```typescript
const API_BASE = "/api";
```

**Sesudah:**
```typescript
const API_BASE = import.meta.env.VITE_API_URL || "/api";
```

### Alternative: Environment-based API URL

```typescript
function getApiBaseUrl() {
  if (import.meta.env.VITE_NODE_ENV === 'production') {
    return '/.netlify/functions/api';
  }
  
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  return '/api'; // fallback untuk development
}

const API_BASE = getApiBaseUrl();
```

## 📦 Package.json Root Updates

### Update Build Scripts

```json
{
  "scripts": {
    "dev": "NODE_ENV=development NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/index.ts",
    "build": "npm run build:client",
    "build:client": "cd client && npm install && npm run build",
    "build:netlify": "npm run build:client",
    "start": "NODE_ENV=production node dist/index.js",
    "netlify:dev": "netlify dev",
    "netlify:build": "netlify build",
    "netlify:deploy": "netlify deploy",
    "netlify:deploy:prod": "netlify deploy --prod"
  },
  "dependencies": {
    // ... existing dependencies
    "serverless-http": "^3.2.0",
    "@netlify/functions": "^2.4.0"
  }
}
```

## 🔍 Verify Build Configuration

### Test Build Process

```bash
# Test client build
cd client && npm run build

# Verify build output
ls -la client/build/

# Test Netlify build locally
netlify build

# Test functions locally
netlify dev
```

### Expected Build Output

```
client/build/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── assets/

netlify/functions/
└── api.js
```

## ⚙️ Advanced Configuration

### Function-specific Settings

```toml
# netlify.toml

[functions."api"]
  # Specific timeout untuk API function
  timeout = 30
  
  # Memory limit
  memory = 1008
  
  # Scheduled functions (if needed)
  # schedule = "0 0 * * *"  # Daily at midnight
```

### Build Hooks

```toml
[build]
  command = "npm run build:netlify"
  
  # Pre-build hooks
  pre_build = "echo 'Starting build process...'"
  
  # Post-build hooks  
  post_build = "echo 'Build completed successfully!'"
```

## 🚀 Deploy Commands

### Using Netlify CLI

```bash
# Login to Netlify
netlify login

# Initialize project
netlify init

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Using Git Integration

1. Push code ke GitHub/GitLab
2. Connect repository di Netlify dashboard
3. Configure build settings:
   - **Build command**: `npm run build:netlify`
   - **Publish directory**: `client/build`
   - **Functions directory**: `netlify/functions`

## ✅ Verification Checklist

- [ ] `netlify.toml` dikonfigurasi dengan benar
- [ ] Build command berfungsi
- [ ] Frontend build berhasil
- [ ] API redirects setup
- [ ] Environment variables configured
- [ ] SPA routing handled

## 🔄 Next Steps

Lanjut ke `03_DATABASE_CONFIG.md` untuk setup database configuration untuk serverless environment.