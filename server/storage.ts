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
  type InsertPiutang,
  type Wallet,
  type InsertWallet,
  type PayrollConfig,
  type InsertPayrollConfig,
  TRANSACTION_TYPES
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
  createCashflow(cashflow: InsertCashflow, createdBy?: string): Promise<Cashflow>;
  
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
  updateOvertimeHours(id: string, hours: string, reason: string): Promise<Overtime | undefined>;
  
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
  searchCustomers(storeId: number, query: string): Promise<Customer[]>;
  
  // Helper methods for QRIS management
  findOrCreatePiutangManager(storeId: number): Promise<Customer>;
  createQrisExpenseForManager(salesRecord: Sales): Promise<void>;
  
  // Piutang methods
  getPiutang(id: string): Promise<Piutang | undefined>;
  getPiutangByStore(storeId: number): Promise<Piutang[]>;
  getPiutangByCustomer(customerId: string): Promise<Piutang[]>;
  getAllPiutang(): Promise<Piutang[]>;
  createPiutang(piutang: InsertPiutang): Promise<Piutang>;
  updatePiutangStatus(id: string, status: string, paidAmount?: string): Promise<Piutang | undefined>;
  deletePiutang(id: string): Promise<void>;
  addPiutangPayment(piutangId: string, amount: string, description: string, userId: string): Promise<{piutang: Piutang, cashflow: Cashflow}>;
  
  // Wallet methods
  getWallet(id: string): Promise<Wallet | undefined>;
  getWalletsByStore(storeId: number): Promise<Wallet[]>;
  getAllWallets(): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, data: Partial<InsertWallet>): Promise<Wallet | undefined>;
  updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined>;
  deleteWallet(id: string): Promise<void>;
  
  // Payroll Configuration methods
  getPayrollConfig(): Promise<PayrollConfig | undefined>;
  createOrUpdatePayrollConfig(config: InsertPayrollConfig): Promise<PayrollConfig>;
  
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
  private walletRecords: Map<string, Wallet>;
  private payrollConfigRecords: Map<string, PayrollConfig>;
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
    this.walletRecords = new Map();
    this.payrollConfigRecords = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with sample stores
    this.initializeSampleData();
    this.initializeSampleWallets();
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

  private async initializeSampleWallets() {
    // Create sample wallets for each store
    const stores = await this.getAllStores();
    
    for (const store of stores) {
      // Bank BCA
      const bcaWallet: Wallet = {
        id: randomUUID(),
        storeId: store.id,
        name: "Bank BCA",
        type: "bank",
        balance: "5000000",
        accountNumber: "1234567890",
        description: "Rekening utama Bank BCA",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.walletRecords.set(bcaWallet.id, bcaWallet);

      // Cash
      const cashWallet: Wallet = {
        id: randomUUID(),
        storeId: store.id,
        name: "Kas Tunai",
        type: "cash",
        balance: "500000",
        accountNumber: null,
        description: "Kas tunai toko",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.walletRecords.set(cashWallet.id, cashWallet);

      // E-Wallet
      const eWallet: Wallet = {
        id: randomUUID(),
        storeId: store.id,
        name: "OVO",
        type: "ewallet",
        balance: "250000",
        accountNumber: "08123456789",
        description: "E-Wallet OVO toko",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.walletRecords.set(eWallet.id, eWallet);
    }
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
      entryTimeStart: insertStore.entryTimeStart ?? "07:00",
      entryTimeEnd: insertStore.entryTimeEnd ?? "09:00",
      exitTimeStart: insertStore.exitTimeStart ?? "17:00",
      exitTimeEnd: insertStore.exitTimeEnd ?? "19:00",
      timezone: insertStore.timezone ?? "Asia/Jakarta",
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

  // Helper function to determine attendance status based on checkIn/checkOut
  private determineAttendanceStatus(checkIn: string | null, checkOut: string | null, currentStatus?: string): string {
    // If status is explicitly set to 'cuti', preserve it (approved leave)
    if (currentStatus === 'cuti') return currentStatus;
    
    // If both checkIn and checkOut are filled, set to 'hadir'
    if (checkIn && checkOut) {
      return 'hadir';
    }
    
    // If either checkIn or checkOut is missing, default to 'alpha'
    // This ensures no stale 'hadir' status when times are incomplete
    return 'alpha';
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = randomUUID();
    
    // Determine initial attendance status - ignore client input except for 'cuti'
    // This prevents clients from bypassing the checkIn/checkOut logic
    let attendanceStatus: string;
    if (insertAttendance.attendanceStatus === 'cuti') {
      attendanceStatus = 'cuti'; // Allow manual 'cuti' setting
    } else {
      // Auto-derive based on checkIn/checkOut, ignoring any other client input
      attendanceStatus = this.determineAttendanceStatus(
        insertAttendance.checkIn ?? null, 
        insertAttendance.checkOut ?? null
      );
    }
    
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
      attendanceStatus,
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
      
      // Handle attendance status updates with strict validation
      if (data.attendanceStatus !== undefined) {
        // Only allow manual setting to 'cuti', ignore other client inputs
        if (data.attendanceStatus === 'cuti') {
          updated.attendanceStatus = 'cuti';
        } else {
          // For any other status input, derive from checkIn/checkOut instead
          const newCheckIn = data.checkIn !== undefined ? data.checkIn : record.checkIn;
          const newCheckOut = data.checkOut !== undefined ? data.checkOut : record.checkOut;
          updated.attendanceStatus = this.determineAttendanceStatus(
            newCheckIn, 
            newCheckOut, 
            record.attendanceStatus
          );
        }
      } else if (data.checkIn !== undefined || data.checkOut !== undefined) {
        // Auto-update attendance status when checkIn/checkOut change
        const newCheckIn = data.checkIn !== undefined ? data.checkIn : record.checkIn;
        const newCheckOut = data.checkOut !== undefined ? data.checkOut : record.checkOut;
        updated.attendanceStatus = this.determineAttendanceStatus(
          newCheckIn, 
          newCheckOut, 
          record.attendanceStatus
        );
      }
      
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

    // Handle QRIS payments: create piutang for manager since money is still in manager's personal account
    const qrisAmount = parseFloat(record.totalQris || "0");
    if (qrisAmount > 0) {
      await this.createQrisPiutangForManager(record);
    }

    // Automatically create cashflow entries for sales data
    await this.createCashflowFromSales(record);

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

  async createCashflow(insertCashflow: InsertCashflow, createdBy?: string): Promise<Cashflow> {
    const id = randomUUID();
    const record: Cashflow = { 
      ...insertCashflow, 
      id,
      description: insertCashflow.description ?? null,
      date: insertCashflow.date ?? null,
      // Customer and payment tracking fields
      customerId: insertCashflow.customerId ?? null,
      piutangId: insertCashflow.piutangId ?? null,
      paymentStatus: insertCashflow.paymentStatus ?? "lunas",
      // Handle new fields for Pembelian Minyak
      jumlahGalon: insertCashflow.jumlahGalon ?? null,
      pajakOngkos: insertCashflow.pajakOngkos ?? null,
      pajakTransfer: insertCashflow.type === TRANSACTION_TYPES.PEMBELIAN_MINYAK || insertCashflow.type === TRANSACTION_TYPES.PEMBELIAN_MINYAK_ALT 
        ? (insertCashflow.pajakTransfer ?? "2500") 
        : insertCashflow.pajakTransfer ?? null,
      totalPengeluaran: insertCashflow.totalPengeluaran ?? null,
      // Handle new fields for Transfer Rekening
      konter: insertCashflow.konter ?? null,
      pajakTransferRekening: insertCashflow.pajakTransferRekening ?? null,
      hasil: insertCashflow.hasil ?? null,
      createdAt: new Date() 
    };
    
    // Auto-create piutang for unpaid debt transactions
    if (insertCashflow.type === TRANSACTION_TYPES.PEMBERIAN_UTANG && 
        insertCashflow.paymentStatus === "belum_lunas" && 
        insertCashflow.customerId) {
      
      const piutangData: InsertPiutang = {
        customerId: insertCashflow.customerId,
        storeId: insertCashflow.storeId,
        amount: insertCashflow.amount,
        description: insertCashflow.description || "Utang dari transaksi",
        status: "belum_lunas",
        paidAmount: "0",
        createdBy: createdBy || "system"
      };
      
      const piutang = await this.createPiutang(piutangData);
      record.piutangId = piutang.id;
    }
    
    this.cashflowRecords.set(id, record);
    return record;
  }

  // Helper method to create cashflow entries from sales data
  private async createCashflowFromSales(salesRecord: Sales): Promise<void> {
    const { storeId, totalCash, date, submissionDate, userId, shift } = salesRecord;
    
    // Require either submissionDate or date for deterministic behavior
    if (!submissionDate && !date) {
      console.warn("Sales record missing both submissionDate and date, skipping cashflow creation");
      return;
    }

    const salesDate = date || new Date();

    // Create stable submission key for idempotency
    let submissionKey: string;
    if (submissionDate) {
      submissionKey = submissionDate;
    } else {
      // Create deterministic key including shift to handle multiple shifts per day
      const dateStr = salesDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const shiftStr = shift || 'na';
      submissionKey = `${dateStr}-${userId}-${storeId}-${shiftStr}`;
    }

    // Helper function to check if cashflow entry already exists for this submission
    const isDuplicateEntry = (): boolean => {
      const expectedDescription = `Penjualan Cash otomatis dari sales report [${submissionKey}]`;
      return Array.from(this.cashflowRecords.values()).some(
        cashflow => cashflow.storeId === storeId && 
                   cashflow.category === "Income" &&
                   cashflow.type === "Sales" &&
                   cashflow.description === expectedDescription
      );
    };

    // Create cashflow entry for cash payments specifically (if > 0)
    // Only cash payments create immediate cashflow - QRIS is handled via piutang system
    // Additional income and expenses are handled separately through existing cashflow functionality
    const cashAmount = parseFloat(totalCash?.toString() || "0");
    if (cashAmount > 0 && !isDuplicateEntry()) {
      const cashCashflow: InsertCashflow = {
        storeId,
        category: "Income",
        type: "Sales",
        amount: totalCash,
        description: `Penjualan Cash otomatis dari sales report [${submissionKey}]`,
        date: salesDate,
      };
      await this.createCashflow(cashCashflow, "system");
    }
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

  async updateOvertimeHours(id: string, hours: string, reason: string): Promise<Overtime | undefined> {
    const record = this.overtimeRecords.get(id);
    if (record) {
      const updated = { 
        ...record, 
        hours,
        reason
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
    // Check if it's a virtual customer (user-based)
    if (id.startsWith('user-')) {
      const userId = id.replace('user-', '');
      const user = await this.getUser(userId);
      if (user && ['staff', 'manager', 'administrasi'].includes(user.role)) {
        // Convert user to customer format
        return {
          id: id,
          name: user.name,
          email: user.email,
          phone: null,
          address: `Internal Employee - ${user.role}`,
          type: "employee" as const,
          storeId: 1, // Default for virtual customers
          createdAt: user.createdAt || new Date()
        };
      }
      return undefined;
    }
    
    // Regular customer lookup
    return this.customerRecords.get(id);
  }

  async getCustomersByStore(storeId: number): Promise<Customer[]> {
    // Get regular customers
    const regularCustomers = Array.from(this.customerRecords.values()).filter(
      (customer) => customer.storeId === storeId
    );

    // Get internal users (staff, admin, manager) and convert to customer format
    const internalUsers = await this.getUsersByStore(storeId);
    const allInternalUsers = internalUsers.filter(user => 
      ['staff', 'manager', 'administrasi'].includes(user.role)
    );

    // Convert users to customer format for consistent interface
    const virtualCustomers: Customer[] = allInternalUsers.map(user => ({
      id: `user-${user.id}`, // Prefix to differentiate from real customers
      name: user.name,
      email: user.email,
      phone: null,
      address: `Internal Employee - ${user.role}`,
      type: "employee" as const,
      storeId: storeId,
      createdAt: user.createdAt || new Date()
    }));

    // Combine regular customers with virtual customers from internal users
    return [...regularCustomers, ...virtualCustomers];
  }

  async getAllCustomers(): Promise<Customer[]> {
    // Get regular customers
    const regularCustomers = Array.from(this.customerRecords.values());

    // Get all internal users (staff, admin, manager) across all stores and convert to customer format
    const allUsers = await this.getAllUsers();
    const allInternalUsers = allUsers.filter(user => 
      ['staff', 'manager', 'administrasi'].includes(user.role)
    );

    // Convert users to customer format for consistent interface
    const virtualCustomers: Customer[] = allInternalUsers.map(user => ({
      id: `user-${user.id}`, // Prefix to differentiate from real customers
      name: user.name,
      email: user.email,
      phone: null,
      address: `Internal Employee - ${user.role}`,
      type: "employee" as const,
      storeId: 1, // Default store for admins
      createdAt: user.createdAt || new Date()
    }));

    // Combine regular customers with virtual customers from internal users
    return [...regularCustomers, ...virtualCustomers];
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

  async searchCustomers(storeId: number, query: string): Promise<Customer[]> {
    const customers = Array.from(this.customerRecords.values()).filter(
      (customer) => customer.storeId === storeId
    );
    
    if (!query.trim()) {
      return customers;
    }
    
    const searchTerm = query.toLowerCase();
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
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

  async updatePiutangStatus(id: string, status: string, paidAmount?: string): Promise<Piutang | undefined> {
    const piutang = this.piutangRecords.get(id);
    if (piutang) {
      const updated = {
        ...piutang,
        status,
        paidAmount: paidAmount || piutang.paidAmount,
        paidAt: status === 'lunas' ? new Date() : (status === 'belum_lunas' ? null : piutang.paidAt)
      };
      this.piutangRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deletePiutang(id: string): Promise<void> {
    this.piutangRecords.delete(id);
  }

  async addPiutangPayment(piutangId: string, amount: string, description: string, userId: string): Promise<{piutang: Piutang, cashflow: Cashflow}> {
    const piutang = this.piutangRecords.get(piutangId);
    if (!piutang) {
      throw new Error("Piutang not found");
    }

    const amountNum = parseFloat(amount);
    
    // Validate amount
    if (amountNum <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    const currentPaidAmount = parseFloat(piutang.paidAmount || "0");
    const totalAmount = parseFloat(piutang.amount);
    const newPaidAmount = currentPaidAmount + amountNum;

    // Prevent overpayment
    if (newPaidAmount > totalAmount) {
      throw new Error("Payment amount exceeds remaining debt");
    }

    // Determine payment status based on remaining amount
    const remainingAmount = totalAmount - newPaidAmount;
    const paymentStatus = remainingAmount <= 0 ? "lunas" : "belum_lunas";

    // Create cashflow entry for payment
    const cashflowData: InsertCashflow = {
      storeId: piutang.storeId,
      category: "Income",
      type: TRANSACTION_TYPES.PEMBAYARAN_PIUTANG,
      amount: amount,
      description: description,
      customerId: piutang.customerId,
      piutangId: piutangId,
      paymentStatus: paymentStatus
    };
    
    const cashflow = await this.createCashflow(cashflowData, userId);

    // Update piutang record
    const newStatus = newPaidAmount >= totalAmount ? "lunas" : "belum_lunas";
    const updatedPiutang = await this.updatePiutangStatus(
      piutangId, 
      newStatus, 
      newPaidAmount.toString()
    );

    if (!updatedPiutang) {
      throw new Error("Failed to update piutang status");
    }

    return { piutang: updatedPiutang, cashflow };
  }

  // Helper method to find manager customer (auto-populated from users)
  async findManagerCustomer(storeId: number): Promise<Customer | undefined> {
    // Look for manager user in the store
    const storeUsers = await this.getUsersByStore(storeId);
    const managerUser = storeUsers.find(user => user.role === 'manager');
    
    if (managerUser) {
      // Return virtual customer from manager user
      return {
        id: `user-${managerUser.id}`,
        name: managerUser.name,
        email: managerUser.email,
        phone: null,
        address: `Internal Employee - ${managerUser.role} - Rekening Pribadi untuk transfer QRIS ke toko`,
        type: "employee" as const,
        storeId: storeId,
        createdAt: managerUser.createdAt || new Date()
      };
    }

    // Fallback: look for existing manager customer record
    const existingManager = Array.from(this.customerRecords.values()).find(
      customer => customer.email === 'manager@spbu.com' && customer.storeId === storeId
    );

    return existingManager;
  }

  // Create piutang for manager when QRIS payment received
  async createQrisPiutangForManager(salesRecord: Sales): Promise<void> {
    const qrisAmount = parseFloat(salesRecord.totalQris || "0");
    if (qrisAmount <= 0) return;

    // Find manager customer (auto-populated from users)
    const managerCustomer = await this.findManagerCustomer(salesRecord.storeId);
    
    if (!managerCustomer) {
      console.warn(`No manager found for store ${salesRecord.storeId}, skipping QRIS piutang creation`);
      return;
    }

    // Create piutang: manager owes store the QRIS amount
    // Income will only be recorded when manager pays this piutang
    const piutangData: InsertPiutang = {
      customerId: managerCustomer.id,
      storeId: salesRecord.storeId,
      amount: salesRecord.totalQris || "0",
      description: `Piutang QRIS dari Manager - Sales: ${salesRecord.id} - ${new Date(salesRecord.date).toLocaleDateString('id-ID')} - Menunggu transfer dari rekening pribadi manager ke toko`,
      status: "belum_lunas",
      paidAmount: "0",
      createdBy: salesRecord.userId || "system"
    };

    await this.createPiutang(piutangData);
    
    // NO income created here - income only created when manager pays the piutang
  }

  // Wallet methods
  async getWallet(id: string): Promise<Wallet | undefined> {
    return this.walletRecords.get(id);
  }

  async getWalletsByStore(storeId: number): Promise<Wallet[]> {
    return Array.from(this.walletRecords.values()).filter(
      (wallet) => wallet.storeId === storeId && wallet.isActive
    );
  }

  async getAllWallets(): Promise<Wallet[]> {
    return Array.from(this.walletRecords.values()).filter(
      (wallet) => wallet.isActive
    );
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const id = randomUUID();
    const wallet: Wallet = {
      ...insertWallet,
      id,
      balance: insertWallet.balance ?? "0",
      accountNumber: insertWallet.accountNumber ?? null,
      description: insertWallet.description ?? null,
      isActive: insertWallet.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.walletRecords.set(id, wallet);
    return wallet;
  }

  async updateWallet(id: string, data: Partial<InsertWallet>): Promise<Wallet | undefined> {
    const wallet = this.walletRecords.get(id);
    if (wallet) {
      const updated = { 
        ...wallet, 
        ...data, 
        updatedAt: new Date() 
      };
      this.walletRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined> {
    const wallet = this.walletRecords.get(id);
    if (wallet) {
      const updated = { 
        ...wallet, 
        balance, 
        updatedAt: new Date() 
      };
      this.walletRecords.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteWallet(id: string): Promise<void> {
    const wallet = this.walletRecords.get(id);
    if (wallet) {
      // Soft delete by setting isActive to false
      const updated = { 
        ...wallet, 
        isActive: false, 
        updatedAt: new Date() 
      };
      this.walletRecords.set(id, updated);
    }
  }

  // Payroll Configuration methods
  async getPayrollConfig(): Promise<PayrollConfig | undefined> {
    // Since there's only one config, we get the first (and only) one
    const configs = Array.from(this.payrollConfigRecords.values()).filter(
      (config) => config.isActive
    );
    return configs.length > 0 ? configs[0] : undefined;
  }

  async createOrUpdatePayrollConfig(insertConfig: InsertPayrollConfig): Promise<PayrollConfig> {
    // First, deactivate any existing config
    const existingConfigs = Array.from(this.payrollConfigRecords.values());
    existingConfigs.forEach(config => {
      if (config.isActive) {
        const deactivated = { 
          ...config, 
          isActive: false, 
          updatedAt: new Date() 
        };
        this.payrollConfigRecords.set(config.id, deactivated);
      }
    });

    // Calculate next payroll date
    const startDate = new Date(insertConfig.startDate);
    const cycle = parseInt(insertConfig.payrollCycle);
    const nextPayrollDate = new Date(startDate);
    nextPayrollDate.setDate(startDate.getDate() + cycle);

    // Create new config
    const id = randomUUID();
    const config: PayrollConfig = {
      ...insertConfig,
      id,
      nextPayrollDate: nextPayrollDate.toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.payrollConfigRecords.set(id, config);
    return config;
  }
}

export const storage = new MemStorage();
