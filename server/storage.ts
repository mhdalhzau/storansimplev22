import { 
  type User, 
  type InsertUser, 
  type Store, 
  type InsertStore,
  type UserStore,
  type InsertUserStore,
  type Attendance,
  type InsertAttendance,
  type AttendanceWithEmployee,
  type Sales,
  type InsertSales,
  type Cashflow,
  type InsertCashflow,
  type Payroll,
  type InsertPayroll,
  type Proposal,
  type InsertProposal,
  type Overtime,
  type InsertOvertime,
  type Setoran,
  type InsertSetoran,
  type Customer,
  type InsertCustomer,
  type Piutang,
  type InsertPiutang
} from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Store as SessionStore } from "express-session";
import { hashPassword } from "./auth";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<Omit<InsertUser, 'storeIds'>>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getUsersByStore(storeId: number): Promise<User[]>;
  
  // User-Store assignment methods
  assignUserToStores(userId: string, storeIds: number[]): Promise<void>;
  getUserStores(userId: string): Promise<Store[]>;
  removeUserFromStores(userId: string): Promise<void>;
  
  // Store methods
  getStore(id: number): Promise<Store | undefined>;
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  getAllStores(): Promise<Store[]>;
  updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined>;
  
  // Attendance methods
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceByStore(storeId: number, date?: string): Promise<Attendance[]>;
  getAttendanceByStoreWithEmployees(storeId: number, date?: string): Promise<AttendanceWithEmployee[]>;
  getAttendanceByUser(userId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  updateAttendanceStatus(id: string, status: string): Promise<Attendance | undefined>;
  
  // Sales methods
  getSales(id: string): Promise<Sales | undefined>;
  getSalesByStore(storeId: number, startDate?: string, endDate?: string): Promise<Sales[]>;
  createSales(sales: InsertSales): Promise<Sales>;
  deleteSales(id: string): Promise<void>;
  checkDailySubmission(userId: string, storeId: number, date: string): Promise<boolean>;
  
  // Cashflow methods
  getCashflow(id: string): Promise<Cashflow | undefined>;
  getCashflowByStore(storeId: number): Promise<Cashflow[]>;
  createCashflow(cashflow: InsertCashflow): Promise<Cashflow>;
  
  // Payroll methods
  getPayroll(id: string): Promise<Payroll | undefined>;
  getPayrollByUser(userId: string): Promise<Payroll[]>;
  getAllPayroll(): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayrollStatus(id: string, status: string): Promise<Payroll | undefined>;
  
  // Proposal methods
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposalsByStore(storeId: number): Promise<Proposal[]>;
  getAllProposals(): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalStatus(id: string, status: string, reviewedBy: string): Promise<Proposal | undefined>;
  
  // Overtime methods
  getOvertime(id: string): Promise<Overtime | undefined>;
  getOvertimeByStore(storeId: number): Promise<Overtime[]>;
  getAllOvertime(): Promise<Overtime[]>;
  createOvertime(overtime: InsertOvertime): Promise<Overtime>;
  updateOvertimeStatus(id: string, status: string, approvedBy: string): Promise<Overtime | undefined>;
  
  // Setoran methods
  getSetoran(id: string): Promise<Setoran | undefined>;
  getAllSetoran(): Promise<Setoran[]>;
  createSetoran(setoran: InsertSetoran): Promise<Setoran>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomersByStore(storeId: number): Promise<Customer[]>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;
  
  // Piutang methods
  getPiutang(id: string): Promise<Piutang | undefined>;
  getPiutangByStore(storeId: number): Promise<Piutang[]>;
  getPiutangByCustomer(customerId: string): Promise<Piutang[]>;
  getAllPiutang(): Promise<Piutang[]>;
  createPiutang(piutang: InsertPiutang): Promise<Piutang>;
  updatePiutangStatus(id: string, status: string, paidAmount?: number): Promise<Piutang | undefined>;
  deletePiutang(id: string): Promise<void>;
  
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stores: Map<number, Store>;
  private userStores: Map<string, UserStore>;
  private attendanceRecords: Map<string, Attendance>;
  private salesRecords: Map<string, Sales>;
  private cashflowRecords: Map<string, Cashflow>;
  private payrollRecords: Map<string, Payroll>;
  private proposalRecords: Map<string, Proposal>;
  private overtimeRecords: Map<string, Overtime>;
  private setoranRecords: Map<string, Setoran>;
  private customerRecords: Map<string, Customer>;
  private piutangRecords: Map<string, Piutang>;
  public sessionStore: SessionStore;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.userStores = new Map();
    this.attendanceRecords = new Map();
    this.salesRecords = new Map();
    this.cashflowRecords = new Map();
    this.payrollRecords = new Map();
    this.proposalRecords = new Map();
    this.overtimeRecords = new Map();
    this.setoranRecords = new Map();
    this.customerRecords = new Map();
    this.piutangRecords = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with sample stores
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create sample stores
    const store1: Store = {
      id: 1,
      name: "Main Store",
      address: "123 Main Street",
      phone: "021-1234567",
      manager: "SPBU Manager",
      description: "Main store location with full services",
      status: "active",
      createdAt: new Date(),
    };
    const store2: Store = {
      id: 2,
      name: "Branch Store",
      address: "456 Branch Avenue",
      phone: "021-2345678",
      manager: null,
      description: "Branch store location",
      status: "active",
      createdAt: new Date(),
    };
    
    this.stores.set(1, store1);
    this.stores.set(2, store2);

    // Create default accounts
    // Manager account
    const managerPassword = await hashPassword("manager123");
    const manager: User = {
      id: randomUUID(),
      email: "manager@spbu.com",
      password: managerPassword,
      name: "SPBU Manager",
      role: "manager",
      storeId: 1,
      salary: "15000000",
      createdAt: new Date()
    };
    this.users.set(manager.id, manager);
    
    // Assign manager to stores
    await this.assignUserToStores(manager.id, [1, 2]);

    // Administrator account
    const adminPassword = await hashPassword("admin123");
    const admin: User = {
      id: randomUUID(),
      email: "admin@spbu.com",
      password: adminPassword,
      name: "SPBU Administrator",
      role: "administrasi",
      salary: "12000000",
      createdAt: new Date()
    };
    this.users.set(admin.id, admin);
    
    // Assign admin to all stores
    await this.assignUserToStores(admin.id, [1, 2]);

    // Create 3 default staff members
    // Putri
    const putriPassword = await hashPassword("putri123");
    const putri: User = {
      id: randomUUID(),
      email: "putri@spbu.com",
      password: putriPassword,
      name: "Putri",
      role: "staff",
      salary: "8000000",
      createdAt: new Date()
    };
    this.users.set(putri.id, putri);
    await this.assignUserToStores(putri.id, [1]);

    // Hafiz
    const hafizPassword = await hashPassword("hafiz123");
    const hafiz: User = {
      id: randomUUID(),
      email: "hafiz@spbu.com",
      password: hafizPassword,
      name: "Hafiz",
      role: "staff",
      salary: "8000000",
      createdAt: new Date()
    };
    this.users.set(hafiz.id, hafiz);
    await this.assignUserToStores(hafiz.id, [1]);

    // Endang
    const endangPassword = await hashPassword("endang123");
    const endang: User = {
      id: randomUUID(),
      email: "endang@spbu.com",
      password: endangPassword,
      name: "Endang",
      role: "staff",
      salary: "8000000",
      createdAt: new Date()
    };
    this.users.set(endang.id, endang);
    await this.assignUserToStores(endang.id, [2]);

    // Create sample sales records with complete data
    await this.createSampleSalesRecords(putri, hafiz, endang);
  }

  private async createSampleSalesRecords(putri: User, hafiz: User, endang: User) {
    // Sample income details (Pemasukan)
    const sampleIncomeDetails = JSON.stringify([
      { description: "Bonus Penjualan", amount: 25000 },
      { description: "Komisi Target", amount: 15000 }
    ]);

    // Sample expense details (Pengeluaran)
    const sampleExpenseDetails = JSON.stringify([
      { description: "Pembelian Tissue", amount: 12000 },
      { description: "Biaya Transportasi", amount: 8000 }
    ]);

    // Sample sales record for Putri (Main Store)
    const putriSales: Sales = {
      id: randomUUID(),
      storeId: 1,
      userId: putri.id,
      date: new Date(),
      totalSales: "850000",
      transactions: 45,
      averageTicket: "18888.89",
      totalQris: "320000",
      totalCash: "530000",
      meterStart: "12345.678",
      meterEnd: "12567.234",
      totalLiters: "221.556",
      totalIncome: "40000",
      totalExpenses: "20000",
      incomeDetails: sampleIncomeDetails,
      expenseDetails: sampleExpenseDetails,
      shift: "pagi",
      checkIn: "06:00",
      checkOut: "14:00",
      submissionDate: `${new Date().toISOString().split('T')[0]}-${putri.id}-1`,
      createdAt: new Date()
    };

    // Sample sales record for Hafiz (Main Store)
    const hafizSales: Sales = {
      id: randomUUID(),
      storeId: 1,
      userId: hafiz.id,
      date: new Date(),
      totalSales: "1200000",
      transactions: 68,
      averageTicket: "17647.06",
      totalQris: "480000",
      totalCash: "720000",
      meterStart: "12567.234",
      meterEnd: "12823.891",
      totalLiters: "256.657",
      totalIncome: "50000",
      totalExpenses: "30000",
      incomeDetails: JSON.stringify([
        { description: "Bonus Overtime", amount: 35000 },
        { description: "Insentif Kebersihan", amount: 15000 }
      ]),
      expenseDetails: JSON.stringify([
        { description: "Beli Lap Pembersih", amount: 15000 },
        { description: "Biaya Parkir", amount: 10000 },
        { description: "Makan Siang", amount: 5000 }
      ]),
      shift: "siang",
      checkIn: "14:00", 
      checkOut: "22:00",
      submissionDate: `${new Date().toISOString().split('T')[0]}-${hafiz.id}-1`,
      createdAt: new Date()
    };

    // Sample sales record for Endang (Branch Store)
    const endangSales: Sales = {
      id: randomUUID(),
      storeId: 2,
      userId: endang.id,
      date: new Date(),
      totalSales: "675000",
      transactions: 32,
      averageTicket: "21093.75",
      totalQris: "275000",
      totalCash: "400000",
      meterStart: "9876.543",
      meterEnd: "10045.321",
      totalLiters: "168.778",
      totalIncome: "30000",
      totalExpenses: "18000",
      incomeDetails: JSON.stringify([
        { description: "Bonus Kehadiran", amount: 20000 },
        { description: "Tip dari Pelanggan", amount: 10000 }
      ]),
      expenseDetails: JSON.stringify([
        { description: "Sabun Cuci Tangan", amount: 8000 },
        { description: "Air Mineral", amount: 10000 }
      ]),
      shift: "malam",
      checkIn: "22:00",
      checkOut: "06:00",
      submissionDate: `${new Date().toISOString().split('T')[0]}-${endang.id}-2`,
      createdAt: new Date()
    };

    // Additional sales record for yesterday (Putri)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const putriYesterday: Sales = {
      id: randomUUID(),
      storeId: 1,
      userId: putri.id,
      date: yesterday,
      totalSales: "920000",
      transactions: 52,
      averageTicket: "17692.31",
      totalQris: "380000",
      totalCash: "540000",
      meterStart: "12123.456",
      meterEnd: "12345.678",
      totalLiters: "222.222",
      totalIncome: "45000",
      totalExpenses: "25000",
      incomeDetails: JSON.stringify([
        { description: "Bonus Target Harian", amount: 30000 },
        { description: "Komisi Pelanggan VIP", amount: 15000 }
      ]),
      expenseDetails: JSON.stringify([
        { description: "Perbaikan Kecil Alat", amount: 20000 },
        { description: "Biaya Admin", amount: 5000 }
      ]),
      shift: "pagi",
      checkIn: "06:00",
      checkOut: "14:00",
      submissionDate: `${yesterday.toISOString().split('T')[0]}-${putri.id}-1`,
      createdAt: yesterday
    };

    // Save all sample sales records
    this.salesRecords.set(putriSales.id, putriSales);
    this.salesRecords.set(hafizSales.id, hafizSales);
    this.salesRecords.set(endangSales.id, endangSales);
    this.salesRecords.set(putriYesterday.id, putriYesterday);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const { storeIds, ...userData } = insertUser;
    const user: User = { 
      ...userData,
      id, 
      salary: insertUser.salary ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    
    // Assign user to stores
    if (storeIds && storeIds.length > 0) {
      await this.assignUserToStores(id, storeIds);
    }
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users = Array.from(this.users.values());
    // Add store information to each user
    for (const user of users) {
      user.stores = await this.getUserStores(user.id);
    }
    return users;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updated = { 
        ...user, 
        ...data,
        salary: data.salary ?? user.salary
      };
      this.users.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getUsersByStore(storeId: number): Promise<User[]> {
    const userStoreAssignments = Array.from(this.userStores.values()).filter(us => us.storeId === storeId);
    const users = [];
    for (const assignment of userStoreAssignments) {
      const user = await this.getUser(assignment.userId);
      if (user) {
        user.stores = await this.getUserStores(user.id);
        users.push(user);
      }
    }
    return users;
  }
  
  // User-Store assignment methods
  async assignUserToStores(userId: string, storeIds: number[]): Promise<void> {
    // Remove existing assignments for this user
    await this.removeUserFromStores(userId);
    
    // Add new assignments
    for (const storeId of storeIds) {
      const assignment: UserStore = {
        id: randomUUID(),
        userId,
        storeId,
        createdAt: new Date()
      };
      this.userStores.set(assignment.id, assignment);
    }
  }
  
  async getUserStores(userId: string): Promise<Store[]> {
    const userStoreAssignments = Array.from(this.userStores.values()).filter(us => us.userId === userId);
    const stores = [];
    for (const assignment of userStoreAssignments) {
      const store = await this.getStore(assignment.storeId);
      if (store) stores.push(store);
    }
    return stores;
  }
  
  async removeUserFromStores(userId: string): Promise<void> {
    const assignmentsToRemove = Array.from(this.userStores.values()).filter(us => us.userId === userId);
    for (const assignment of assignmentsToRemove) {
      this.userStores.delete(assignment.id);
    }
  }

  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const store: Store = { 
      ...insertStore, 
      address: insertStore.address ?? null,
      phone: insertStore.phone ?? null,
      manager: insertStore.manager ?? null,
      description: insertStore.description ?? null,
      status: insertStore.status ?? "active",
      createdAt: new Date() 
    };
    this.stores.set(store.id, store);
    return store;
  }

  async getAllStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async updateStore(id: number, data: Partial<InsertStore>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (store) {
      const updated = { 
        ...store, 
        ...data
      };
      this.stores.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Attendance methods
  async getAttendance(id: string): Promise<Attendance | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceByStore(storeId: number, date?: string): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => {
        const matchesStore = record.storeId === storeId;
        if (!date) return matchesStore;
        
        const recordDate = record.date?.toISOString().split('T')[0];
        return matchesStore && recordDate === date;
      }
    );
  }

  async getAttendanceByStoreWithEmployees(storeId: number, date?: string): Promise<AttendanceWithEmployee[]> {
    const attendanceRecords = await this.getAttendanceByStore(storeId, date);
    const attendanceWithEmployees: AttendanceWithEmployee[] = [];

    for (const record of attendanceRecords) {
      const user = await this.getUser(record.userId);
      if (user) {
        attendanceWithEmployees.push({
          ...record,
          employeeName: user.name,
          employeeRole: user.role,
        });
      }
    }

    return attendanceWithEmployees;
  }

  async getAttendanceByUser(userId: string): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async getAttendanceByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<Attendance[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => {
        if (record.userId !== userId) return false;
        if (!record.date) return false;
        
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
      }
    );
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = randomUUID();
    const record: Attendance = { 
      ...insertAttendance, 
      id,
      date: insertAttendance.date ?? new Date(),
      checkIn: insertAttendance.checkIn ?? null,
      checkOut: insertAttendance.checkOut ?? null,
      shift: insertAttendance.shift ?? null,
      latenessMinutes: insertAttendance.latenessMinutes ?? 0,
      overtimeMinutes: insertAttendance.overtimeMinutes ?? 0,
      breakDuration: insertAttendance.breakDuration ?? 0,
      overtime: insertAttendance.overtime ?? "0",
      notes: insertAttendance.notes ?? null,
      attendanceStatus: insertAttendance.attendanceStatus ?? "hadir",
      status: "pending",
      createdAt: new Date() 
    };
    this.attendanceRecords.set(id, record);
    return record;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const record = this.attendanceRecords.get(id);
    if (record) {
      const updated = { ...record, ...data };
      this.attendanceRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async updateAttendanceStatus(id: string, status: string): Promise<Attendance | undefined> {
    const record = this.attendanceRecords.get(id);
    if (record) {
      const updated = { ...record, status };
      this.attendanceRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Sales methods
  async getSales(id: string): Promise<Sales | undefined> {
    return this.salesRecords.get(id);
  }

  async getSalesByStore(storeId: number, startDate?: string, endDate?: string): Promise<Sales[]> {
    return Array.from(this.salesRecords.values()).filter((record) => {
      if (record.storeId !== storeId) return false;
      
      if (startDate || endDate) {
        const recordDate = record.date?.toISOString().split('T')[0];
        if (startDate && recordDate && recordDate < startDate) return false;
        if (endDate && recordDate && recordDate > endDate) return false;
      }
      
      return true;
    });
  }

  async createSales(insertSales: InsertSales): Promise<Sales> {
    const id = randomUUID();
    const record: Sales = { 
      ...insertSales, 
      id,
      userId: insertSales.userId ?? null,
      date: insertSales.date ?? new Date(),
      averageTicket: insertSales.averageTicket ?? null,
      totalQris: insertSales.totalQris ?? "0",
      totalCash: insertSales.totalCash ?? "0",
      meterStart: insertSales.meterStart ?? null,
      meterEnd: insertSales.meterEnd ?? null,
      totalLiters: insertSales.totalLiters ?? null,
      totalIncome: insertSales.totalIncome ?? "0",
      totalExpenses: insertSales.totalExpenses ?? "0",
      incomeDetails: insertSales.incomeDetails ?? null,
      expenseDetails: insertSales.expenseDetails ?? null,
      shift: insertSales.shift ?? null,
      checkIn: insertSales.checkIn ?? null,
      checkOut: insertSales.checkOut ?? null,
      submissionDate: insertSales.submissionDate ?? null,
      createdAt: new Date() 
    };
    this.salesRecords.set(id, record);
    return record;
  }

  async deleteSales(id: string): Promise<void> {
    this.salesRecords.delete(id);
  }

  async checkDailySubmission(userId: string, storeId: number, date: string): Promise<boolean> {
    // Check if user has already submitted sales data for this date and store
    const existingSubmission = Array.from(this.salesRecords.values()).find(record => {
      if (record.userId !== userId || record.storeId !== storeId) return false;
      
      // Compare dates (YYYY-MM-DD format)
      const recordDate = record.date?.toISOString().split('T')[0];
      return recordDate === date;
    });
    
    return !!existingSubmission;
  }

  // Cashflow methods
  async getCashflow(id: string): Promise<Cashflow | undefined> {
    return this.cashflowRecords.get(id);
  }

  async getCashflowByStore(storeId: number): Promise<Cashflow[]> {
    return Array.from(this.cashflowRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async createCashflow(insertCashflow: InsertCashflow): Promise<Cashflow> {
    const id = randomUUID();
    const record: Cashflow = { 
      ...insertCashflow, 
      id,
      description: insertCashflow.description ?? null,
      date: insertCashflow.date ?? null,
      createdAt: new Date() 
    };
    this.cashflowRecords.set(id, record);
    return record;
  }

  // Payroll methods
  async getPayroll(id: string): Promise<Payroll | undefined> {
    return this.payrollRecords.get(id);
  }

  async getPayrollByUser(userId: string): Promise<Payroll[]> {
    return Array.from(this.payrollRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async getAllPayroll(): Promise<Payroll[]> {
    return Array.from(this.payrollRecords.values());
  }

  async createPayroll(insertPayroll: InsertPayroll): Promise<Payroll> {
    const id = randomUUID();
    const record: Payroll = { 
      ...insertPayroll, 
      id,
      overtimePay: insertPayroll.overtimePay ?? null,
      status: "pending",
      paidAt: null,
      createdAt: new Date() 
    };
    this.payrollRecords.set(id, record);
    return record;
  }

  async updatePayrollStatus(id: string, status: string): Promise<Payroll | undefined> {
    const record = this.payrollRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        paidAt: status === 'paid' ? new Date() : record.paidAt
      };
      this.payrollRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Proposal methods
  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposalRecords.get(id);
  }

  async getProposalsByStore(storeId: number): Promise<Proposal[]> {
    return Array.from(this.proposalRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async getAllProposals(): Promise<Proposal[]> {
    return Array.from(this.proposalRecords.values());
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const record: Proposal = { 
      ...insertProposal, 
      id,
      estimatedCost: insertProposal.estimatedCost ?? null,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date() 
    };
    this.proposalRecords.set(id, record);
    return record;
  }

  async updateProposalStatus(id: string, status: string, reviewedBy: string): Promise<Proposal | undefined> {
    const record = this.proposalRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        reviewedBy,
        reviewedAt: new Date()
      };
      this.proposalRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Overtime methods
  async getOvertime(id: string): Promise<Overtime | undefined> {
    return this.overtimeRecords.get(id);
  }

  async getOvertimeByStore(storeId: number): Promise<Overtime[]> {
    return Array.from(this.overtimeRecords.values()).filter(
      (record) => record.storeId === storeId
    );
  }

  async getAllOvertime(): Promise<Overtime[]> {
    return Array.from(this.overtimeRecords.values());
  }

  async createOvertime(insertOvertime: InsertOvertime): Promise<Overtime> {
    const id = randomUUID();
    const record: Overtime = { 
      ...insertOvertime, 
      id,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date() 
    };
    this.overtimeRecords.set(id, record);
    return record;
  }

  async updateOvertimeStatus(id: string, status: string, approvedBy: string): Promise<Overtime | undefined> {
    const record = this.overtimeRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        status,
        approvedBy,
        approvedAt: new Date()
      };
      this.overtimeRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Setoran methods
  async getSetoran(id: string): Promise<Setoran | undefined> {
    return this.setoranRecords.get(id);
  }

  async getAllSetoran(): Promise<Setoran[]> {
    return Array.from(this.setoranRecords.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createSetoran(setoran: InsertSetoran): Promise<Setoran> {
    const id = randomUUID();
    const createdAt = new Date();
    
    const newSetoran: Setoran = {
      id,
      ...setoran,
      employeeId: setoran.employeeId ?? null,
      expensesData: setoran.expensesData ?? null,
      incomeData: setoran.incomeData ?? null,
      createdAt,
    };
    
    this.setoranRecords.set(id, newSetoran);
    return newSetoran;
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customerRecords.get(id);
  }

  async getCustomersByStore(storeId: number): Promise<Customer[]> {
    return Array.from(this.customerRecords.values()).filter(
      (customer) => customer.storeId === storeId
    );
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customerRecords.values());
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...insertCustomer,
      id,
      email: insertCustomer.email ?? null,
      phone: insertCustomer.phone ?? null,
      address: insertCustomer.address ?? null,
      type: insertCustomer.type ?? "customer",
      createdAt: new Date()
    };
    this.customerRecords.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customerRecords.get(id);
    if (customer) {
      const updated = { ...customer, ...data };
      this.customerRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteCustomer(id: string): Promise<void> {
    this.customerRecords.delete(id);
  }

  // Piutang methods
  async getPiutang(id: string): Promise<Piutang | undefined> {
    return this.piutangRecords.get(id);
  }

  async getPiutangByStore(storeId: number): Promise<Piutang[]> {
    return Array.from(this.piutangRecords.values()).filter(
      (piutang) => piutang.storeId === storeId
    );
  }

  async getPiutangByCustomer(customerId: string): Promise<Piutang[]> {
    return Array.from(this.piutangRecords.values()).filter(
      (piutang) => piutang.customerId === customerId
    );
  }

  async getAllPiutang(): Promise<Piutang[]> {
    return Array.from(this.piutangRecords.values());
  }

  async createPiutang(insertPiutang: InsertPiutang): Promise<Piutang> {
    const id = randomUUID();
    const piutang: Piutang = {
      ...insertPiutang,
      id,
      dueDate: insertPiutang.dueDate ?? null,
      status: insertPiutang.status ?? "belum_lunas",
      paidAmount: insertPiutang.paidAmount ?? null,
      paidAt: insertPiutang.paidAt ?? null,
      createdAt: new Date()
    };
    this.piutangRecords.set(id, piutang);
    return piutang;
  }

  async updatePiutangStatus(id: string, status: string, paidAmount?: number): Promise<Piutang | undefined> {
    const piutang = this.piutangRecords.get(id);
    if (piutang) {
      const updated = {
        ...piutang,
        status,
        paidAmount: paidAmount ? paidAmount.toString() : piutang.paidAmount,
        paidAt: status === 'lunas' ? new Date() : piutang.paidAt
      };
      this.piutangRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deletePiutang(id: string): Promise<void> {
    this.piutangRecords.delete(id);
  }
}

export const storage = new MemStorage();
