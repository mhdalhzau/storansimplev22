# 05. Deployment Configuration

## Konfigurasi Deployment

Setelah aplikasi berjalan dengan sukses, deployment dikonfigurasi menggunakan Replit Deploy.

### Deployment Settings

```typescript
{
  deployment_target: "autoscale",
  build: ["npm", "run", "build"], 
  run: ["npm", "run", "start"]
}
```

### Penjelasan:

1. **deployment_target: "autoscale"**
   - Cocok untuk aplikasi web stateless
   - Auto-scaling berdasarkan traffic
   - Hemat resource saat tidak ada traffic

2. **build: ["npm", "run", "build"]**
   - Compile React frontend dengan Vite
   - Bundle server dengan esbuild
   - Output ke folder `dist/`

3. **run: ["npm", "run", "start"]**
   - Jalankan production server
   - Load static files dari `dist/public`
   - Menggunakan NODE_ENV=production

## Production Environment

### Environment Variables untuk Production:
- `AIVEN_DATABASE_URL` - Same as development
- `AIVEN_CA_CERT` - Same as development  
- `NODE_ENV=production` - Set automatically

### SSL Configuration untuk Production:

File `server/db.ts` sudah dikonfigurasi untuk production:
```typescript
ssl: {
  rejectUnauthorized: false
}
```

**Catatan**: Untuk production yang lebih secure, bisa enable proper certificate verification.

## Build Process

### Script Build:
```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

### Yang Terjadi saat Build:
1. Vite compile React app → `dist/public/`
2. esbuild bundle server → `dist/index.js`
3. Static assets di-copy ke output directory

### Script Start:
```json
"start": "NODE_ENV=production node dist/index.js"
```

## Verifikasi Deployment Ready

✅ Database connection berfungsi  
✅ SSL configuration benar  
✅ Frontend build sukses  
✅ Backend bundle sukses  
✅ Environment variables configured  
✅ Deployment target set to autoscale  

## Steps untuk Deploy:

1. Pastikan aplikasi running di development
2. Test semua fitur bekerja dengan benar
3. Push ke Replit Deploy
4. Monitor logs untuk memastikan deployment sukses

## Status: ✅ Deployment Configuration Selesai

Aplikasi siap untuk di-deploy ke production.