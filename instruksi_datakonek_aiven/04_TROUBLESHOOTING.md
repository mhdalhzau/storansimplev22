# 04. Troubleshooting dan Penyelesaian Masalah

## Masalah 1: tsx Package Tidak Ditemukan

### Gejala:
```
Need to install the following packages: tsx@4.20.5
Ok to proceed? (y)
```

### Penyebab:
Dependencies tidak terinstall dengan benar

### Solusi:
```bash
# Install ulang dependencies
npm install
```

## Masalah 2: SSL Certificate Error

### Gejala:
```
Error: self-signed certificate in certificate chain
code: 'SELF_SIGNED_CERT_IN_CHAIN'
```

### Penyebab:
Aiven menggunakan custom CA certificate yang tidak dikenali oleh Node.js

### Solusi:
1. Set `rejectUnauthorized: false` di SSL config
2. Tambah `NODE_TLS_REJECT_UNAUTHORIZED=0` di development script
3. Restart aplikasi

## Masalah 3: Server Crash saat Database Connection

### Gejala:
```
Node.js v20.19.3
[Workflow exits with error]
```

### Penyebab:
SSL certificate verification gagal, menyebabkan server crash

### Solusi:
Update `package.json` script development:
```json
"dev": "NODE_ENV=development NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/index.ts"
```

## Masalah 4: Frontend Tidak Terhubung di Replit

### Gejala:
Vite server tidak dapat diakses dari proxy Replit

### Solusi:
Update `vite.config.ts`:
```typescript
server: {
  host: "0.0.0.0",
  port: 5000,
  fs: {
    strict: true,
    deny: ["**/.*"],
  },
}
```

## Masalah 5: Workflow Configuration Error

### Gejala:
```
For configuring frontend web applications, you MUST use both webview output type AND wait on port 5000
```

### Solusi:
Set workflow dengan benar:
```typescript
{
  name: "Start application",
  command: "npm run dev", 
  wait_for_port: 5000,
  output_type: "webview"
}
```

## Log yang Menunjukkan Success

### Server Running Successfully:
```
10:24:07 PM [express] serving on port 5000
10:24:16 PM [express] GET /api/user 401 in 2ms
```

### Frontend Connected:
```
[vite] connecting...
[vite] connected.
```

## Status: ✅ Semua Masalah Teratasi

Aplikasi berjalan dengan sukses tanpa error.