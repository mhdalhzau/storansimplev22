from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from api.database.connection import get_db
from api.models.setoran import Setoran
from api.schemas.setoran import SetoranCreate, SetoranResponse, SetoranUpdate, SetoranCalculation


router = APIRouter(prefix="/api/setoran", tags=["setoran"])


def calculate_setoran(data: SetoranCreate) -> SetoranCalculation:
    """Fungsi untuk menghitung semua nilai setoran"""
    # Perhitungan liter
    total_liter = max(0, data.nomor_akhir - data.nomor_awal)
    
    # Perhitungan setoran (1 liter = Rp 11.500)
    total_setoran = total_liter * 11500
    cash_setoran = max(0, total_setoran - data.qris_setoran)
    
    # Perhitungan expenses dan income
    total_expenses = sum(item.amount for item in data.expenses if item.description.strip() and item.amount > 0)
    total_income = sum(item.amount for item in data.income if item.description.strip() and item.amount > 0)
    
    # Total keseluruhan = Cash + Pemasukan - Pengeluaran
    total_keseluruhan = cash_setoran + total_income - total_expenses
    
    return SetoranCalculation(
        total_liter=total_liter,
        total_setoran=total_setoran,
        cash_setoran=cash_setoran,
        total_expenses=total_expenses,
        total_income=total_income,
        total_keseluruhan=total_keseluruhan
    )


@router.post("/", response_model=SetoranResponse, status_code=status.HTTP_201_CREATED)
async def create_setoran(
    setoran_data: SetoranCreate,
    db: Session = Depends(get_db)
):
    """Membuat setoran harian baru"""
    try:
        # Hitung semua nilai
        calculation = calculate_setoran(setoran_data)
        
        # Konversi expenses dan income ke JSON
        expenses_json = json.dumps([item.dict() for item in setoran_data.expenses]) if setoran_data.expenses else "[]"
        income_json = json.dumps([item.dict() for item in setoran_data.income]) if setoran_data.income else "[]"
        
        # Buat object setoran baru
        db_setoran = Setoran(
            employee_name=setoran_data.employee_name,
            jam_masuk=setoran_data.jam_masuk,
            jam_keluar=setoran_data.jam_keluar,
            nomor_awal=setoran_data.nomor_awal,
            nomor_akhir=setoran_data.nomor_akhir,
            total_liter=calculation.total_liter,
            total_setoran=calculation.total_setoran,
            qris_setoran=setoran_data.qris_setoran,
            cash_setoran=calculation.cash_setoran,
            expenses_data=expenses_json,
            total_expenses=calculation.total_expenses,
            income_data=income_json,
            total_income=calculation.total_income,
            total_keseluruhan=calculation.total_keseluruhan
        )
        
        # Simpan ke database
        db.add(db_setoran)
        db.commit()
        db.refresh(db_setoran)
        
        # Parse JSON kembali untuk response (sebagai attribute dinamis)
        setattr(db_setoran, 'expenses', json.loads(db_setoran.expenses_data) if db_setoran.expenses_data else [])
        setattr(db_setoran, 'income', json.loads(db_setoran.income_data) if db_setoran.income_data else [])
        
        return db_setoran
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating setoran: {str(e)}"
        )


