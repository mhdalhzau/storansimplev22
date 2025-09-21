import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileDown, FileSpreadsheet, TrendingUp, Upload, Loader2, Eye, Clock, Gauge, CreditCard, Calculator, Trash2, User, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/utils";
import { type Sales } from "@shared/schema";
import { z } from "zod";

// Function to get user name from userId
function getUserNameFromId(userId: string | null, allUsers: any[] = []): string {
  if (!userId) return 'Staff Tidak Diketahui';
  const user = allUsers.find(u => u.id === userId);
  return user?.name || `Staff ${userId.slice(0, 8)}`;
}

// Text Import Modal Component
function TextImportModal({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [textData, setTextData] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Text import mutation
  const importTextMutation = useMutation({
    mutationFn: async (data: { storeId: number; textData: string }) => {
      return await apiRequest('POST', '/api/sales/import-text', data);
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Sales data imported successfully for ${storeName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setTextData("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import sales data",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!textData.trim()) {
      toast({
        title: "Error",
        description: "Please enter text data to import",
        variant: "destructive",
      });
      return;
    }

    importTextMutation.mutate({
      storeId,
      textData: textData.trim()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          data-testid={`button-import-text-store-${storeId}`}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Text ({storeName})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Setoran Harian - {storeName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-text">Paste Setoran Harian Text</Label>
            <Textarea
              id="import-text"
              placeholder={`Setoran Harian 📋
Sabtu, 20 September 2025
🤦‍♀️ Nama: Hafiz
🕐 Jam: (07:00 - 14:00)

⛽ Data Meter
* Nomor Awal : 10
* Nomor Akhir: 20
* Total Liter: 10.00 L

💰 Setoran
* Cash  : Rp 95.000
* QRIS  : Rp 20.000
* Total : Rp 115.000

💸 Pengeluaran (PU)
* makan: Rp 50.000
* minum: Rp 50.000
Total Pengeluaran: Rp 100.000

💵 Pemasukan (PU)
* bg dedi bayar: Rp 100.000
Total Pemasukan: Rp 100.000

💼 Total Keseluruhan: Rp 95.000
07:00 = Jam Masuk
14:00 = Jam Keluar`}
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              rows={15}
              className="w-full"
              data-testid="textarea-import-text"
            />
          </div>
          
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              Paste the complete "Setoran Harian" text above. The system will automatically parse:
              employee name, shift times, meter readings, cash/QRIS amounts, expenses, income, and totals.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            data-testid="button-cancel-import"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={importTextMutation.isPending || !textData.trim()}
            data-testid="button-confirm-import"
          >
            {importTextMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sales Detail Modal Component for single record
function SalesDetailModal({ record }: { record: Sales }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get users data to show staff names
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });
  
  // Delete mutation for sales record
  const deleteSalesMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/sales/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sales record",
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteSales = (id: string) => {
    if (confirm("Are you sure you want to delete this sales record? This action cannot be undone.")) {
      deleteSalesMutation.mutate(id);
    }
  };
  
  // Parse JSON data if available
  const parseJsonData = (jsonString: string | null) => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  const incomeData = parseJsonData(record.incomeDetails || null);
  const expenseData = parseJsonData(record.expenseDetails || null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          data-testid={`button-detail-${record.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detail Penjualan Per Shift
            </div>
            {user && ['manager', 'administrasi'].includes(user.role) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteSales(record.id)}
                disabled={deleteSalesMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
                data-testid={`button-delete-${record.id}`}
              >
                {deleteSalesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {deleteSalesMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Shift Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <User className="h-4 w-4" />
                <span className="font-medium">Nama Staff</span>
              </div>
              <p className="text-lg font-semibold">
                {getUserNameFromId(record.userId, allUsers)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Shift</span>
              </div>
              <p className="text-lg font-semibold capitalize">
                {record.shift || "—"}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Jam Masuk</span>
              </div>
              <p className="text-lg font-semibold">
                {record.checkIn || "—"}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Jam Keluar</span>
              </div>
              <p className="text-lg font-semibold">
                {record.checkOut || "—"}
              </p>
            </div>
          </div>

          {/* Data Meter Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gauge className="h-5 w-5 text-blue-600" />
                Data Meter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Awal</TableHead>
                    <TableHead>Nomor Akhir</TableHead>
                    <TableHead>Total Liter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      {record.meterStart || "0"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.meterEnd || "0"}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {record.totalLiters || "0"} L
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabel Setoran */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
                Setoran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cash</TableHead>
                    <TableHead>QRIS</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-orange-600">
                      {formatRupiah(record.totalCash || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatRupiah(record.totalQris || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {formatRupiah((parseFloat(record.totalCash || "0") + parseFloat(record.totalQris || "0")))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabel PU (Pemasukan/Pengeluaran) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-purple-600" />
                PU (Pemasukan & Pengeluaran)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pemasukan */}
                <div>
                  <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Pemasukan
                  </h4>
                  {incomeData.length > 0 ? (
                    <div className="space-y-2">
                      {incomeData.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                          <span className="font-medium text-green-700">{formatRupiah(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Pemasukan:</span>
                          <span className="text-green-700">{formatRupiah(record.totalIncome || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">Tidak ada data pemasukan</p>
                      <p className="font-medium mt-1">{formatRupiah(record.totalIncome || 0)}</p>
                    </div>
                  )}
                </div>

                {/* Pengeluaran */}
                <div>
                  <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    Pengeluaran
                  </h4>
                  {expenseData.length > 0 ? (
                    <div className="space-y-2">
                      {expenseData.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm">{item.description || item.name || `Item ${index + 1}`}</span>
                          <span className="font-medium text-red-700">{formatRupiah(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Pengeluaran:</span>
                          <span className="text-red-700">{formatRupiah(record.totalExpenses || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">Tidak ada data pengeluaran</p>
                      <p className="font-medium mt-1">{formatRupiah(record.totalExpenses || 0)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Keseluruhan */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Total Keseluruhan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700 mb-2">
                  {formatRupiah(record.totalSales)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total penjualan pada shift ini
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("store-1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Handle tab change to update current store filter
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Get current store ID based on active tab
  const currentStoreId = activeTab === "store-1" ? 1 : 2;

  // Query for sales data with store filtering
  const { data: salesRecords = [], isLoading } = useQuery<Sales[]>({
    queryKey: ["/api/sales", { storeId: currentStoreId }],
  });

  // Get users data to show staff names
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });

  // Filter sales data by store and date range
  // Note: Data is already filtered by store via query key, but we add client-side filtering as fallback
  const filteredSalesRecords = salesRecords.filter(record => {
    // Store filtering (fallback - should already be filtered by query)
    const matchesStore = record.storeId === currentStoreId;
    
    // Date range filtering
    if (!startDate && !endDate) return matchesStore;
    
    const recordDate = new Date(record.date || record.createdAt || '');
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;
    
    const matchesDateRange = 
      (!start || recordDate >= start) && 
      (!end || recordDate <= end);
    
    return matchesStore && matchesDateRange;
  });

  // Calculate totals for current store
  const totalSales = filteredSalesRecords.reduce((sum, record) => 
    sum + parseFloat(record.totalSales || "0"), 0
  );
  const totalCash = filteredSalesRecords.reduce((sum, record) => 
    sum + parseFloat(record.totalCash || "0"), 0
  );
  const totalQris = filteredSalesRecords.reduce((sum, record) => 
    sum + parseFloat(record.totalQris || "0"), 0
  );
  const totalLiters = filteredSalesRecords.reduce((sum, record) => 
    sum + parseFloat(record.totalLiters || "0"), 0
  );

  return (
    <div className="space-y-6">
      {/* Header Card with Store Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Sales Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Store Filter Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="store-1" data-testid="tab-sales-store-1">
                <TrendingUp className="h-4 w-4 mr-2" />
                Main Store (ID: 1)
              </TabsTrigger>
              <TabsTrigger value="store-2" data-testid="tab-sales-store-2">
                <TrendingUp className="h-4 w-4 mr-2" />
                Branch Store (ID: 2)
              </TabsTrigger>
            </TabsList>

            {/* Date Range Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Label htmlFor="start-date">Dari:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-start-date"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date">Sampai:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-end-date"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                data-testid="button-reset-filter"
              >
                <Filter className="h-4 w-4 mr-2" />
                Reset Filter
              </Button>
              
              {/* Store-specific Import Button */}
              <TextImportModal 
                storeId={currentStoreId} 
                storeName={activeTab === "store-1" ? "Main Store" : "Branch Store"} 
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Sales</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatRupiah(totalSales)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {filteredSalesRecords.length} records
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Cash</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatRupiah(totalCash)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Total QRIS</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatRupiah(totalQris)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Gauge className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Liters</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {totalLiters.toLocaleString('id-ID', { maximumFractionDigits: 2 })} L
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Records Table */}
            <TabsContent value="store-1" className="space-y-4">
              <SalesRecordsTable 
                records={filteredSalesRecords} 
                isLoading={isLoading}
                allUsers={allUsers}
                storeLabel="Main Store (ID: 1)"
              />
            </TabsContent>
            
            <TabsContent value="store-2" className="space-y-4">
              <SalesRecordsTable 
                records={filteredSalesRecords} 
                isLoading={isLoading}
                allUsers={allUsers}
                storeLabel="Branch Store (ID: 2)"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to display sales records table
function SalesRecordsTable({ 
  records, 
  isLoading, 
  allUsers = [], 
  storeLabel 
}: { 
  records: Sales[]; 
  isLoading: boolean; 
  allUsers: any[]; 
  storeLabel: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading sales records...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales records found for {storeLabel}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sales Records - {storeLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>QRIS</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {new Date(record.date || record.createdAt || '').toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {getUserNameFromId(record.userId, allUsers)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {record.shift || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">
                    {formatRupiah(record.totalSales)}
                  </TableCell>
                  <TableCell className="text-orange-600">
                    {formatRupiah(record.totalCash || 0)}
                  </TableCell>
                  <TableCell className="text-blue-600">
                    {formatRupiah(record.totalQris || 0)}
                  </TableCell>
                  <TableCell className="text-purple-600">
                    {parseFloat(record.totalLiters || "0").toLocaleString('id-ID', { maximumFractionDigits: 2 })} L
                  </TableCell>
                  <TableCell>
                    <SalesDetailModal record={record} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}