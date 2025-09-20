from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database - Default ke SQLite untuk dev, bisa override dengan env var
    database_url: str = "sqlite:///./setoran.db"
    
    # API
    api_title: str = "Setoran Harian API"
    api_version: str = "1.0.0"
    api_description: str = "API untuk aplikasi setoran harian"
    
    # CORS - Include semua port yang mungkin digunakan untuk dev
    allowed_origins: list[str] = [
        "http://localhost:5000", 
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://*.replit.dev",
        "https://*.replit.app"
    ]
    
    class Config:
        env_file = ".env"


settings = Settings()