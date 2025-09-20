import { google } from 'googleapis';
import { type SelectSales } from '@shared/schema';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
  credentialsJson: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private config: GoogleSheetsConfig;
  private sheetId: number | null = null;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.initializeSheets();
  }

  private async initializeSheets() {
    try {
      const credentials = JSON.parse(this.config.credentialsJson);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Resolve and cache the sheetId for the worksheet
      await this.resolveSheetId();
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      this.sheets = undefined; // Reset sheets instance on failure
      throw new Error('Google Sheets initialization failed');
    }
  }

  private parseGoogleApiError(error: any): { code: number; message: string } {
    // Parse Google API errors more reliably
    const status = error.response?.status || error.code || 500;
    const message = error.response?.data?.error?.message || error.message || 'Unknown error';
    
    return { code: status, message };
  }

  private async resolveSheetId(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheet = response.data.sheets?.find((s: any) => 
        s.properties?.title === this.config.worksheetName
      );

      if (sheet) {
        this.sheetId = sheet.properties.sheetId;
        console.log(`Found worksheet "${this.config.worksheetName}" with ID: ${this.sheetId}`);
      } else {
        console.warn(`Worksheet "${this.config.worksheetName}" not found, using sheetId: 0`);
        this.sheetId = 0;
      }
    } catch (error) {
      console.error('Failed to resolve sheet ID:', error);
      this.sheetId = 0; // Fallback to first sheet
    }
  }

  async ensureHeadersExist(): Promise<void> {
    try {
      const headers = [
        'ID',
        'Store ID',
        'User ID', 
        'Date',
        'Total Sales',
        'Transactions',
        'Average Ticket',
        'Total QRIS',
        'Total Cash',
        'Meter Start',
        'Meter End',
        'Total Liters',
        'Total Income',
        'Total Expenses',
        'Income Details',
        'Expense Details',
        'Shift',
        'Check In',
        'Check Out',
        'Submission Date',
        'Created At'
      ];

      // Check if headers exist
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A1:U1`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Add headers if they don't exist
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A1:U1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      console.error('Failed to ensure headers exist:', error);
      throw error;
    }
  }

  private formatSalesDataForSheets(sales: SelectSales): (string | number)[] {
    return [
      sales.id || '',
      sales.storeId || '',
      sales.userId || '',
      sales.date ? new Date(sales.date).toISOString() : '',
      parseFloat(sales.totalSales || '0'),
      sales.transactions || 0,
      parseFloat(sales.averageTicket || '0'),
      parseFloat(sales.totalQris || '0'),
      parseFloat(sales.totalCash || '0'),
      parseFloat(sales.meterStart || '0'),
      parseFloat(sales.meterEnd || '0'),
      parseFloat(sales.totalLiters || '0'),
      parseFloat(sales.totalIncome || '0'),
      parseFloat(sales.totalExpenses || '0'),
      sales.incomeDetails || '',
      sales.expenseDetails || '',
      sales.shift || '',
      sales.checkIn || '',
      sales.checkOut || '',
      sales.submissionDate || '',
      sales.createdAt ? new Date(sales.createdAt).toISOString() : ''
    ];
  }

  async appendSalesData(sales: SelectSales): Promise<void> {
    try {
      await this.ensureHeadersExist();
      
      const values = [this.formatSalesDataForSheets(sales)];
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:U`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });
      
      console.log(`Sales data appended to Google Sheets: ${sales.id}`);
    } catch (error) {
      console.error('Failed to append sales data to Google Sheets:', error);
      throw error;
    }
  }

  async updateSalesData(sales: SelectSales): Promise<void> {
    try {
      const rowIndex = await this.findRowIndexBySalesId(sales.id || '');
      
      if (rowIndex !== null) {
        const values = [this.formatSalesDataForSheets(sales)];
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A${rowIndex + 1}:U${rowIndex + 1}`, // +1 because sheet rows are 1-indexed
          valueInputOption: 'RAW',
          resource: {
            values,
          },
        });
        
        console.log(`Sales data updated in Google Sheets: ${sales.id} at row ${rowIndex + 1}`);
      } else {
        console.warn(`Sales ID ${sales.id} not found for update, appending new row instead`);
        await this.appendSalesData(sales);
      }
    } catch (error) {
      console.error('Failed to update sales data in Google Sheets:', error);
      throw error;
    }
  }

  async findRowIndexBySalesId(salesId: string): Promise<number | null> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:A`,
      });

      if (response.data.values) {
        const rowIndex = response.data.values.findIndex((row: string[]) => row[0] === salesId);
        return rowIndex > 0 ? rowIndex : null; // Skip header row (index 0)
      }
      return null;
    } catch (error) {
      console.error('Failed to find row index by sales ID:', error);
      return null;
    }
  }

  async deleteSalesData(salesId: string): Promise<void> {
    try {
      const rowIndex = await this.findRowIndexBySalesId(salesId);
      
      if (rowIndex !== null) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.config.spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: this.sheetId || 0,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            }],
          },
        });
        
        console.log(`Sales data deleted from Google Sheets: ${salesId}`);
      } else {
        console.warn(`Sales ID ${salesId} not found in Google Sheets for deletion`);
      }
    } catch (error) {
      console.error('Failed to delete sales data from Google Sheets:', error);
      throw error;
    }
  }

  async syncAllSalesData(salesData: SelectSales[]): Promise<void> {
    try {
      await this.ensureHeadersExist();
      
      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A2:U`,
      });
      
      if (salesData.length > 0) {
        const values = salesData.map(sales => this.formatSalesDataForSheets(sales));
        
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A2:U`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values,
          },
        });
      }
      
      console.log(`Synced ${salesData.length} sales records to Google Sheets`);
    } catch (error) {
      console.error('Failed to sync all sales data to Google Sheets:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  async listWorksheets(): Promise<Array<{ name: string; id: number; rowCount: number; columnCount: number }>> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return sheets.map(sheet => ({
        name: sheet.properties?.title || 'Untitled',
        id: sheet.properties?.sheetId || 0,
        rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        columnCount: sheet.properties?.gridProperties?.columnCount || 0
      }));
    } catch (error: any) {
      console.error('Failed to list worksheets:', error);
      
      if (error.code === 403) {
        throw new Error('Permission denied. Make sure the service account has view access to this spreadsheet.');
      } else if (error.code === 404) {
        throw new Error('Spreadsheet not found. Please check the spreadsheet ID.');
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw new Error(`Failed to list worksheets: ${error.message}`);
    }
  }

  async createWorksheet(name: string): Promise<{ worksheetId: number; name: string }> {
    try {
      // Validate worksheet name
      if (!name || name.trim().length === 0) {
        throw new Error('Worksheet name cannot be empty');
      }
      
      if (name.length > 100) {
        throw new Error('Worksheet name cannot exceed 100 characters');
      }
      
      // Check for invalid characters (Google Sheets doesn't allow these)
      const invalidChars = /[:\/\\\?\*\[\]]/g;
      if (invalidChars.test(name)) {
        throw new Error('Worksheet name contains invalid characters. Avoid: : / \\ ? * [ ]');
      }

      // Check if worksheet already exists
      const existingSheets = await this.listWorksheets();
      const nameExists = existingSheets.some(sheet => 
        sheet.name.toLowerCase() === name.toLowerCase()
      );
      
      if (nameExists) {
        throw new Error(`Worksheet "${name}" already exists. Please choose a different name.`);
      }

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: name.trim(),
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26
                }
              }
            }
          }]
        }
      });

      const newSheet = response.data.replies?.[0]?.addSheet;
      if (!newSheet) {
        throw new Error('Failed to create worksheet - no response from Google Sheets API');
      }

      const worksheetId = newSheet.properties?.sheetId;
      if (worksheetId === undefined) {
        throw new Error('Failed to create worksheet - no sheet ID returned');
      }

      console.log(`Created worksheet "${name}" with ID: ${worksheetId}`);
      return { worksheetId, name: name.trim() };
    } catch (error: any) {
      console.error('Failed to create worksheet:', error);
      
      // Enhanced error handling with reliable error parsing
      const { code, message } = this.parseGoogleApiError(error);
      
      if (code === 400) {
        if (message?.includes('already exists')) {
          throw new Error(`Worksheet "${name}" already exists. Please choose a different name.`);
        } else if (message?.includes('Invalid requests')) {
          throw new Error(`Invalid worksheet name "${name}". Please use only letters, numbers, and spaces.`);
        }
      } else if (code === 403) {
        throw new Error('Permission denied. Make sure the service account has edit access to this spreadsheet.');
      } else if (code === 404) {
        throw new Error('Spreadsheet not found. Please check the spreadsheet ID and permissions.');
      } else if (code === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw error; // Re-throw if it's our custom error, otherwise create new error
    }
  }

  async switchWorksheet(worksheetName: string): Promise<void> {
    try {
      const worksheets = await this.listWorksheets();
      const targetWorksheet = worksheets.find(ws => 
        ws.name.toLowerCase() === worksheetName.toLowerCase()
      );
      
      if (!targetWorksheet) {
        const availableNames = worksheets.map(ws => ws.name).join(', ');
        throw new Error(
          `Worksheet "${worksheetName}" not found. Available worksheets: ${availableNames || 'None'}`
        );
      }
      
      this.config.worksheetName = targetWorksheet.name;
      this.sheetId = targetWorksheet.id;
      
      console.log(`Switched to worksheet "${targetWorksheet.name}" (ID: ${targetWorksheet.id})`);
    } catch (error: any) {
      console.error('Failed to switch worksheet:', error);
      throw error;
    }
  }

  async deleteWorksheet(worksheetName: string): Promise<void> {
    try {
      const worksheets = await this.listWorksheets();
      const targetWorksheet = worksheets.find(ws => 
        ws.name.toLowerCase() === worksheetName.toLowerCase()
      );
      
      if (!targetWorksheet) {
        throw new Error(`Worksheet "${worksheetName}" not found`);
      }

      // Prevent deletion of the last remaining worksheet
      if (worksheets.length <= 1) {
        throw new Error('Cannot delete the last remaining worksheet in the spreadsheet');
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        resource: {
          requests: [{
            deleteSheet: {
              sheetId: targetWorksheet.id
            }
          }]
        }
      });

      console.log(`Deleted worksheet "${worksheetName}" (ID: ${targetWorksheet.id})`);
    } catch (error: any) {
      console.error('Failed to delete worksheet:', error);
      
      if (error.code === 400) {
        if (error.message?.includes('Cannot delete')) {
          throw new Error('Cannot delete this worksheet. It may be the only worksheet or is protected.');
        }
      } else if (error.code === 403) {
        throw new Error('Permission denied. Make sure the service account has edit access to this spreadsheet.');
      } else if (error.code === 404) {
        throw new Error('Spreadsheet or worksheet not found.');
      }
      
      throw error;
    }
  }

  async syncToWorksheet(worksheetName: string, salesData: SelectSales[]): Promise<{ success: boolean; errorMessage?: string; recordCount: number }> {
    try {
      // Switch to the target worksheet
      const originalWorksheet = this.config.worksheetName;
      await this.switchWorksheet(worksheetName);
      
      try {
        // Sync data to the specific worksheet
        await this.syncAllSalesData(salesData);
        
        console.log(`Successfully synced ${salesData.length} records to worksheet "${worksheetName}"`);
        return { 
          success: true, 
          recordCount: salesData.length 
        };
      } finally {
        // Always switch back to original worksheet
        if (originalWorksheet !== worksheetName) {
          try {
            await this.switchWorksheet(originalWorksheet);
          } catch (switchBackError) {
            console.warn(`Failed to switch back to original worksheet "${originalWorksheet}":`, switchBackError);
          }
        }
      }
    } catch (error: any) {
      console.error(`Failed to sync to worksheet "${worksheetName}":`, error);
      return { 
        success: false, 
        errorMessage: error.message, 
        recordCount: 0 
      };
    }
  }
}

// Singleton instance
let googleSheetsService: GoogleSheetsService | null = null;

export function getGoogleSheetsService(): GoogleSheetsService | null {
  return googleSheetsService;
}

export function initializeGoogleSheetsService(config: GoogleSheetsConfig): GoogleSheetsService {
  googleSheetsService = new GoogleSheetsService(config);
  return googleSheetsService;
}

export function isGoogleSheetsConfigured(): boolean {
  return googleSheetsService !== null;
}