@router.get("/", response_model=List[SetoranResponse])
async def get_all_setoran(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Mendapatkan daftar semua setoran harian"""
    setoran_list = db.query(Setoran).offset(skip).limit(limit).all()
    
    # Parse JSON data untuk response
    for setoran in setoran_list:
        setattr(setoran, 'expenses', json.loads(setoran.expenses_data) if setoran.expenses_data else [])
        setattr(setoran, 'income', json.loads(setoran.income_data) if setoran.income_data else [])
    
    return setoran_list


@router.get("/{setoran_id}", response_model=SetoranResponse)
async def get_setoran_by_id(
    setoran_id: int,
    db: Session = Depends(get_db)
):
    """Mendapatkan setoran harian berdasarkan ID"""
    setoran = db.query(Setoran).filter(Setoran.id == setoran_id).first()
    
    if not setoran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setoran tidak ditemukan"
        )
    
    # Parse JSON data untuk response
    setattr(setoran, 'expenses', json.loads(setoran.expenses_data) if setoran.expenses_data else [])
    setattr(setoran, 'income', json.loads(setoran.income_data) if setoran.income_data else [])
    
    return setoran


@router.put("/{setoran_id}", response_model=SetoranResponse)
async def update_setoran(
    setoran_id: int,
    setoran_update: SetoranUpdate,
    db: Session = Depends(get_db)
):
    """Update setoran harian"""
    db_setoran = db.query(Setoran).filter(Setoran.id == setoran_id).first()
    
    if not db_setoran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setoran tidak ditemukan"
        )
    
    try:
        # Update fields yang diberikan
        update_data = setoran_update.dict(exclude_unset=True)
        
        # Jika ada perubahan yang mempengaruhi perhitungan, hitung ulang
        if any(key in update_data for key in ['nomor_awal', 'nomor_akhir', 'qris_setoran', 'expenses', 'income']):
            # Buat object SetoranCreate untuk perhitungan
            current_data = SetoranCreate(
                employee_name=update_data.get('employee_name', db_setoran.employee_name),
                jam_masuk=update_data.get('jam_masuk', db_setoran.jam_masuk),
                jam_keluar=update_data.get('jam_keluar', db_setoran.jam_keluar),
                nomor_awal=update_data.get('nomor_awal', db_setoran.nomor_awal),
                nomor_akhir=update_data.get('nomor_akhir', db_setoran.nomor_akhir),
                qris_setoran=update_data.get('qris_setoran', db_setoran.qris_setoran),
                expenses=update_data.get('expenses', json.loads(getattr(db_setoran, 'expenses_data', '') or '') if getattr(db_setoran, 'expenses_data', '') else []),
                income=update_data.get('income', json.loads(getattr(db_setoran, 'income_data', '') or '') if getattr(db_setoran, 'income_data', '') else [])
            )
            
            # Hitung ulang
            calculation = calculate_setoran(current_data)
            
            # Update calculated fields
            setattr(db_setoran, 'total_liter', calculation.total_liter)
            setattr(db_setoran, 'total_setoran', calculation.total_setoran)
            setattr(db_setoran, 'cash_setoran', calculation.cash_setoran)
            setattr(db_setoran, 'total_expenses', calculation.total_expenses)
            setattr(db_setoran, 'total_income', calculation.total_income)
            setattr(db_setoran, 'total_keseluruhan', calculation.total_keseluruhan)
            
            # Update JSON fields
            if 'expenses' in update_data:
                setattr(db_setoran, 'expenses_data', json.dumps([item.dict() for item in current_data.expenses]))
            if 'income' in update_data:
                setattr(db_setoran, 'income_data', json.dumps([item.dict() for item in current_data.income]))
        
        # Update other fields
        for field, value in update_data.items():
            if field not in ['expenses', 'income'] and hasattr(db_setoran, field):
                setattr(db_setoran, field, value)
        
        db.commit()
        db.refresh(db_setoran)
        
        # Parse JSON untuk response
        setattr(db_setoran, 'expenses', json.loads(getattr(db_setoran, 'expenses_data', '') or '[]'))
        setattr(db_setoran, 'income', json.loads(getattr(db_setoran, 'income_data', '') or '[]'))
        
        return db_setoran
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating setoran: {str(e)}"
        )


@router.delete("/{setoran_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setoran(
    setoran_id: int,
    db: Session = Depends(get_db)
):
    """Hapus setoran harian"""
    db_setoran = db.query(Setoran).filter(Setoran.id == setoran_id).first()
    
    if not db_setoran:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setoran tidak ditemukan"
        )
    
    db.delete(db_setoran)
    db.commit()


@router.post("/calculate", response_model=SetoranCalculation)
async def preview_calculation(setoran_data: SetoranCreate):
    """Preview perhitungan setoran tanpa menyimpan ke database"""
    return calculate_setoran(setoran_data)