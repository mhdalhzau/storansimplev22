#!/usr/bin/env python3
"""
Script untuk menjalankan FastAPI backend
"""

import uvicorn
from api.main import app

if __name__ == "__main__":
    print("🚀 Starting Python FastAPI backend...")
    print("📍 API akan berjalan di: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔄 Auto-reload enabled")
    
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )