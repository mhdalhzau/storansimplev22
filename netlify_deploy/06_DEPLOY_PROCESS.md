# 06. Step-by-Step Deployment Process

## 🎯 Overview

Panduan lengkap untuk deploy aplikasi SPBU Business Management System ke Netlify dari awal sampai selesai.

## 🚀 Pre-Deployment Checklist

### 1. Verify Local Development

```bash
# Pastikan aplikasi running di Replit
npm run dev

# Test API endpoints
curl http://localhost:5000/api/user

# Test frontend
# Akses http://localhost:5000 di browser
```

### 2. Verify Netlify Configuration

```bash
# Check file structure
ls -la netlify/functions/
ls -la netlify.toml

# Install Netlify CLI (jika belum)
npm install -g netlify-cli

# Login ke Netlify
netlify login
```

## 📦 Method 1: Git-based Deployment (Recommended)

### Step 1: Prepare Repository

```bash
# Add dan commit semua files
git add .
git commit -m "feat: add Netlify deployment configuration"

# Push ke GitHub/GitLab (jika belum)
git remote add origin https://github.com/username/your-repo.git
git push -u origin main
```

### Step 2: Connect to Netlify

1. **Login ke Netlify Dashboard**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click **New site from Git**

2. **Connect Repository**
   - Choose Git provider (GitHub/GitLab)
   - Select your repository
   - Choose branch (usually `main`)

3. **Configure Build Settings**
   ```
   Build command: npm run build:netlify
   Publish directory: client/build
   Functions directory: netlify/functions
   ```

### Step 3: Set Environment Variables

**Add di Netlify Dashboard → Site Settings → Environment Variables:**

```bash
# Database
AIVEN_DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
AIVEN_CA_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----

# Security
SESSION_SECRET=your-generated-session-secret
JWT_SECRET=your-generated-jwt-secret

# Environment
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Step 4: Deploy

1. Click **Deploy site**
2. Wait for build to complete (5-10 minutes)
3. Check build logs untuk errors
4. Test deployed site

## 🔧 Method 2: CLI Deployment

### Step 1: Initialize Project

```bash
# Initialize Netlify project
netlify init

# Select options:
# - Create & configure a new site
# - Choose team (personal atau team)
# - Enter site name (optional)
```

### Step 2: Configure Deployment

```bash
# Create netlify.toml (jika belum ada)
cat > netlify.toml << EOF
[build]
  command = "npm run build:netlify"
  publish = "client/build"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
```

### Step 3: Set Environment Variables via CLI

```bash
# Set database variables
netlify env:set AIVEN_DATABASE_URL "postgresql://user:pass@host:port/db?sslmode=require"
netlify env:set AIVEN_CA_CERT "$(cat attached_assets/ca_1758665108054.pem)"

# Set security variables
netlify env:set SESSION_SECRET "$(openssl rand -hex 32)"
netlify env:set JWT_SECRET "$(openssl rand -base64 32)"

# Set environment
netlify env:set NODE_ENV "production"
netlify env:set NODE_TLS_REJECT_UNAUTHORIZED "0"
```

### Step 4: Build and Deploy

```bash
# Test build locally
netlify build

# Deploy to preview URL
netlify deploy

# Check preview dan test functionality
# Jika OK, deploy to production:
netlify deploy --prod
```

## 🧪 Method 3: Manual Upload

### Step 1: Build Locally

```bash
# Build frontend
cd client && npm run build

# Verify build output
ls -la build/

# Build functions (already in netlify/functions/)
```

### Step 2: Create Deployment Package

```bash
# Create deployment directory
mkdir -p deploy-package

