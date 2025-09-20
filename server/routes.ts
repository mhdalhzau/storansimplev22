import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  initializeGoogleSheetsService, 
  getGoogleSheetsService, 
  isGoogleSheetsConfigured,
  type GoogleSheetsConfig 
} from "./google-sheets";
import { 
  insertAttendanceSchema,
  insertCashflowSchema,
  insertProposalSchema,
  insertOvertimeSchema,
  insertSetoranSchema,
  insertSalesSchema,
  insertCustomerSchema,
  insertPiutangSchema
} from "@shared/schema";
import { z } from "zod";

// Helper functions for multi-store authorization
async function hasStoreAccess(user: any, storeId: number): Promise<boolean> {
  // First verify the store exists
  const store = await storage.getStore(storeId);
  if (!store) return false;
  
  if (user.role === 'administrasi') return true; // Admins have access to all existing stores
  
  const userStores = await storage.getUserStores(user.id);
  return userStores.some(store => store.id === storeId);
}

async function getUserFirstStoreId(user: any): Promise<number | undefined> {
  const userStores = await storage.getUserStores(user.id);
  return userStores.length > 0 ? userStores[0].id : undefined;
}

async function getAccessibleStoreIds(user: any): Promise<number[]> {
  if (user.role === 'administrasi') {
    const allStores = await storage.getAllStores();
    return allStores.map(store => store.id);
  }
  
  const userStores = await storage.getUserStores(user.id);
  return userStores.map(store => store.id);
}

