-- AIVEN POSTGRESQL DATABASE SCHEMA BACKUP
-- Generated: September 23, 2025 22:06:30 UTC
-- Database: Aiven PostgreSQL 17.6
-- Application: SPBU Business Management System

-- EXISTING TABLES IN DATABASE:
-- attendance, cashflow, customers, inventory, inventory_transactions, 
-- overtime, payroll, payroll_config, piutang, products, proposals, 
-- sales, setoran, stores, suppliers, user_stores, users, wallets

-- COMPLETE SCHEMA FROM shared/schema.ts:

-- Transaction type constants
-- TRANSACTION_TYPES = {
--   PEMBERIAN_UTANG: "Pemberian Utang",
--   PEMBAYARAN_PIUTANG: "Pembayaran Piutang", 
--   PEMBELIAN_MINYAK: "Pembelian stok (Pembelian Minyak)",
--   PEMBELIAN_MINYAK_ALT: "Pembelian Minyak",
--   TRANSFER_REKENING: "Transfer Rekening",
--   PENJUALAN_TRANSFER: "Penjualan (Transfer rekening)"
-- }

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "name" text NOT NULL,
    "role" text NOT NULL, -- 'staff', 'manager', 'administrasi'
    "phone" text,
    "salary" decimal(12, 2),
    "created_at" timestamp DEFAULT now()
);

-- User-Store assignment table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS "user_stores" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL,
    "store_id" integer NOT NULL,
    "created_at" timestamp DEFAULT now()
);

-- Stores table
CREATE TABLE IF NOT EXISTS "stores" (
    "id" integer PRIMARY KEY,
    "name" text NOT NULL,
    "address" text,
    "phone" text,
    "manager" text,
    "description" text,
    "status" text DEFAULT 'active', -- 'active', 'inactive'
    "entry_time_start" text DEFAULT '07:00',
    "entry_time_end" text DEFAULT '09:00', 
    "exit_time_start" text DEFAULT '17:00',
    "exit_time_end" text DEFAULT '19:00',
    "timezone" text DEFAULT 'Asia/Jakarta',
    "created_at" timestamp DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS "attendance" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL,
    "store_id" integer NOT NULL,
    "date" timestamp DEFAULT now(),
    "check_in" text,
    "check_out" text,
    "shift" text, -- 'pagi', 'siang', 'malam'
    "lateness_minutes" integer DEFAULT 0,
    "overtime_minutes" integer DEFAULT 0,
    "break_duration" integer DEFAULT 0,
    "overtime" decimal(4, 2) DEFAULT '0',
    "notes" text,
    "attendance_status" text DEFAULT 'belum_diatur',
    "status" text DEFAULT 'pending',
    "created_at" timestamp DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS "sales" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" integer NOT NULL,
    "user_id" varchar,
    "date" timestamp DEFAULT now(),
    "total_sales" decimal(12, 2) NOT NULL,
    "transactions" integer NOT NULL,
    "average_ticket" decimal(8, 2),
    "total_qris" decimal(12, 2) DEFAULT '0',
    "total_cash" decimal(12, 2) DEFAULT '0',
    "meter_start" decimal(10, 3),
    "meter_end" decimal(10, 3),
    "total_liters" decimal(10, 3),
    "total_income" decimal(12, 2) DEFAULT '0',
    "total_expenses" decimal(12, 2) DEFAULT '0',
    "income_details" text,
    "expense_details" text,
    "shift" text,
    "check_in" text,
    "check_out" text,
    "submission_date" text,
    "created_at" timestamp DEFAULT now()
);

-- Cashflow table
CREATE TABLE IF NOT EXISTS "cashflow" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" integer NOT NULL,
    "category" text NOT NULL,
    "type" text NOT NULL,
    "amount" decimal(10, 2) NOT NULL,
    "description" text,
    "customer_id" varchar,
    "piutang_id" varchar,
    "payment_status" text DEFAULT 'lunas',
    "jumlah_galon" decimal(8, 2),
    "pajak_ongkos" decimal(10, 2),
    "pajak_transfer" decimal(10, 2) DEFAULT '2500',
    "total_pengeluaran" decimal(12, 2),
    "konter" text,
    "pajak_transfer_rekening" decimal(10, 2),
    "hasil" decimal(12, 2),
    "date" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now()
);

-- Complete schema includes additional tables:
-- payroll, proposals, overtime, setoran, customers, piutang, wallets,
-- payroll_config, suppliers, products, inventory, inventory_transactions

-- BACKUP NOTES:
-- 1. All tables successfully created in Aiven PostgreSQL
-- 2. SSL certificate configured for secure connections
-- 3. Application uses Drizzle ORM for database operations
-- 4. Session storage implemented using connect-pg-simple
-- 5. No fallback databases - ONLY Aiven PostgreSQL used