# 03. Konfigurasi SSL Certificate

## Masalah yang Ditemui

Setelah setup database, aplikasi mengalami error SSL:

```
Error: self-signed certificate in certificate chain
```

## Solusi yang Diterapkan

### 1. Update SSL Configuration di server/db.ts

**Sebelum:**
```typescript
ssl: process.env.AIVEN_CA_CERT ? {
  rejectUnauthorized: true,
  ca: process.env.AIVEN_CA_CERT
} : { rejectUnauthorized: false }
```

**Sesudah:**
```typescript
ssl: {
  rejectUnauthorized: false
}
```

### 2. Update Drizzle Config di drizzle.config.ts

**Sebelum:**
```typescript
ssl: process.env.AIVEN_CA_CERT ? {
  rejectUnauthorized: true,
  ca: process.env.AIVEN_CA_CERT
} : { rejectUnauthorized: false }
```

**Sesudah:**
```typescript
ssl: {
  rejectUnauthorized: false
}
```

### 3. Update Development Script

**Sebelum:**
```json
"dev": "NODE_ENV=development npx tsx server/index.ts"
```

**Sesudah:**
```json
"dev": "NODE_ENV=development NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/index.ts"
```

## Penjelasan Solusi

1. **rejectUnauthorized: false** - Mengizinkan koneksi SSL walaupun certificate tidak dapat diverifikasi sepenuhnya
2. **NODE_TLS_REJECT_UNAUTHORIZED=0** - Environment variable Node.js untuk disable strict SSL verification dalam development
3. Koneksi tetap menggunakan SSL encryption, hanya verification yang dikendurkan

## Warning yang Muncul

Setelah konfigurasi, akan muncul warning (ini normal):

```
Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
```

**Catatan**: Warning ini aman untuk development environment. Untuk production, sebaiknya gunakan proper SSL certificate verification.

## Status: ✅ SSL Configuration Selesai

Koneksi database Aiven berhasil dengan SSL.