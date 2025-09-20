# Python FastAPI Backend Migration 🚀

## 📋 Overview
Aplikasi Setoran Harian telah dimigrasi dari JavaScript/TypeScript backend ke Python + FastAPI untuk meningkatkan code quality dan performance.

## 🏗️ Architecture
- **Frontend**: React + TypeScript (tetap sama)
- **Backend**: FastAPI + SQLAlchemy + Pydantic 
- **Database**: SQLite (dev) / PostgreSQL (production)
- **API Communication**: REST API dengan JSON

## 🔧 Setup & Development

### 1. Install Dependencies
Dependencies Python sudah terinstall:
- fastapi
- uvicorn 
- sqlalchemy
- pydantic
- pydantic-settings
- psycopg2-binary

### 2. Start Python API Server
```bash
# Jalankan FastAPI server di port 8000
python run_python_api.py
```

### 3. Start Frontend Server 
```bash
# Jalankan React frontend di port 5000 (workflow default)
npm run dev
```

## 📊 API Endpoints

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - API info

### Setoran Management
- `POST /api/setoran` - Create new setoran
- `GET /api/setoran` - Get all setoran (with pagination)
- `GET /api/setoran/{id}` - Get setoran by ID
- `PUT /api/setoran/{id}` - Update setoran
- `DELETE /api/setoran/{id}` - Delete setoran
- `POST /api/setoran/calculate` - Preview calculation

### API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🗂️ File Structure
```
api/
├── core/
│   └── config.py          # Configuration settings
├── database/
│   └── connection.py      # Database connection
├── models/
│   └── setoran.py         # SQLAlchemy models
├── schemas/
│   └── setoran.py         # Pydantic schemas
├── routes/
│   └── setoran.py         # API routes
└── main.py                # FastAPI app
```

## 💾 Database

### Development (SQLite)
Database menggunakan SQLite file `setoran.db` di root directory. Database akan dibuat otomatis saat pertama kali running.

### Production (PostgreSQL)
Set environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:port/dbname"
```

## 🌍 Environment Variables

### Frontend (.env)
```bash
VITE_PYTHON_API_BASE_URL=http://localhost:8000
```

### Backend (.env)
```bash
DATABASE_URL=sqlite:///./setoran.db  # atau PostgreSQL URL
```

## 🔧 Configuration

### CORS
Frontend dan backend dikonfigurasi untuk mendukung:
- `http://localhost:5000` (frontend dev)
- `http://localhost:3000` 
- `http://localhost:5173` (Vite default)
- `https://*.replit.dev`
- `https://*.replit.app`

### API Client
Frontend menggunakan helper khusus `pythonApiRequest()` untuk communicasi dengan Python API, sehingga tidak interfere dengan existing Node.js API calls.

## ✅ Testing

### Test API Health
```bash
curl -X GET "http://localhost:8000/health"
```

### Test Setoran Creation
```bash
curl -X POST "http://localhost:8000/api/setoran" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_name": "John Doe",
    "jam_masuk": "08:00",
    "jam_keluar": "17:00", 
    "nomor_awal": 1000,
    "nomor_akhir": 1100,
    "qris_setoran": 50000,
    "expenses": [],
    "income": []
  }'
```

## 🚀 Features

### Business Logic
- ✅ Indonesian number formatting (comma as decimal separator)
- ✅ Automatic calculations (liter × 11,500)
- ✅ Cash = Total - QRIS
- ✅ Total Keseluruhan = Cash + Pemasukan - Pengeluaran
- ✅ Input validation and sanitization
- ✅ Incomplete entries detection

### Frontend Features
- ✅ Advanced decimal input validation
- ✅ Auto-filtering alphabetic characters
- ✅ Visual reminders for incomplete entries
- ✅ Save to database functionality
- ✅ Copy to clipboard functionality
- ✅ Loading states and error handling

### Backend Features
- ✅ RESTful API with OpenAPI documentation
- ✅ Input validation with Pydantic
- ✅ SQLAlchemy ORM with relationships
- ✅ Error handling and validation
- ✅ JSON storage for dynamic expenses/income
- ✅ Automatic calculation engine

## 🔍 Troubleshooting

### Python API Won't Start
1. Check database connection
2. Ensure all dependencies installed
3. Check port 8000 availability

### CORS Issues
1. Verify frontend origin in CORS settings
2. Check credentials settings
3. Ensure proper API base URL

### Database Issues
1. SQLite file permissions
2. Database URL format
3. Migration needs

## 📝 Notes
- Database tables dibuat otomatis saat startup
- Expenses dan income disimpan sebagai JSON strings
- Semua perhitungan dilakukan di backend untuk konsistensi
- Frontend reset form setelah save berhasil