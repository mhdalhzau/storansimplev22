from pydantic import BaseModel, validator, Field
from typing import Optional, List
from datetime import datetime
import json


class ExpenseItem(BaseModel):
    id: str
    description: str = Field(..., min_length=1, description="Deskripsi pengeluaran")
    amount: float = Field(..., ge=0, description="Jumlah pengeluaran")


class IncomeItem(BaseModel):
    id: str
    description: str = Field(..., min_length=1, description="Deskripsi pemasukan")
    amount: float = Field(..., ge=0, description="Jumlah pemasukan")


class SetoranCreate(BaseModel):
    # Employee Info
    employee_name: str = Field(..., min_length=1, description="Nama karyawan")
    jam_masuk: str = Field(..., pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Jam masuk (HH:MM)")
    jam_keluar: str = Field(..., pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Jam keluar (HH:MM)")
    
    # Meter Data
    nomor_awal: float = Field(..., ge=0, description="Nomor meter awal")
    nomor_akhir: float = Field(..., ge=0, description="Nomor meter akhir")
    
    # Setoran
    qris_setoran: float = Field(0, ge=0, description="Jumlah QRIS setoran")
    
    # Expenses & Income
    expenses: List[ExpenseItem] = Field(default=[], description="Daftar pengeluaran")
    income: List[IncomeItem] = Field(default=[], description="Daftar pemasukan")
    
    @validator('nomor_akhir')
    def validate_nomor_akhir(cls, v, values):
        if 'nomor_awal' in values and v < values['nomor_awal']:
            raise ValueError('Nomor akhir harus lebih besar dari nomor awal')
        return v
    
    @validator('expenses')
    def validate_expenses(cls, v):
        # Validasi bahwa tidak ada item dengan description kosong atau amount negatif
        for item in v:
            if not item.description.strip():
                raise ValueError('Deskripsi pengeluaran tidak boleh kosong')
            if item.amount < 0:
                raise ValueError('Jumlah pengeluaran tidak boleh negatif')
        return v
    
    @validator('income')
    def validate_income(cls, v):
        # Validasi bahwa tidak ada item dengan description kosong atau amount negatif
        for item in v:
            if not item.description.strip():
                raise ValueError('Deskripsi pemasukan tidak boleh kosong')
            if item.amount < 0:
                raise ValueError('Jumlah pemasukan tidak boleh negatif')
        return v


class SetoranUpdate(BaseModel):
    employee_name: Optional[str] = None
    jam_masuk: Optional[str] = None
    jam_keluar: Optional[str] = None
    nomor_awal: Optional[float] = None
    nomor_akhir: Optional[float] = None
    qris_setoran: Optional[float] = None
    expenses: Optional[List[ExpenseItem]] = None
    income: Optional[List[IncomeItem]] = None


class SetoranResponse(BaseModel):
    id: int
    
    # Employee Info
    employee_name: str
    jam_masuk: str
    jam_keluar: str
    
    # Meter Data
    nomor_awal: float
    nomor_akhir: float
    total_liter: float
    
    # Setoran
    total_setoran: float
    qris_setoran: float
    cash_setoran: float
    
    # Expenses & Income
    expenses: List[ExpenseItem]
    income: List[IncomeItem]
    total_expenses: float
    total_income: float
    
    # Total
    total_keseluruhan: float
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
    
    @validator('expenses', pre=True)
    def parse_expenses(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        return v or []
    
    @validator('income', pre=True)
    def parse_income(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except json.JSONDecodeError:
                return []
        return v or []


class SetoranCalculation(BaseModel):
    """Model untuk hasil perhitungan setoran"""
    total_liter: float
    total_setoran: float
    cash_setoran: float
    total_expenses: float
    total_income: float
    total_keseluruhan: float