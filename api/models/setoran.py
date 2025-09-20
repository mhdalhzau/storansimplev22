from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from api.database.connection import Base


class Setoran(Base):
    __tablename__ = "setoran_harian"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Employee Info
    employee_name = Column(String(255), nullable=False)
    jam_masuk = Column(String(10), nullable=False)  # Format: HH:MM
    jam_keluar = Column(String(10), nullable=False)  # Format: HH:MM
    
    # Meter Data
    nomor_awal = Column(Float, nullable=False)
    nomor_akhir = Column(Float, nullable=False)
    total_liter = Column(Float, nullable=False)
    
    # Setoran
    total_setoran = Column(Float, nullable=False)
    qris_setoran = Column(Float, nullable=False, default=0)
    cash_setoran = Column(Float, nullable=False)
    
    # Expenses (JSON as text)
    expenses_data = Column(Text, nullable=True)  # JSON string
    total_expenses = Column(Float, nullable=False, default=0)
    
    # Income (JSON as text)
    income_data = Column(Text, nullable=True)  # JSON string
    total_income = Column(Float, nullable=False, default=0)
    
    # Total
    total_keseluruhan = Column(Float, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Setoran(id={self.id}, employee='{self.employee_name}', total={self.total_keseluruhan})>"