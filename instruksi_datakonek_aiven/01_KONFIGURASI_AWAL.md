# 01. Konfigurasi Awal Aplikasi

## Langkah 1: Verifikasi Node.js

```bash
# Pastikan Node.js sudah terinstall
node --version
# Output: v20.19.3
```

## Langkah 2: Analisis Struktur Aplikasi

Aplikasi ini menggunakan struktur monorepo dengan:

```
├── client/               # Frontend React + Vite
│   ├── src/
│   │   ├── components/   # Komponen UI
│   │   ├── pages/        # Halaman aplikasi
│   │   └── hooks/        # React hooks
├── server/               # Backend Express
│   ├── auth.ts           # Autentikasi
│   ├── db.ts             # Koneksi database
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared types dan schema
│   └── schema.ts         # Database schema
└── package.json          # Dependencies
```

## Langkah 3: Verifikasi Package.json

File `package.json` sudah dikonfigurasi dengan:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development npx tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

## Langkah 4: Instalasi Dependencies

Dependencies sudah terinstall secara otomatis di Replit, termasuk:

- React, TypeScript, Vite untuk frontend
- Express, Passport.js untuk backend
- Drizzle ORM untuk database
- Tailwind CSS, shadcn/ui untuk styling

## Langkah 5: Verifikasi Konfigurasi Workflow

Workflow sudah dikonfigurasi untuk menjalankan:
- **Command**: `npm run dev`
- **Port**: 5000
- **Output Type**: webview

## Status: ✅ Konfigurasi Awal Selesai

Aplikasi siap untuk setup database Aiven.