# Copy build files
cp -r client/build/* deploy-package/
cp -r netlify deploy-package/
cp netlify.toml deploy-package/
```

### Step 3: Upload to Netlify

1. Go to Netlify Dashboard
2. Drag and drop `deploy-package` folder
3. Wait for deployment
4. Configure environment variables manually

## 🔍 Post-Deployment Verification

### Step 1: Test Basic Functionality

```bash
# Get your site URL dari Netlify dashboard
SITE_URL="https://your-app.netlify.app"

# Test health endpoint
curl $SITE_URL/.netlify/functions/api/health

# Test frontend
curl $SITE_URL/
```

### Step 2: Test API Endpoints

```bash
# Test user endpoint (should return 401)
curl $SITE_URL/.netlify/functions/api/user

# Test dengan browser:
# 1. Open $SITE_URL
# 2. Try to login
# 3. Check browser console for errors
# 4. Verify database operations
```

### Step 3: Verify Database Connection

```bash
# Check deployment logs di Netlify dashboard
# Look for database connection success/errors

# Test database operations through UI:
# 1. Try to register new user
# 2. Login dengan existing user
# 3. Create attendance/sales records
# 4. Verify data persistence
```

## 🛠️ Custom Domain Setup (Optional)

### Step 1: Add Custom Domain

1. Go to Netlify Dashboard → Domain management
2. Click **Add custom domain**
3. Enter your domain (e.g., `spbu-management.com`)
4. Follow DNS configuration instructions

### Step 2: Configure DNS

```bash
# Add CNAME record di domain provider:
# Type: CNAME
# Name: www (atau subdomain)
# Value: your-app.netlify.app

# For apex domain, add A records:
# Type: A
# Name: @
# Value: 75.2.60.5 (Netlify Load Balancer)
```

### Step 3: Enable HTTPS

1. Netlify automatically provisions SSL certificate
2. Wait for certificate activation (up to 24 hours)
3. Enable "Force HTTPS" di domain settings

## 📊 Monitoring & Analytics

### Step 1: Enable Analytics

1. Go to Netlify Dashboard → Analytics
2. Enable site analytics
3. Configure goals dan conversions

### Step 2: Set Up Monitoring

```bash
# Add monitoring endpoints ke functions
# File: netlify/functions/status.js

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      deployment: process.env.COMMIT_REF || 'unknown',
      environment: process.env.NODE_ENV
    })
  };
};
```

### Step 3: Set Up Alerts

1. Configure deploy notifications di Netlify
2. Set up uptime monitoring dengan external service
3. Configure error tracking (Sentry, etc.)

## 🔄 Continuous Deployment

### Auto-Deploy Setup

```bash
# Enable auto-deploy dari Git
# 1. Connect repository di Netlify
# 2. Configure build settings
# 3. Enable auto-publishing

# Deploy contexts:
[context.production]
  command = "npm run build:netlify"

[context.deploy-preview]
  command = "npm run build:netlify"
  
[context.branch-deploy]
  command = "npm run build:netlify"
```

### Branch Previews

```bash
# Enable branch previews untuk testing
# 1. Go to Site Settings → Build & deploy
# 2. Enable "Deploy previews"
# 3. Configure preview settings

# Create feature branch:
git checkout -b feature/new-dashboard
git push origin feature/new-dashboard
# Netlify automatically creates preview URL
```

## ⚠️ Common Deployment Issues

### Issue 1: Build Failures

```bash
# Check build logs untuk errors
# Common issues:
# - Missing dependencies
# - Environment variable issues
# - Path resolution problems

# Solutions:
# 1. Verify package.json scripts
# 2. Check build command di netlify.toml
# 3. Ensure all deps listed di package.json
```

### Issue 2: Function Errors

```bash
# Check function logs di Netlify dashboard
# Common issues:
# - Module import errors
# - Database connection failures
# - Missing environment variables

# Debug steps:
# 1. Test functions locally: netlify dev
# 2. Check environment variables
# 3. Verify database connectivity
```

### Issue 3: Frontend API Calls

```bash
# Common CORS/API issues:
# - Incorrect API base URL
# - Missing CORS headers
# - Authentication issues

# Solutions:
# 1. Verify VITE_API_URL
# 2. Check network requests di browser dev tools
# 3. Verify function redirects di netlify.toml
```

## ✅ Deployment Success Checklist

- [ ] Site accessible at Netlify URL
- [ ] All environment variables configured
- [ ] Database connection working
- [ ] Authentication functional
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] No console errors
- [ ] CRUD operations working
- [ ] Session management working
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled
- [ ] Monitoring setup

## 🔄 Next Steps

Lanjut ke `07_TROUBLESHOOTING.md` untuk common issues dan solutions setelah deployment.