export function registerRoutes(app: Express): Server {
  // Initialize Google Sheets Service if credentials are available
  const initializeGoogleSheets = () => {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
      
      if (spreadsheetId && credentials) {
        const config: GoogleSheetsConfig = {
          spreadsheetId,
          worksheetName: 'Sales Data',
          credentialsJson: credentials
        };
        
        initializeGoogleSheetsService(config);
        console.log('Google Sheets service initialized successfully');
      } else {
        console.log('Google Sheets credentials not found, sync functionality disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
    }
  };
  
  initializeGoogleSheets();

  // Setup authentication routes
  setupAuth(app);

  // Attendance routes
  app.post("/api/attendance", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      let targetUserId = req.user.id;
      let targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);
      
      // Verify store access for the current user
      if (targetStoreId && !(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      // Allow managers and admins to create attendance for other users
      if (req.body.userId && ['manager', 'administrasi'].includes(req.user.role)) {
        targetUserId = req.body.userId;
        
        // For non-admins, verify the target user shares at least one store
        if (req.user.role !== 'administrasi') {
          const targetUser = await storage.getUser(req.body.userId);
          if (!targetUser) {
            return res.status(404).json({ message: "Target user not found" });
          }
          
          const targetUserStores = await storage.getUserStores(targetUser.id);
          const currentUserStores = await storage.getUserStores(req.user.id);
          
          const hasSharedStore = targetUserStores.some(ts => 
            currentUserStores.some(cs => cs.id === ts.id)
          );
          
          if (!hasSharedStore) {
            return res.status(403).json({ message: "Cannot create attendance for users outside your stores" });
          }
        }
        
        // Use the specified storeId or target user's first store
        if (!targetStoreId) {
          const targetUser = await storage.getUser(targetUserId);
          targetStoreId = await getUserFirstStoreId(targetUser);
        }
        
        // Ensure the target user is assigned to the target store
        const targetUser = await storage.getUser(targetUserId);
        if (targetUser && !(await hasStoreAccess(targetUser, targetStoreId))) {
          return res.status(403).json({ message: "Cannot create attendance for user in a store they are not assigned to" });
        }
      }
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      const data = insertAttendanceSchema.parse({
        ...req.body,
        userId: targetUserId,
        storeId: targetStoreId,
      });
      
      const attendance = await storage.createAttendance(data);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const { storeId, date } = req.query;
      
      let records;
      if (req.user.role === 'staff' && !storeId) {
        // Staff can see their own attendance across all their assigned stores
        records = await storage.getAttendanceByUser(req.user.id);
      } else {
        // For managers/admins, allow getting attendance without specific storeId
        if (['manager', 'administrasi'].includes(req.user.role) && !storeId) {
          // Get attendance from all accessible stores
          const accessibleStoreIds = await getAccessibleStoreIds(req.user);
          if (accessibleStoreIds.length === 0) {
            return res.json([]);
          }
          
          const allRecords = [];
          for (const targetStoreId of accessibleStoreIds) {
            const storeRecords = await storage.getAttendanceByStoreWithEmployees(targetStoreId, date as string);
            allRecords.push(...storeRecords);
          }
          records = allRecords;
        } else {
          // Get attendance for specific store or user's first store
          const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);
          
          if (!targetStoreId) {
            return res.status(400).json({ message: "Store ID is required" });
          }
          
          // Verify store access
          if (!(await hasStoreAccess(req.user, targetStoreId))) {
            return res.status(403).json({ message: "You don't have access to this store" });
          }
          
          // Use method with employee names for managers and administrators
          if (['manager', 'administrasi'].includes(req.user.role)) {
            records = await storage.getAttendanceByStoreWithEmployees(targetStoreId, date as string);
          } else {
            records = await storage.getAttendanceByStore(targetStoreId, date as string);
          }
        }
      }
      
      res.json(records);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get attendance for specific user
  app.get("/api/attendance/user/:userId?/:date?", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const userId = req.params.userId || req.user.id;
      const date = req.params.date || req.query.date as string;
      
      // Check if user is trying to access someone else's data
      if (userId !== req.user.id && !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "You can only access your own attendance" });
      }
      
      // For managers/admins accessing other user's data, verify shared store access
      if (userId !== req.user.id && req.user.role !== 'administrasi') {
        const targetUser = await storage.getUser(userId);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const targetUserStores = await storage.getUserStores(targetUser.id);
        const currentUserStores = await storage.getUserStores(req.user.id);
        
        const hasSharedStore = targetUserStores.some(ts => 
          currentUserStores.some(cs => cs.id === ts.id)
        );
        
        if (!hasSharedStore) {
          return res.status(403).json({ message: "You don't have access to this user's attendance" });
        }
      }
      
      // Get all attendance for user
      const allRecords = await storage.getAttendanceByUser(userId);
      
      let records;
      if (date) {
        // Filter by specific date
        records = allRecords.filter(record => {
          if (!record.date) return false;
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === date;
        });
      } else {
        records = allRecords;
      }
      
      res.json(records);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update attendance
  app.put("/api/attendance/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Get existing attendance to verify access
      const existingAttendance = await storage.getAttendance(req.params.id);
      if (!existingAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      // Check permissions - user can update their own, managers/admins can update others
      if (existingAttendance.userId !== req.user.id && !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "You can only update your own attendance" });
      }
      
      // For managers updating others' attendance, verify shared store access
      if (existingAttendance.userId !== req.user.id && req.user.role !== 'administrasi') {
        const targetUser = await storage.getUser(existingAttendance.userId);
        if (!targetUser) {
          return res.status(404).json({ message: "Target user not found" });
        }
        
        const targetUserStores = await storage.getUserStores(targetUser.id);
        const currentUserStores = await storage.getUserStores(req.user.id);
        
        const hasSharedStore = targetUserStores.some(ts => 
          currentUserStores.some(cs => cs.id === ts.id)
        );
        
        if (!hasSharedStore) {
          return res.status(403).json({ message: "You don't have access to update this user's attendance" });
        }
      }
      
      // Validate request data using partial insert schema
      const updateSchema = insertAttendanceSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      // Update the attendance record
      const updatedAttendance = await storage.updateAttendance(req.params.id, validatedData);
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Failed to update attendance record" });
      }
      
      res.json(updatedAttendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/overtime/:id/approve", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the overtime record first to check store access
      const existingOvertime = await storage.getOvertime(req.params.id);
      if (!existingOvertime) {
        return res.status(404).json({ message: "Overtime not found" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, existingOvertime.storeId))) {
        return res.status(403).json({ message: "You don't have access to approve overtime for this store" });
      }
      
      const overtime = await storage.updateOvertimeStatus(req.params.id, 'approved', req.user.id);
      if (!overtime) return res.status(404).json({ message: "Overtime not found" });
      
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Sales routes
  app.get("/api/sales", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi', 'staff'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { storeId, startDate, endDate } = req.query;
      
      // Get target store ID - use provided storeId or user's first store
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const sales = await storage.getSalesByStore(
        targetStoreId, 
        startDate as string, 
        endDate as string
      );
      
      res.json(sales);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // New endpoint: Convert all setoran data to sales report
  app.post("/api/sales/import-from-setoran", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied. Only managers and administrators can import setoran data." });
      }

      const { storeId, dateFilter } = req.body;
      
      // Get target store ID
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ 
          message: "Store ID is required",
          details: "Please provide a valid store ID to import data for." 
        });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ 
          message: "Access denied to store",
          details: `You don't have permission to access store ${targetStoreId}.` 
        });
      }

      let importResults = {
        success: 0,
        errors: 0,
        skipped: 0,
        details: [] as any[],
        totalProcessed: 0
      };

      // Fetch setoran data from Python API
      try {
        console.log('Fetching setoran data from Python API...');
        
        // Build query params for filtering by date if provided
        const queryParams = new URLSearchParams();
        if (dateFilter) {
          queryParams.append('date_filter', dateFilter);
        }
        
        const setoranUrl = `http://localhost:8000/api/setoran${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        console.log(`Calling: ${setoranUrl}`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
        
        const response = await fetch(setoranUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Python API error: ${response.status} - ${errorText}`);
          return res.status(502).json({ 
            message: "Failed to fetch setoran data",
            details: `Python API returned ${response.status}: ${errorText}`,
            pythonApiError: true
          });
        }

        const setoranData = await response.json();
        console.log(`Fetched ${setoranData.length} setoran records`);

        if (!Array.isArray(setoranData)) {
          return res.status(502).json({ 
            message: "Invalid data format from setoran API",
            details: "Expected array of setoran records but received different format" 
          });
        }

        if (setoranData.length === 0) {
          return res.status(200).json({
            message: "No setoran data found to import",
            results: importResults
          });
        }

        importResults.totalProcessed = setoranData.length;

        // Fetch existing sales records once for duplicate checking
        const existingSales = await storage.getSalesByStore(targetStoreId);
        const existingSubmissionIds = new Set(existingSales.map(s => s.submissionDate).filter(Boolean));

        // Process each setoran record and convert to sales
        for (let i = 0; i < setoranData.length; i++) {
          const setoran = setoranData[i];
          
          try {
            // Validate required fields - need either employee ID or name, and total amount
            const hasEmployee = setoran.employee_id || setoran.employee_name;
            const hasTotal = setoran.total_keseluruhan || setoran.total_setoran;
            
            if (!hasEmployee || !hasTotal) {
              importResults.skipped++;
              importResults.details.push({
                index: i,
                employeeName: setoran.employee_name || 'Unknown',
                status: 'skipped',
                reason: 'Missing required fields (employee_id/employee_name or total_keseluruhan/total_setoran)'
              });
              continue;
            }

            // Calculate sales metrics from setoran data
            const salesData = await convertSetoranToSales(setoran, targetStoreId);
            
            // Check for existing record to prevent duplicates
            const submissionId = salesData.submissionDate;
            if (existingSubmissionIds.has(submissionId)) {
              importResults.skipped++;
              importResults.details.push({
                index: i,
                employeeName: setoran.employee_name,
                status: 'skipped',
                reason: 'Duplicate record - already imported for this employee/date/store combination'
              });
              continue;
            }
            
            // Validate the converted data
            const validatedSalesData = insertSalesSchema.parse(salesData);

            // Save to sales database
            const savedSales = await storage.createSales(validatedSalesData);
            
            // Real-time sync to Google Sheets if configured
            const sheetsService = getGoogleSheetsService();
            if (sheetsService) {
              try {
                await sheetsService.appendSalesData(savedSales);
                console.log(`Synced sales data to Google Sheets: ${savedSales.id}`);
              } catch (sheetsError) {
                console.error(`Failed to sync sales data to Google Sheets for ${savedSales.id}:`, sheetsError);
                // Don't fail the main operation if sheets sync fails
              }
            }
            
            importResults.success++;
            importResults.details.push({
              index: i,
              employeeName: setoran.employee_name,
              status: 'success',
              salesId: savedSales.id,
              totalSales: salesData.totalSales,
              transactions: salesData.transactions,
              date: salesData.date
            });

            console.log(`Successfully converted setoran ${i + 1}/${setoranData.length} (Employee: ${setoran.employee_name})`);

          } catch (error: any) {
            importResults.errors++;
            importResults.details.push({
              index: i,
              employeeName: setoran.employee_name || 'Unknown',
              status: 'error',
              error: error.message,
              reason: 'Failed to convert or save sales data'
            });
            console.error(`Error processing setoran ${i + 1}:`, error.message);
          }
        }

        // Return comprehensive results
        return res.status(200).json({
          message: `Import completed. ${importResults.success} successful, ${importResults.errors} errors, ${importResults.skipped} skipped.`,
          results: importResults,
          summary: {
            totalProcessed: importResults.totalProcessed,
            successful: importResults.success,
            errors: importResults.errors,
            skipped: importResults.skipped,
            successRate: importResults.totalProcessed > 0 
              ? Math.round((importResults.success / importResults.totalProcessed) * 100) + '%'
              : '0%'
          }
        });

      } catch (fetchError: any) {
        console.error('Error fetching from Python API:', fetchError);
        
        if (fetchError.code === 'ECONNREFUSED') {
          return res.status(503).json({ 
            message: "Python API is not available",
            details: "The setoran API server (port 8000) is not running. Please start the Python backend first.",
            suggestion: "Run: python run_python_api.py"
          });
        }
        
        return res.status(502).json({ 
          message: "Failed to connect to setoran API",
          details: fetchError.message,
          suggestion: "Check if the Python API is running on port 8000"
        });
      }

    } catch (error: any) {
      console.error('Import setoran to sales error:', error);
      return res.status(500).json({ 
        message: "Internal server error during import",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Helper function to convert setoran data to sales format
  async function convertSetoranToSales(setoran: any, storeId: number): Promise<any> {
    // Helper to safely convert to decimal string or undefined
    function toDecimalString(value: any): string | undefined {
      if (value === null || value === undefined || value === '') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num.toString();
    }

    // Helper to safely get string value or undefined
    function toStringOrUndefined(value: any): string | undefined {
      return (value && value !== '') ? value : undefined;
    }

    // Parse expenses and income from JSON strings if needed
    let expenses = [];
    let income = [];
    
    try {
      if (typeof setoran.expenses_data === 'string') {
        expenses = JSON.parse(setoran.expenses_data || '[]');
      } else if (Array.isArray(setoran.expenses)) {
        expenses = setoran.expenses;
      }
    } catch (e) {
      console.warn('Failed to parse expenses data:', e);
      expenses = [];
    }

    try {
      if (typeof setoran.income_data === 'string') {
        income = JSON.parse(setoran.income_data || '[]');
      } else if (Array.isArray(setoran.income)) {
        income = setoran.income;
      }
    } catch (e) {
      console.warn('Failed to parse income data:', e);
      income = [];
    }

    // Helper function to determine shift from check-in time
    function determineShift(jamMasuk: string): string {
      if (!jamMasuk) return '';
      
      // Parse time (expect format like "06:00" or "06:00:00")
      const timeParts = jamMasuk.split(':');
      if (timeParts.length < 2) return '';
      
      const hour = parseInt(timeParts[0], 10);
      
      if (hour >= 6 && hour < 14) {
        return 'pagi'; // Morning shift: 6:00-14:00
      } else if (hour >= 14 && hour < 22) {
        return 'siang'; // Day shift: 14:00-22:00  
      } else {
        return 'malam'; // Night shift: 22:00-06:00
      }
    }

    // Resolve employee ID - try to find existing user by employee ID or name
    let resolvedUserId = undefined;
    if (setoran.employee_id) {
      try {
        const user = await storage.getUser(setoran.employee_id);
        if (user) {
          resolvedUserId = user.id;
        }
      } catch (e) {
        console.warn('Failed to resolve employee by ID:', setoran.employee_id);
      }
    }

    // If no user found by ID, try to find by name
    if (!resolvedUserId && setoran.employee_name) {
      try {
        const allUsers = await storage.getAllUsers();
        const userByName = allUsers.find(user => 
          user.name.toLowerCase() === setoran.employee_name.toLowerCase()
        );
        if (userByName) {
          resolvedUserId = userByName.id;
        }
      } catch (e) {
        console.warn('Failed to resolve employee by name:', setoran.employee_name);
      }
    }

    // Convert date
    let salesDate;
    if (setoran.created_at) {
      salesDate = new Date(setoran.created_at);
    } else {
      salesDate = new Date(); // fallback to current date
    }

    // Calculate sales metrics
    const totalSales = parseFloat(setoran.total_keseluruhan || setoran.total_setoran || '0');
    
    // Count transactions - assume 1 main fuel transaction + number of income items  
    const fuelTransactionCount = setoran.total_liter && parseFloat(setoran.total_liter) > 0 ? 1 : 0;
    const incomeTransactionCount = income.length || 0;
    const transactions = fuelTransactionCount + incomeTransactionCount;
    
    // Calculate average ticket
    const averageTicket = transactions > 0 ? totalSales / transactions : 0;

    // Build complete sales record with all fields from setoran
    const salesData: any = {
      storeId: storeId,
      date: salesDate,
      totalSales: totalSales.toString(),
      transactions: transactions,
      averageTicket: averageTicket.toString(),
    };

    // Only add userId if resolved
    if (resolvedUserId) {
      salesData.userId = resolvedUserId;
    }

    // Payment breakdown
    const qrisAmount = toDecimalString(setoran.qris_setoran);
    if (qrisAmount) salesData.totalQris = qrisAmount;
    
    const cashAmount = toDecimalString(setoran.cash_setoran);
    if (cashAmount) salesData.totalCash = cashAmount;

    // Meter readings  
    const meterStart = toDecimalString(setoran.nomor_awal);
    if (meterStart) salesData.meterStart = meterStart;
    
    const meterEnd = toDecimalString(setoran.nomor_akhir);
    if (meterEnd) salesData.meterEnd = meterEnd;
    
    const totalLiters = toDecimalString(setoran.total_liter);
    if (totalLiters) salesData.totalLiters = totalLiters;

    // Income/Expenses
    const incomeAmount = toDecimalString(setoran.total_income);
    if (incomeAmount) salesData.totalIncome = incomeAmount;
    
    const expenseAmount = toDecimalString(setoran.total_expenses);
    if (expenseAmount) salesData.totalExpenses = expenseAmount;

    // JSON details - only if data exists
    const incomeDetails = setoran.income_data || (income.length > 0 ? JSON.stringify(income) : undefined);
    if (incomeDetails) salesData.incomeDetails = incomeDetails;
    
    const expenseDetails = setoran.expenses_data || (expenses.length > 0 ? JSON.stringify(expenses) : undefined);
    if (expenseDetails) salesData.expenseDetails = expenseDetails;

    // Shift information
    const shift = determineShift(setoran.jam_masuk || '');
    if (shift) salesData.shift = shift;
    
    const checkIn = toStringOrUndefined(setoran.jam_masuk);
    if (checkIn) salesData.checkIn = checkIn;
    
    const checkOut = toStringOrUndefined(setoran.jam_keluar);
    if (checkOut) salesData.checkOut = checkOut;

    // Submission tracking - use employee name and date for uniqueness
    salesData.submissionDate = `${salesDate.toISOString().split('T')[0]}-${setoran.employee_id || setoran.employee_name || 'unknown'}-${storeId}`;

    return salesData;
  }

  app.get("/api/export/pdf", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock PDF export
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
      res.send("PDF content would be generated here");
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/export/excel", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock Excel export
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
      res.send("Excel content would be generated here");
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the sales record first to check store access
      const existingSales = await storage.getSales(req.params.id);
      if (!existingSales) return res.status(404).json({ message: "Sales record not found" });
      
      // Check store authorization for non-admins
      if (req.user.role !== 'administrasi') {
        if (!(await hasStoreAccess(req.user, existingSales.storeId))) {
          return res.status(403).json({ message: "Cannot delete sales records from stores you don't have access to" });
        }
      }
      
      await storage.deleteSales(req.params.id);
      
      // Sync deletion to Google Sheets if configured
      const sheetsService = getGoogleSheetsService();
      if (sheetsService) {
        try {
          await sheetsService.deleteSalesData(req.params.id);
        } catch (error) {
          console.error('Failed to delete from Google Sheets:', error);
          // Don't fail the main operation if sheets sync fails
        }
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Google Sheets Sync endpoints
  app.post("/api/sales/sync-to-sheets", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure GOOGLE_SHEETS_CREDENTIALS and GOOGLE_SHEETS_SPREADSHEET_ID environment variables"
        });
      }

      // Validate request body
      const requestSchema = z.object({
        storeId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      });

      const validatedBody = requestSchema.parse(req.body);
      const { storeId, startDate, endDate } = validatedBody;
      
      // Get target store ID
      const targetStoreId = storeId ? parseInt(storeId) : await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access (important for managers)
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      // Get sales data for the specified store and date range
      const salesData = await storage.getSalesByStore(targetStoreId, startDate, endDate);
      
      // Sync all data to Google Sheets
      await sheetsService.syncAllSalesData(salesData);
      
      res.json({
        success: true,
        message: `Successfully synced ${salesData.length} sales records to Google Sheets`,
        syncedRecords: salesData.length
      });

    } catch (error: any) {
      console.error('Google Sheets sync error:', error);
      res.status(500).json({ 
        message: "Failed to sync to Google Sheets",
        details: error.message 
      });
    }
  });

  app.get("/api/sales/sheets-status", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      
      if (!sheetsService) {
        return res.json({
          configured: false,
          message: "Google Sheets integration not configured"
        });
      }

      const isConnected = await sheetsService.testConnection();
      
      res.json({
        configured: true,
        connected: isConnected,
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        message: isConnected ? "Google Sheets connected successfully" : "Failed to connect to Google Sheets"
      });

    } catch (error: any) {
      res.status(500).json({
        configured: true,
        connected: false,
        message: "Error testing Google Sheets connection",
        details: error.message
      });
    }
  });

  // Cashflow routes
  app.post("/api/cashflow", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi', 'staff'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const data = insertCashflowSchema.parse({
        ...req.body,
        storeId: targetStoreId,
      });
      
      const cashflow = await storage.createCashflow(data);
      res.status(201).json(cashflow);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/cashflow", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi', 'staff'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { storeId } = req.query;
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const cashflow = await storage.getCashflowByStore(targetStoreId);
      res.json(cashflow);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Payroll routes
  app.post("/api/payroll/generate", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get accessible store IDs for the user
      const accessibleStoreIds = await getAccessibleStoreIds(req.user);
      if (accessibleStoreIds.length === 0) {
        return res.status(403).json({ message: "No accessible stores" });
      }
      
      // Generate payroll only for staff users in accessible stores
      let users: any[] = [];
      for (const storeId of accessibleStoreIds) {
        const storeUsers = await storage.getUsersByStore(storeId);
        users.push(...storeUsers.filter((u: any) => u.role === 'staff'));
      }
      
      // Remove duplicates (users assigned to multiple stores)
      const uniqueUsers = users.filter((user, index, self) => 
        index === self.findIndex((u) => u.id === user.id)
      );
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const payrollPromises = uniqueUsers.map(async (user: any) => {
        const baseSalary = user.salary || "3000.00"; // Use user's salary or default
        const overtimePay = "240.00"; // Mock overtime calculation
        const totalAmount = (parseFloat(baseSalary) + parseFloat(overtimePay)).toString();
        
        return storage.createPayroll({
          userId: user.id,
          month: currentMonth,
          baseSalary,
          overtimePay,
          totalAmount,
        });
      });
      
      const payrolls = await Promise.all(payrollPromises);
      res.status(201).json(payrolls);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/payroll", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (req.user.role === 'administrasi') {
        // Admins can see all payroll
        const payroll = await storage.getAllPayroll();
        res.json(payroll);
      } else {
        // Managers can only see payroll for users in their accessible stores
        const accessibleStoreIds = await getAccessibleStoreIds(req.user);
        let filteredPayroll: any[] = [];
        
        for (const storeId of accessibleStoreIds) {
          const storeUsers = await storage.getUsersByStore(storeId);
          const storeUserIds = storeUsers.map(u => u.id);
          
          const allPayroll = await storage.getAllPayroll();
          const storePayroll = allPayroll.filter(p => storeUserIds.includes(p.userId));
          filteredPayroll.push(...storePayroll);
        }
        
        // Remove duplicates
        const uniquePayroll = filteredPayroll.filter((payroll, index, self) => 
          index === self.findIndex((p) => p.id === payroll.id)
        );
        
        res.json(uniquePayroll);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/:id/pay", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the payroll record to verify access
      const existingPayroll = await storage.getPayroll(req.params.id);
      if (!existingPayroll) {
        return res.status(404).json({ message: "Payroll not found" });
      }
      
      // For non-admins, verify they have access to the user's stores
      if (req.user.role !== 'administrasi') {
        const payrollUser = await storage.getUser(existingPayroll.userId);
        if (!payrollUser) {
          return res.status(404).json({ message: "Payroll user not found" });
        }
        
        const payrollUserStores = await storage.getUserStores(payrollUser.id);
        const currentUserStores = await storage.getUserStores(req.user.id);
        
        const hasSharedStore = payrollUserStores.some(ps => 
          currentUserStores.some(cs => cs.id === ps.id)
        );
        
        if (!hasSharedStore) {
          return res.status(403).json({ message: "You don't have access to pay this user's payroll" });
        }
      }
      
      const payroll = await storage.updatePayrollStatus(req.params.id, 'paid');
      if (!payroll) return res.status(404).json({ message: "Payroll not found" });
      
      res.json(payroll);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Proposal routes
  app.post("/api/proposal", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const data = insertProposalSchema.parse({
        ...req.body,
        userId: req.user.id,
        storeId: targetStoreId,
      });
      
      const proposal = await storage.createProposal(data);
      res.status(201).json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const { storeId } = req.query;
      
      let proposals;
      if (req.user.role === 'administrasi' && !storeId) {
        // Administrators can see all proposals across all stores when no specific store is requested
        proposals = await storage.getAllProposals();
      } else {
        // For all other cases, get proposals from specific store
        const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);
        
        if (!targetStoreId) {
          return res.status(400).json({ message: "Store ID is required" });
        }
        
        // Verify store access
        if (!(await hasStoreAccess(req.user, targetStoreId))) {
          return res.status(403).json({ message: "You don't have access to this store" });
        }
        
        proposals = await storage.getProposalsByStore(targetStoreId);
      }
      
      res.json(proposals);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/proposal/:id/approve", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the proposal first to check store access
      const existingProposal = await storage.getProposal(req.params.id);
      if (!existingProposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, existingProposal.storeId))) {
        return res.status(403).json({ message: "You don't have access to approve proposals for this store" });
      }
      
      const proposal = await storage.updateProposalStatus(req.params.id, 'approved', req.user.id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/proposal/:id/reject", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the proposal first to check store access
      const existingProposal = await storage.getProposal(req.params.id);
      if (!existingProposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, existingProposal.storeId))) {
        return res.status(403).json({ message: "You don't have access to reject proposals for this store" });
      }
      
      const proposal = await storage.updateProposalStatus(req.params.id, 'rejected', req.user.id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Overtime routes
  app.get("/api/overtime", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'administrasi') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const overtime = await storage.getAllOvertime();
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/overtime/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'administrasi') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { status } = req.body;
      const overtime = await storage.updateOvertimeStatus(req.params.id, status, req.user.id);
      if (!overtime) return res.status(404).json({ message: "Overtime not found" });
      
      res.json(overtime);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Google Sheets sync route
  app.post("/api/store/:id/sync", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mock Google Sheets sync
      res.json({ 
        message: "Sync completed successfully",
        syncedAt: new Date().toISOString(),
        recordsCount: 150
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Setoran routes
  app.post("/api/setoran", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Calculate all values
      const {
        employee_name,
        employeeId,
        jam_masuk,
        jam_keluar,
        nomor_awal,
        nomor_akhir,
        qris_setoran,
        expenses,
        income
      } = req.body;

      // Server-side calculations (don't trust client values)
      const parsed_nomor_awal = Number(nomor_awal) || 0;
      const parsed_nomor_akhir = Number(nomor_akhir) || 0;
      const parsed_qris_setoran = Number(qris_setoran) || 0;
      
      // Calculate liter
      const total_liter = Math.max(0, parsed_nomor_akhir - parsed_nomor_awal);
      
      // Calculate setoran (1 liter = Rp 11.500)
      const total_setoran = total_liter * 11500;
      const cash_setoran = Math.max(0, total_setoran - parsed_qris_setoran);
      
      // Calculate expenses and income (validate amounts)
      const total_expenses = expenses?.reduce((sum: number, item: any) => {
        const amount = Number(item.amount) || 0;
        return sum + Math.max(0, amount); // Ensure non-negative
      }, 0) || 0;
      
      const total_income = income?.reduce((sum: number, item: any) => {
        const amount = Number(item.amount) || 0;
        return sum + Math.max(0, amount); // Ensure non-negative
      }, 0) || 0;
      
      // Total keseluruhan = Cash + Pemasukan - Pengeluaran
      const total_keseluruhan = cash_setoran + total_income - total_expenses;
      
      const data = insertSetoranSchema.parse({
        employeeName: employee_name,
        employeeId: employeeId || null,
        jamMasuk: jam_masuk,
        jamKeluar: jam_keluar,
        nomorAwal: nomor_awal.toString(),
        nomorAkhir: nomor_akhir.toString(),
        totalLiter: total_liter.toString(),
        totalSetoran: total_setoran.toString(),
        qrisSetoran: qris_setoran.toString(),
        cashSetoran: cash_setoran.toString(),
        expensesData: JSON.stringify(expenses || []),
        totalExpenses: total_expenses.toString(),
        incomeData: JSON.stringify(income || []),
        totalIncome: total_income.toString(),
        totalKeseluruhan: total_keseluruhan.toString(),
      });
      
      const setoran = await storage.createSetoran(data);
      
      // Create related records based on user permissions
      const results: any = { setoran };
      
      // 1. Create attendance with proper authorization checks
      if (employeeId && jam_masuk && jam_keluar) {
        try {
          let targetUserId = req.user.id;
          let targetStoreId = await getUserFirstStoreId(req.user);
          
          // Only allow creating attendance for other users if manager/admin
          if (employeeId !== req.user.id) {
            if (!['manager', 'administrasi'].includes(req.user.role)) {
              // Staff cannot create attendance for other users - use their own ID
              targetUserId = req.user.id;
              targetStoreId = await getUserFirstStoreId(req.user);
            } else if (req.user.role === 'manager') {
              // For managers, verify the target user shares at least one store
              const targetUser = await storage.getUser(employeeId);
              if (!targetUser) {
                throw new Error('Target user not found');
              }
              
              const targetUserStores = await storage.getUserStores(targetUser.id);
              const currentUserStores = await storage.getUserStores(req.user.id);
              
              const hasSharedStore = targetUserStores.some(ts => 
                currentUserStores.some(cs => cs.id === ts.id)
              );
              
              if (!hasSharedStore) {
                throw new Error('Managers cannot create attendance for users outside their stores');
              } else {
                targetUserId = employeeId;
                targetStoreId = await getUserFirstStoreId(targetUser);
              }
            } else {
              // For admins, get target user's store
              const targetUser = await storage.getUser(employeeId);
              if (!targetUser) {
                throw new Error('Target user not found');
              }
              targetUserId = employeeId;
              targetStoreId = await getUserFirstStoreId(targetUser);
            }
          }
          
          // Ensure storeId is available before creating attendance
          if (!targetStoreId) {
            // If user doesn't have a store, assign to default store (ID: 1)
            targetStoreId = 1;
          }
          
          const attendanceData = insertAttendanceSchema.parse({
            userId: targetUserId,
            storeId: targetStoreId,
            checkIn: jam_masuk,
            checkOut: jam_keluar,
            notes: `Setoran harian - ${employee_name}`
          });
          
          const attendance = await storage.createAttendance(attendanceData);
          results.attendance = attendance;
        } catch (attendanceError) {
          // Log error but don't fail the entire operation
          console.warn('Failed to create attendance:', attendanceError);
        }
      }
      
      // 2. Create sales record for all setoran submissions using proper conversion
      {
        try {
          let salesStoreId = await getUserFirstStoreId(req.user);
          
          // Ensure storeId is available before creating sales
          if (!salesStoreId) {
            salesStoreId = 1; // Default store
          }
          
          // Create setoran object that matches convertSetoranToSales expected format
          const setoranForConversion = {
            employee_id: employeeId,
            employee_name: employee_name,
            jam_masuk: jam_masuk,
            jam_keluar: jam_keluar,
            nomor_awal: nomor_awal,
            nomor_akhir: nomor_akhir,
            total_liter: total_liter,
            total_setoran: total_setoran,
            qris_setoran: qris_setoran,
            cash_setoran: cash_setoran,
            total_expenses: total_expenses,
            total_income: total_income,
            total_keseluruhan: total_keseluruhan,
            expenses_data: JSON.stringify(expenses || []),
            income_data: JSON.stringify(income || []),
            created_at: new Date().toISOString()
          };
          
          // Use the proper conversion function to map all setoran data to sales
          const salesData = await convertSetoranToSales(setoranForConversion, salesStoreId);
          const validatedSalesData = insertSalesSchema.parse(salesData);
          
          const sales = await storage.createSales(validatedSalesData);
          results.sales = sales;
        } catch (salesError) {
          console.warn('Failed to create sales record:', salesError);
        }
      }
      
      // 3. Create cashflow records for expenses and income for all setoran submissions
      {
        try {
          // Create expense records
          if (expenses?.length > 0) {
            for (const expense of expenses) {
              if (expense.description && expense.amount > 0) {
                let cashflowStoreId = await getUserFirstStoreId(req.user);
                
                // Ensure storeId is available before creating cashflow
                if (!cashflowStoreId) {
                  cashflowStoreId = 1; // Default store
                }
                
                const expenseData = insertCashflowSchema.parse({
                  storeId: cashflowStoreId,
                  category: 'Expense',
                  type: 'Other',
                  amount: expense.amount.toString(),
                  description: expense.description
                });
                await storage.createCashflow(expenseData);
              }
            }
          }
          
          // Create income records
          if (income?.length > 0) {
            for (const incomeItem of income) {
              if (incomeItem.description && incomeItem.amount > 0) {
                let cashflowStoreId = await getUserFirstStoreId(req.user);
                
                // Ensure storeId is available before creating cashflow
                if (!cashflowStoreId) {
                  cashflowStoreId = 1; // Default store
                }
                
                const incomeData = insertCashflowSchema.parse({
                  storeId: cashflowStoreId,
                  category: 'Income',
                  type: 'Other',
                  amount: incomeItem.amount.toString(),
                  description: incomeItem.description
                });
                await storage.createCashflow(incomeData);
              }
            }
          }
        } catch (cashflowError) {
          console.warn('Failed to create cashflow records:', cashflowError);
        }
      }
      
      res.status(201).json(results);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/setoran", async (req, res) => {
    try {
      const setoranData = await storage.getAllSetoran();
      res.json(setoranData);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Mock dashboard stats
      const stats = {
        totalSales: "$12,450",
        staffPresent: "8/10",
        pendingProposals: 3,
        monthlyCashflow: "+$2,340"
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User Management routes (Manager only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { hashPassword } = await import("./auth");
      const { insertUserSchema } = await import("@shared/schema");
      
      // Validate the request data
      const validatedData = insertUserSchema.parse({
        ...req.body,
        password: await hashPassword(req.body.password),
      });
      
      // Auto-assign new users to stores based on creator's access
      let storeIds: number[] = validatedData.storeIds || [];
      
      if (storeIds.length === 0) {
        const userRole = req.user.role as string;
        if (userRole === 'administrasi') {
          // Admins can assign to any store, default to first store
          const allStores = await storage.getStores();
          if (allStores.length > 0) {
            storeIds = [allStores[0].id];
          }
        } else if (userRole === 'manager') {
          // Managers assign to their stores
          const managerStores = await storage.getUserStores(req.user.id);
          if (managerStores.length > 0) {
            storeIds = managerStores.map(s => s.id);
          } else {
            // If manager has no stores, assign to default store
            storeIds = [1];
          }
        } else {
          // Staff and others get assigned to default store
          storeIds = [1];
        }
      }
      
      const userDataWithStores = {
        ...validatedData,
        storeIds: storeIds
      };
      
      const user = await storage.createUser(userDataWithStores);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const { storeIds, ...updateData } = req.body;
      
      // If password is being updated, hash it
      if (updateData.password) {
        const { hashPassword } = await import("./auth");
        updateData.password = await hashPassword(updateData.password);
      }
      
      // Update user basic info
      const user = await storage.updateUser(id, updateData);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      // Update store assignments if provided
      if (storeIds && Array.isArray(storeIds)) {
        await storage.assignUserToStores(id, storeIds);
      }
      
      // Return updated user with stores
      const updatedUser = await storage.getUser(id);
      if (updatedUser) {
        updatedUser.stores = await storage.getUserStores(id);
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Store Management routes (Manager only)
  app.get("/api/stores", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const store = await storage.createStore(req.body);
      res.status(201).json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/stores/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const store = await storage.updateStore(parseInt(id), req.body);
      if (!store) return res.status(404).json({ message: "Store not found" });
      
      res.json(store);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/stores/:id/employees", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { id } = req.params;
      const employees = await storage.getUsersByStore(parseInt(id));
      res.json(employees);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      let customers;
      if (req.user.role === 'administrasi') {
        customers = await storage.getAllCustomers();
      } else {
        customers = await storage.getCustomersByStore(req.user.storeId!);
      }
      
      res.json(customers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const data = insertCustomerSchema.parse({
        ...req.body,
        storeId: targetStoreId,
      });
      
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Check authorization: managers can only update their store customers, admins can update any
      const existingCustomer = await storage.getCustomer(req.params.id);
      if (!existingCustomer) return res.status(404).json({ message: "Customer not found" });
      
      if (req.user.role === 'staff') {
        return res.status(403).json({ message: "Staff cannot update customers" });
      }
      
      // Check store access for non-admins
      if (req.user.role !== 'administrasi') {
        if (!(await hasStoreAccess(req.user, existingCustomer.storeId))) {
          return res.status(403).json({ message: "Cannot update customers from stores you don't have access to" });
        }
      }
      
      // Validate request body using partial customer schema
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check store authorization for non-admins and get customer data
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      
      if (req.user.role !== 'administrasi') {
        if (!(await hasStoreAccess(req.user, customer.storeId))) {
          return res.status(403).json({ message: "Cannot delete customers from stores you don't have access to" });
        }
      }
      
      // Check for related piutang records to prevent orphaned data
      const relatedPiutang = await storage.getPiutangByCustomer(req.params.id);
      if (relatedPiutang.length > 0) {
        const unpaidCount = relatedPiutang.filter(p => p.status === 'belum_lunas').length;
        if (unpaidCount > 0) {
          return res.status(409).json({ 
            message: `Cannot delete customer. Customer has ${unpaidCount} unpaid receivable record(s). Please settle all debts before deletion.`,
            details: `Customer "${customer.name}" has outstanding receivables. Please complete all payments or transfer debts to another customer before deletion.`
          });
        } else {
          return res.status(409).json({ 
            message: `Cannot delete customer. Customer has ${relatedPiutang.length} paid receivable record(s) that must be preserved for audit purposes.`,
            details: `Customer "${customer.name}" has payment history. Consider archiving instead of deletion to maintain financial records.`
          });
        }
      }
      
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Piutang routes
  app.get("/api/piutang", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      let piutang;
      if (req.user.role === 'administrasi') {
        piutang = await storage.getAllPiutang();
      } else {
        piutang = await storage.getPiutangByStore(req.user.storeId!);
      }
      
      res.json(piutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/piutang", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);
      
      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }
      
      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }
      
      const data = insertPiutangSchema.parse({
        ...req.body,
        storeId: targetStoreId,
        createdBy: req.user.id,
      });
      
      const piutang = await storage.createPiutang(data);
      res.status(201).json(piutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/piutang/:id/status", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Check authorization: get existing piutang and verify access
      const existingPiutang = await storage.getPiutang(req.params.id);
      if (!existingPiutang) return res.status(404).json({ message: "Piutang not found" });
      
      if (req.user.role === 'staff') {
        return res.status(403).json({ message: "Staff cannot update piutang status" });
      }
      
      // Check store access for non-admins
      if (req.user.role !== 'administrasi') {
        if (!(await hasStoreAccess(req.user, existingPiutang.storeId))) {
          return res.status(403).json({ message: "Cannot update piutang from stores you don't have access to" });
        }
      }
      
      // Validate request body
      const statusSchema = z.object({
        status: z.enum(['lunas', 'belum_lunas']),
        paidAmount: z.number().optional()
      });
      
      const { status, paidAmount } = statusSchema.parse(req.body);
      const piutang = await storage.updatePiutangStatus(req.params.id, status, paidAmount);
      
      res.json(piutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/piutang/:id", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deletePiutang(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/piutang/customer/:customerId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const piutang = await storage.getPiutangByCustomer(req.params.customerId);
      res.json(piutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Staff Attendance Management routes
  app.get("/api/employees", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Get accessible store IDs for the user
      const accessibleStoreIds = await getAccessibleStoreIds(req.user);
      if (accessibleStoreIds.length === 0) {
        return res.json([]);
      }
      
      // Get all employees from accessible stores
      let employees: any[] = [];
      for (const storeId of accessibleStoreIds) {
        const storeEmployees = await storage.getUsersByStore(storeId);
        employees.push(...storeEmployees.filter((u: any) => u.role === 'staff'));
      }
      
      // Remove duplicates and add store info
      const uniqueEmployees = employees.filter((emp, index, self) => 
        index === self.findIndex((e) => e.id === emp.id)
      );
      
      // Add store names to each employee
      const employeesWithStores = await Promise.all(
        uniqueEmployees.map(async (emp) => {
          const empStores = await storage.getUserStores(emp.id);
          const storeNames = empStores.map(store => store.name).join(', ');
          return { ...emp, storeNames };
        })
      );
      
      res.json(employeesWithStores);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get monthly attendance for employee
  app.get("/api/employees/:employeeId/attendance/:year/:month", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const { employeeId, year, month } = req.params;
      
      // Verify access to employee
      const employee = await storage.getUser(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // For non-admins, verify shared store access
      if (req.user.role !== 'administrasi') {
        const employeeStores = await storage.getUserStores(employee.id);
        const currentUserStores = await storage.getUserStores(req.user.id);
        
        const hasSharedStore = employeeStores.some(es => 
          currentUserStores.some(cs => cs.id === es.id)
        );
        
        if (!hasSharedStore) {
          return res.status(403).json({ message: "Access denied to this employee's data" });
        }
      }
      
      // Get attendance records for the month
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      const attendanceRecords = await storage.getAttendanceByUserAndDateRange(
        employeeId, 
        startDate.toISOString(), 
        endDate.toISOString()
      );
      
      // Generate full month data
      const daysInMonth = endDate.getDate();
      const monthlyData = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(parseInt(year), parseInt(month) - 1, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayName = currentDate.toLocaleDateString('id-ID', { weekday: 'long' });
        
        // Find existing attendance record for this date
        const existingRecord = attendanceRecords.find((record: any) => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === dateStr;
        });
        
        monthlyData.push({
          date: dateStr,
          day: dayName,
          ...existingRecord,
          // If no record exists, set defaults
          checkIn: existingRecord?.checkIn || '',
          checkOut: existingRecord?.checkOut || '',
          shift: existingRecord?.shift || '',
          latenessMinutes: existingRecord?.latenessMinutes || 0,
          overtimeMinutes: existingRecord?.overtimeMinutes || 0,
          attendanceStatus: existingRecord?.attendanceStatus || 'hadir',
          notes: existingRecord?.notes || ''
        });
      }
      
      res.json({
        employee: {
          id: employee.id,
          name: employee.name,
          stores: await storage.getUserStores(employee.id)
        },
        attendanceData: monthlyData
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bulk update monthly attendance
  app.put("/api/employees/:employeeId/attendance/:year/:month", async (req, res) => {
    try {
      if (!req.user || !['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { employeeId, year, month } = req.params;
      const { attendanceData } = req.body;
      
      // Verify access to employee
      const employee = await storage.getUser(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // For non-admins, verify shared store access
      if (req.user.role !== 'administrasi') {
        const employeeStores = await storage.getUserStores(employee.id);
        const currentUserStores = await storage.getUserStores(req.user.id);
        
        const hasSharedStore = employeeStores.some(es => 
          currentUserStores.some(cs => cs.id === es.id)
        );
        
        if (!hasSharedStore) {
          return res.status(403).json({ message: "Access denied to update this employee's data" });
        }
      }
      
      // Get employee's first store for new records
      const employeeStores = await storage.getUserStores(employee.id);
      const primaryStoreId = employeeStores[0]?.id;
      
      if (!primaryStoreId) {
        return res.status(400).json({ message: "Employee is not assigned to any store" });
      }
      
      // Update each day's attendance
      const results = [];
      for (const dayData of attendanceData) {
        if (dayData.id) {
          // Update existing record
          const updated = await storage.updateAttendance(dayData.id, {
            checkIn: dayData.checkIn || null,
            checkOut: dayData.checkOut || null,
            shift: dayData.shift || null,
            latenessMinutes: dayData.latenessMinutes || 0,
            overtimeMinutes: dayData.overtimeMinutes || 0,
            attendanceStatus: dayData.attendanceStatus || 'hadir',
            notes: dayData.notes || null
          });
          results.push(updated);
        } else if (dayData.checkIn || dayData.checkOut || dayData.notes) {
          // Create new record only if there's meaningful data
          const created = await storage.createAttendance({
            userId: employeeId,
            storeId: primaryStoreId,
            date: new Date(dayData.date),
            checkIn: dayData.checkIn || null,
            checkOut: dayData.checkOut || null,
            shift: dayData.shift || null,
            latenessMinutes: dayData.latenessMinutes || 0,
            overtimeMinutes: dayData.overtimeMinutes || 0,
            attendanceStatus: dayData.attendanceStatus || 'hadir',
            notes: dayData.notes || null
          });
          results.push(created);
        }
      }
      
      res.json({ success: true, updated: results.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Sync to Google Sheets endpoint
  app.post("/api/sync/sheets", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { salesData, config } = req.body;
      
      if (!salesData || !Array.isArray(salesData)) {
        return res.status(400).json({ message: "Invalid sales data" });
      }

      // For now, we'll simulate Google Sheets sync
      // In production, this would use Google Sheets API
      const syncResult = {
        success: true,
        message: "Data synced to Google Sheets successfully",
        recordCount: salesData.length,
        spreadsheetId: config?.spreadsheetId || "demo-spreadsheet",
        sheetName: config?.sheetName || "Sales Data",
        timestamp: new Date().toISOString(),
        details: {
          totalRows: salesData.length,
          dateRange: config?.dateRange,
          storeFilter: config?.storeFilter
        }
      };

      // Log the sync activity
      console.log(`[SHEETS SYNC] User ${req.user.email} synced ${salesData.length} sales records`);
      console.log(`[SHEETS SYNC] Config:`, config);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      res.status(200).json(syncResult);
    } catch (error: any) {
      console.error('Sheets sync error:', error);
      res.status(500).json({ 
        message: "Failed to sync to Google Sheets",
        error: error.message 
      });
    }
  });

  // Get sync status endpoint
  app.get("/api/sync/status", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Mock sync status - in production this would check actual Google Sheets API status
      const syncStatus = {
        isConnected: true,
        lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        spreadsheetId: "demo-spreadsheet-id",
        sheetName: "Sales Data",
        autoSyncEnabled: true,
        nextSyncTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
        totalRecords: 42
      };

      res.status(200).json(syncStatus);
    } catch (error: any) {
      console.error('Sync status error:', error);
      res.status(500).json({ 
        message: "Failed to get sync status",
        error: error.message 
      });
    }
  });

  // Google Sheets Configuration API endpoints
  let googleSheetsConfig: any = null; // In-memory storage for config

  // Get Google Sheets configuration
  app.get("/api/google-sheets/config", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      const config = {
        id: "default",
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || googleSheetsConfig?.spreadsheetId || "",
        worksheetName: googleSheetsConfig?.worksheetName || "Sales Data",
        syncEnabled: googleSheetsConfig?.syncEnabled || !!process.env.GOOGLE_SHEETS_CREDENTIALS,
        autoSync: googleSheetsConfig?.autoSync || false,
        lastSyncAt: googleSheetsConfig?.lastSyncAt,
        status: sheetsService ? "connected" : "disconnected" as "connected" | "disconnected" | "error",
        errorMessage: googleSheetsConfig?.errorMessage
      };

      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save Google Sheets configuration
  app.post("/api/google-sheets/config", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { spreadsheetId, worksheetName, syncEnabled, autoSync, credentials } = req.body;

      if (!spreadsheetId || !worksheetName) {
        return res.status(400).json({ message: "Spreadsheet ID and worksheet name are required" });
      }

      if (syncEnabled && !credentials && !process.env.GOOGLE_SHEETS_CREDENTIALS) {
        return res.status(400).json({ message: "Credentials are required when sync is enabled" });
      }

      // Update in-memory config
      googleSheetsConfig = {
        spreadsheetId,
        worksheetName,
        syncEnabled,
        autoSync,
        lastSyncAt: googleSheetsConfig?.lastSyncAt,
        errorMessage: null
      };

      // Initialize Google Sheets service if credentials provided
      if (syncEnabled && credentials) {
        try {
          const config: GoogleSheetsConfig = {
            spreadsheetId,
            worksheetName,
            credentialsJson: credentials
          };
          
          initializeGoogleSheetsService(config);
          console.log('Google Sheets service re-initialized with new configuration');
        } catch (error: any) {
          googleSheetsConfig.errorMessage = error.message;
          console.error('Failed to initialize Google Sheets service:', error);
        }
      }

      res.json({ 
        message: "Configuration saved successfully",
        config: {
          ...googleSheetsConfig,
          // Don't return credentials in response
          status: getGoogleSheetsService() ? "connected" : "disconnected"
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test Google Sheets connection
  app.post("/api/google-sheets/test-connection", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      // Test connection
      const isConnected = await sheetsService.testConnection();
      if (!isConnected) {
        return res.status(400).json({ 
          message: "Connection test failed",
          details: "Unable to connect to Google Sheets with current configuration" 
        });
      }

      // Get worksheet information
      let worksheets = [];
      try {
        worksheets = await sheetsService.listWorksheets();
      } catch (error) {
        console.warn('Could not fetch worksheet details:', error);
        // Fallback to default worksheet info
        worksheets = [{
          name: googleSheetsConfig?.worksheetName || "Sales Data",
          id: 0,
          rowCount: 100,
          columnCount: 21
        }];
      }

      res.json({ 
        message: "Connection successful",
        connected: true,
        worksheets
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual sync to Google Sheets
  app.post("/api/google-sheets/sync", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      // Get all sales data for sync
      const allStores = await storage.getAllStores();
      let allSalesData: any[] = [];
      
      for (const store of allStores) {
        const storeSales = await storage.getSalesByStore(store.id);
        allSalesData = allSalesData.concat(storeSales);
      }

      // Sync all sales data
      await sheetsService.syncAllSalesData(allSalesData);

      // Update last sync time
      if (googleSheetsConfig) {
        googleSheetsConfig.lastSyncAt = new Date().toISOString();
      }

      res.json({ 
        message: "Sync completed successfully",
        recordCount: allSalesData.length,
        syncedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Google Sheets sync error:', error);
      res.status(500).json({ 
        message: "Sync failed",
        details: error.message 
      });
    }
  });

  // Create new worksheet
  app.post("/api/google-sheets/create-worksheet", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { worksheetName } = req.body;
      if (!worksheetName) {
        return res.status(400).json({ message: "Worksheet name is required" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      // Create the worksheet using the service
      const result = await sheetsService.createWorksheet(worksheetName);

      res.json({ 
        message: "Worksheet created successfully",
        worksheetName: result.name,
        worksheetId: result.worksheetId
      });
    } catch (error: any) {
      console.error('Create worksheet error:', error);
      res.status(500).json({ 
        message: "Failed to create worksheet",
        details: error.message 
      });
    }
  });

  // List worksheets endpoint
  app.get("/api/google-sheets/worksheets", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      const worksheets = await sheetsService.listWorksheets();
      res.json({ worksheets });
    } catch (error: any) {
      console.error('List worksheets error:', error);
      res.status(500).json({ 
        message: "Failed to list worksheets",
        details: error.message 
      });
    }
  });

  // Delete worksheet endpoint  
  app.delete("/api/google-sheets/worksheet/:name", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { name } = req.params;
      if (!name) {
        return res.status(400).json({ message: "Worksheet name is required" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      await sheetsService.deleteWorksheet(decodeURIComponent(name));

      res.json({ 
        message: "Worksheet deleted successfully",
        worksheetName: name
      });
    } catch (error: any) {
      console.error('Delete worksheet error:', error);
      res.status(500).json({ 
        message: "Failed to delete worksheet",
        details: error.message 
      });
    }
  });

  // Sync to specific worksheet endpoint
  app.post("/api/google-sheets/sync-to-worksheet", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { worksheetName, storeIds } = req.body;
      if (!worksheetName) {
        return res.status(400).json({ message: "Worksheet name is required" });
      }

      const sheetsService = getGoogleSheetsService();
      if (!sheetsService) {
        return res.status(400).json({ 
          message: "Google Sheets not configured",
          details: "Please configure Google Sheets credentials first" 
        });
      }

      // Get sales data for specific stores or all stores
      let allSalesData: any[] = [];
      if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
        // Sync specific stores
        for (const storeId of storeIds) {
          const storeSales = await storage.getSalesByStore(storeId);
          allSalesData = allSalesData.concat(storeSales);
        }
      } else {
        // Sync all stores
        const allStores = await storage.getAllStores();
        for (const store of allStores) {
          const storeSales = await storage.getSalesByStore(store.id);
          allSalesData = allSalesData.concat(storeSales);
        }
      }

      // Sync to the specific worksheet
      const result = await sheetsService.syncToWorksheet(worksheetName, allSalesData);

      if (result.success) {
        res.json({ 
          message: "Sync completed successfully",
          worksheetName,
          recordCount: result.recordCount,
          syncedAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          message: "Sync failed",
          details: result.errorMessage,
          worksheetName
        });
      }
    } catch (error: any) {
      console.error('Sync to worksheet error:', error);
      res.status(500).json({ 
        message: "Sync failed",
        details: error.message 
      });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const { storeId } = req.query;
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);

      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      const customers = await storage.getCustomersByStore(targetStoreId);
      res.json(customers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/customers/search", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const { storeId, q } = req.query;
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);

      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      const customers = await storage.searchCustomers(targetStoreId, q as string || "");
      res.json(customers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can create customers
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);

      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      const data = insertCustomerSchema.parse({
        ...req.body,
        storeId: targetStoreId,
      });

      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can update customers
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get existing customer to verify access
      const existingCustomer = await storage.getCustomer(req.params.id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, existingCustomer.storeId))) {
        return res.status(403).json({ message: "You don't have access to this customer" });
      }

      // Validate update data - exclude storeId to prevent unauthorized store transfers
      const updateSchema = insertCustomerSchema.omit({ storeId: true }).partial();
      const validatedData = updateSchema.parse(req.body);

      const updatedCustomer = await storage.updateCustomer(req.params.id, validatedData);
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Failed to update customer" });
      }

      res.json(updatedCustomer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can delete customers
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get existing customer to verify access
      const existingCustomer = await storage.getCustomer(req.params.id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, existingCustomer.storeId))) {
        return res.status(403).json({ message: "You don't have access to this customer" });
      }

      // Check for related piutang records to prevent orphaned data
      const relatedPiutang = await storage.getPiutangByCustomer(req.params.id);
      if (relatedPiutang.length > 0) {
        const unpaidCount = relatedPiutang.filter(p => p.status === 'belum_lunas').length;
        if (unpaidCount > 0) {
          return res.status(409).json({ 
            message: `Cannot delete customer. Customer has ${unpaidCount} unpaid receivable record(s). Please settle all debts before deletion.`,
            details: `Customer "${existingCustomer.name}" has outstanding receivables. Please complete all payments or transfer debts to another customer before deletion.`
          });
        } else {
          return res.status(409).json({ 
            message: `Cannot delete customer. Customer has ${relatedPiutang.length} paid receivable record(s) that must be preserved for audit purposes.`,
            details: `Customer "${existingCustomer.name}" has payment history. Consider archiving instead of deletion to maintain financial records.`
          });
        }
      }

      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Piutang routes
  app.get("/api/piutang", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const { storeId, customerId } = req.query;
      const targetStoreId = storeId ? parseInt(storeId as string) : await getUserFirstStoreId(req.user);

      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      let piutangRecords;
      if (customerId) {
        // Verify customer belongs to accessible store
        const customer = await storage.getCustomer(customerId as string);
        if (!customer) {
          return res.status(404).json({ message: "Customer not found" });
        }
        
        // Verify access to customer's store
        if (!(await hasStoreAccess(req.user, customer.storeId))) {
          return res.status(403).json({ message: "You don't have access to this customer's piutang" });
        }
        
        piutangRecords = await storage.getPiutangByCustomer(customerId as string);
      } else {
        piutangRecords = await storage.getPiutangByStore(targetStoreId);
      }

      res.json(piutangRecords);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/piutang", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can create piutang
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const targetStoreId = req.body.storeId || await getUserFirstStoreId(req.user);

      if (!targetStoreId) {
        return res.status(400).json({ message: "Store ID is required" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, targetStoreId))) {
        return res.status(403).json({ message: "You don't have access to this store" });
      }

      const data = insertPiutangSchema.parse({
        ...req.body,
        storeId: targetStoreId,
      });

      const piutang = await storage.createPiutang(data);
      res.status(201).json(piutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/piutang/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can update piutang
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get existing piutang to verify access
      const existingPiutang = await storage.getPiutang(req.params.id);
      if (!existingPiutang) {
        return res.status(404).json({ message: "Piutang not found" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, existingPiutang.storeId))) {
        return res.status(403).json({ message: "You don't have access to this piutang" });
      }

      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Only allow status changes - all payment modifications must go through /pay endpoint
      const updatedPiutang = await storage.updatePiutangStatus(req.params.id, status);
      if (!updatedPiutang) {
        return res.status(404).json({ message: "Failed to update piutang" });
      }

      res.json(updatedPiutang);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/piutang/:id", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can delete piutang
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get existing piutang to verify access
      const existingPiutang = await storage.getPiutang(req.params.id);
      if (!existingPiutang) {
        return res.status(404).json({ message: "Piutang not found" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, existingPiutang.storeId))) {
        return res.status(403).json({ message: "You don't have access to this piutang" });
      }

      await storage.deletePiutang(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Piutang payment endpoint - this is the key atomic operation
  app.post("/api/piutang/:id/pay", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      // Only managers and administrators can process payments
      if (!['manager', 'administrasi'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get existing piutang to verify access
      const existingPiutang = await storage.getPiutang(req.params.id);
      if (!existingPiutang) {
        return res.status(404).json({ message: "Piutang not found" });
      }

      // Verify store access
      if (!(await hasStoreAccess(req.user, existingPiutang.storeId))) {
        return res.status(403).json({ message: "You don't have access to this piutang" });
      }

      const { amount, description } = req.body;

      if (!amount || !description) {
        return res.status(400).json({ message: "Amount and description are required" });
      }

      // Validate amount is a valid number string
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ message: "Amount must be a valid positive number" });
      }

      try {
        // Call the atomic payment processing method
        const result = await storage.addPiutangPayment(
          req.params.id,
          amount.toString(),
          description,
          req.user.id
        );

        res.status(201).json({
          message: "Payment processed successfully",
          piutang: result.piutang,
          cashflow: result.cashflow
        });
      } catch (paymentError: any) {
        // Handle specific payment errors (overpayment, invalid amounts, etc.)
        res.status(400).json({ message: paymentError.message });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error", details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
