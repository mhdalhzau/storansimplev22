import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'staff', 'manager', 'administrasi'
  salary: decimal("salary", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-Store assignment table (many-to-many relationship)
export const userStores = pgTable("user_stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  storeId: integer("store_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stores table
export const stores = pgTable("stores", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  manager: text("manager"),
  description: text("description"),
  status: text("status").default("active"), // 'active', 'inactive'
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  storeId: integer("store_id").notNull(),
  date: timestamp("date").defaultNow(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  shift: text("shift"), // auto-detected: 'pagi', 'siang', 'malam'
  latenessMinutes: integer("lateness_minutes").default(0), // telat berapa menit
  overtimeMinutes: integer("overtime_minutes").default(0), // lembur berapa menit
  breakDuration: integer("break_duration").default(0), // in minutes
  overtime: decimal("overtime", { precision: 4, scale: 2 }).default("0"), // in hours (kept for compatibility)
  notes: text("notes"),
  attendanceStatus: text("attendance_status").default("hadir"), // 'hadir', 'cuti', 'alpha'
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales table with detailed breakdown
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: integer("store_id").notNull(),
  userId: varchar("user_id"), // Staff who submitted the data
  date: timestamp("date").defaultNow(),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).notNull(),
  transactions: integer("transactions").notNull(),
  averageTicket: decimal("average_ticket", { precision: 8, scale: 2 }),
  // Payment breakdown
  totalQris: decimal("total_qris", { precision: 12, scale: 2 }).default("0"),
  totalCash: decimal("total_cash", { precision: 12, scale: 2 }).default("0"),
  // Meter readings
  meterStart: decimal("meter_start", { precision: 10, scale: 3 }),
  meterEnd: decimal("meter_end", { precision: 10, scale: 3 }),
  totalLiters: decimal("total_liters", { precision: 10, scale: 3 }),
  // PU (Income/Expenses)
  totalIncome: decimal("total_income", { precision: 12, scale: 2 }).default("0"),
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).default("0"),
  incomeDetails: text("income_details"), // JSON string
  expenseDetails: text("expense_details"), // JSON string
  // Shift information
  shift: text("shift"), // 'pagi', 'siang', 'malam'
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  // One submission per day validation
  submissionDate: text("submission_date"), // Format: YYYY-MM-DD-userId-storeId for uniqueness
  createdAt: timestamp("created_at").defaultNow(),
});

// Cashflow table
export const cashflow = pgTable("cashflow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: integer("store_id").notNull(),
  category: text("category").notNull(), // 'Income', 'Expense', 'Investment'
  type: text("type").notNull(), // 'Sales', 'Inventory', 'Utilities', 'Salary', 'Other', 'Pembelian Minyak', 'Transfer Rekening'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  // Fields for Pembelian Minyak
  jumlahGalon: decimal("jumlah_galon", { precision: 8, scale: 2 }), // Number of gallons
  pajakOngkos: decimal("pajak_ongkos", { precision: 10, scale: 2 }), // Tax fee (calculated)
  pajakTransfer: decimal("pajak_transfer", { precision: 10, scale: 2 }).default("2500"), // Transfer tax (fixed 2500)
  totalPengeluaran: decimal("total_pengeluaran", { precision: 12, scale: 2 }), // Total expenses
  // Fields for Transfer Rekening
  konter: text("konter"), // 'Dia store', 'manual'
  pajakTransferRekening: decimal("pajak_transfer_rekening", { precision: 10, scale: 2 }), // Transfer account tax
  hasil: decimal("hasil", { precision: 12, scale: 2 }), // Result (amount - tax, rounded)
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payroll table
export const payroll = pgTable("payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  month: text("month").notNull(), // 'YYYY-MM'
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // 'pending', 'paid'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Proposals table
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  storeId: integer("store_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'Equipment', 'Process Improvement', 'Training', 'Other'
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  description: text("description").notNull(),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Overtime table
export const overtime = pgTable("overtime", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  storeId: integer("store_id").notNull(),
  date: timestamp("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Setoran table
export const setoran = pgTable("setoran", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: text("employee_name").notNull(),
  employeeId: varchar("employee_id"), // Add employee ID reference
  jamMasuk: text("jam_masuk").notNull(),
  jamKeluar: text("jam_keluar").notNull(),
  nomorAwal: decimal("nomor_awal", { precision: 10, scale: 3 }).notNull(),
  nomorAkhir: decimal("nomor_akhir", { precision: 10, scale: 3 }).notNull(),
  totalLiter: decimal("total_liter", { precision: 10, scale: 3 }).notNull(),
  totalSetoran: decimal("total_setoran", { precision: 12, scale: 2 }).notNull(),
  qrisSetoran: decimal("qris_setoran", { precision: 12, scale: 2 }).notNull(),
  cashSetoran: decimal("cash_setoran", { precision: 12, scale: 2 }).notNull(),
  expensesData: text("expenses_data"), // JSON string
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).notNull(),
  incomeData: text("income_data"), // JSON string  
  totalIncome: decimal("total_income", { precision: 12, scale: 2 }).notNull(),
  totalKeseluruhan: decimal("total_keseluruhan", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  type: text("type").default("customer"), // 'customer', 'employee'
  storeId: integer("store_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Piutang table (debt/receivables)
export const piutang = pgTable("piutang", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  storeId: integer("store_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").default("belum_lunas"), // 'lunas', 'belum_lunas'
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  paidAt: timestamp("paid_at"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  salary: true, // Omit salary to properly override it
}).extend({
  storeIds: z.array(z.number()).min(1, "Please select at least one store"),
  // Accept number from frontend and convert to string for decimal field
  salary: z.coerce.number().min(0, "Salary must be a positive number").optional().transform((val) => val?.toString()),
});

export const insertUserStoreSchema = createInsertSchema(userStores).omit({
  id: true,
  createdAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertSalesSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const insertCashflowSchema = createInsertSchema(cashflow).omit({
  id: true,
  createdAt: true,
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  createdAt: true,
  status: true,
  paidAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertOvertimeSchema = createInsertSchema(overtime).omit({
  id: true,
  createdAt: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertSetoranSchema = createInsertSchema(setoran).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertPiutangSchema = createInsertSchema(piutang).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect & { 
  stores?: Store[];
  storeId?: number; // Deprecated: for backward compatibility, use stores array instead
};
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserStore = typeof userStores.$inferSelect;
export type InsertUserStore = z.infer<typeof insertUserStoreSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Sales = typeof sales.$inferSelect;
export type InsertSales = z.infer<typeof insertSalesSchema>;
export type Cashflow = typeof cashflow.$inferSelect;
export type InsertCashflow = z.infer<typeof insertCashflowSchema>;
export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Overtime = typeof overtime.$inferSelect;
export type InsertOvertime = z.infer<typeof insertOvertimeSchema>;
export type Setoran = typeof setoran.$inferSelect;
export type InsertSetoran = z.infer<typeof insertSetoranSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Piutang = typeof piutang.$inferSelect;
export type InsertPiutang = z.infer<typeof insertPiutangSchema>;

// Extended types with related data
export type AttendanceWithEmployee = Attendance & {
  employeeName: string;
  employeeRole: string;
};
