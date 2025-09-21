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
import { FileDown, FileSpreadsheet, TrendingUp, Upload, Loader2, Eye, Clock, Gauge, CreditCard, Calculator, Trash2, User, Wifi, WifiOff, RefreshCw, X, CheckCircle, AlertTriangle, DollarSign, Users, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/utils";
import { type Sales, type Cashflow, type Customer, type Piutang } from "@shared/schema";
import { z } from "zod";
import CashflowContent from "@/components/cashflow/cashflow-content";
import CustomerPage from "@/pages/customer-page";
import PiutangPage from "@/pages/piutang-page";

// Store-filtered Cashflow Component
function StoreCashflowContent({ storeId }: { storeId: number }) {
  const { data: cashflowRecords = [], isLoading } = useQuery<Cashflow[]>({
    queryKey: ["/api/cashflow", { storeId }],
  });

  const filteredRecords = cashflowRecords.filter(record => record.storeId === storeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cash Flow - {storeId === 1 ? "Main Store" : "Branch Store"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading cashflow records...</div>
        ) : filteredRecords && filteredRecords.length > 0 ? (
          <div className="space-y-4">
            {filteredRecords.slice(0, 10).map((entry) => (
              <div 
                key={entry.id} 
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`card-cashflow-${entry.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    entry.category === "Income" 
                      ? "bg-green-100" 
                      : entry.category === "Expense" 
                      ? "bg-red-100" 
                      : "bg-blue-100"
                  }`}>
                    {entry.category === "Income" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {entry.description || `${entry.category} - ${entry.type}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.category} • {entry.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    entry.category === "Income" ? "text-green-600" : "text-red-600"
                  }`}>
                    {entry.category === "Income" ? "+" : "-"}Rp {parseInt(
                      entry.category === "Expense" && entry.totalPengeluaran 
                        ? entry.totalPengeluaran 
                        : entry.amount
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cashflow records found for this store</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Store-filtered Customer Component
function StoreCustomerContent({ storeId }: { storeId: number }) {
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter(customer => customer.storeId === storeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer - {storeId === 1 ? "Main Store" : "Branch Store"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading customers...</div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div className="space-y-4">
            {filteredCustomers.slice(0, 10).map((customer) => (
              <div 
                key={customer.id} 
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`card-customer-${customer.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.email || customer.phone || 'No contact info'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={customer.type === "employee" ? "secondary" : "default"}>
                    {customer.type === "employee" ? "Employee" : "Customer"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No customers found for this store</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Store-filtered Piutang Component
function StorePiutangContent({ storeId }: { storeId: number }) {
  const { data: piutangRecords = [], isLoading } = useQuery<Piutang[]>({
    queryKey: ["/api/piutang"],
  });
  
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredPiutang = piutangRecords.filter(piutang => piutang.storeId === storeId);

  // Group by customer
  const customerPiutangMap = filteredPiutang.reduce((acc, piutang) => {
    const customerId = piutang.customerId;
    if (!acc[customerId]) {
      acc[customerId] = [];
    }
    acc[customerId].push(piutang);
    return acc;
  }, {} as Record<string, Piutang[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Piutang - {storeId === 1 ? "Main Store" : "Branch Store"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading piutang records...</div>
        ) : Object.keys(customerPiutangMap).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(customerPiutangMap).slice(0, 10).map(([customerId, piutangList]) => {
              const customer = customers.find(c => c.id === customerId);
              const totalDebt = piutangList.reduce((sum, p) => sum + parseFloat(p.amount), 0);
              const totalPaid = piutangList.reduce((sum, p) => sum + parseFloat(p.paidAmount || "0"), 0);
              const remainingDebt = totalDebt - totalPaid;
              
              return (
                <div 
                  key={customerId} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`card-piutang-${customerId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Receipt className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{customer?.name || 'Unknown Customer'}</p>
                      <p className="text-sm text-muted-foreground">
                        {piutangList.length} records • Total: {formatRupiah(totalDebt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${remainingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                      Remaining: {formatRupiah(remainingDebt)}
                    </span>
                    <Badge variant={remainingDebt > 0 ? "destructive" : "default"}>
                      {remainingDebt > 0 ? "Outstanding" : "Paid"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No piutang records found for this store</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Function to get user name from userId
function getUserNameFromId(userId: string | null, allUsers: any[] = []): string {
  if (!userId) return 'Staff Tidak Diketahui';
  const user = allUsers.find(u => u.id === userId);
  return user?.name || `Staff ${userId.slice(0, 8)}`;
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

// Multi Sales Detail Modal Component with Tabs for multiple staff
function MultiSalesDetailModal({ records }: { records: Sales[] }) {
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

  // If only one record, show simple modal without tabs
  if (records.length === 1) {
    const record = records[0];
    return <SalesDetailModal record={record} />;
  }

  // Multiple records - show tabs for each staff
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          data-testid={`button-detail-multi-${records[0]?.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          Detail ({records.length} Staff)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detail Penjualan Per Staff - {records[0].storeId === 1 ? "Main Store" : "Branch Store"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={records[0]?.userId || records[0]?.id} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
            {records.map((record) => (
              <TabsTrigger 
                key={record.userId || record.id} 
                value={record.userId || record.id}
                className="text-sm"
                data-testid={`tab-staff-${record.userId}`}
              >
                {getUserNameFromId(record.userId, allUsers)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {records.map((record) => (
            <TabsContent key={record.userId || record.id} value={record.userId || record.id}>
              <StaffSalesContent 
                record={record} 
                onDelete={handleDeleteSales} 
                canDelete={!!(user && ['manager', 'administrasi'].includes(user.role))} 
                isDeleting={deleteSalesMutation.isPending}
                allUsers={allUsers}
              />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Component to display individual staff sales data
function StaffSalesContent({ record, onDelete, canDelete, isDeleting, allUsers }: { 
  record: Sales; 
  onDelete: (id: string) => void;
  canDelete: boolean;
  isDeleting: boolean;
  allUsers?: any[];
}) {
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
    <div className="space-y-6">
      {/* Staff Header with Actions */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getUserNameFromId(record.userId, allUsers)}
            </h3>
            <p className="text-sm text-gray-600">
              Shift {record.shift || "—"} • {record.checkIn || "—"} - {record.checkOut || "—"}
            </p>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(record.id)}
            disabled={isDeleting}
            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 transition-colors"
            data-testid={`button-delete-${record.id}`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isDeleting ? "Menghapus..." : "Hapus Data"}
          </Button>
        )}
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">Total Penjualan</span>
          </div>
          <p className="text-2xl font-bold text-green-800">
            {formatRupiah(record.totalSales)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="font-medium">Total Transaksi</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {record.transactions || 0}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <Calculator className="h-5 w-5" />
            <span className="font-medium">Rata-rata</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">
            {formatRupiah(record.averageTicket || 0)}
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
  );
}

export default function SalesContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: salesRecords, isLoading } = useQuery<Sales[]>({
    queryKey: ["/api/sales", { startDate, endDate, storeId: selectedStore !== "all" ? selectedStore : undefined }],
  });

  // Zod schema for parsed setoran data
  const ParsedSetoranSchema = z.object({
    staffName: z.string().min(1, "Nama staff tidak ditemukan"),
    date: z.string().min(1, "Tanggal tidak ditemukan"),
    jamMasuk: z.string().min(1, "Jam masuk tidak ditemukan"),
    jamKeluar: z.string().min(1, "Jam keluar tidak ditemukan"),
    nomorAwal: z.number().min(0, "Nomor awal meter harus valid"),
    nomorAkhir: z.number().min(0, "Nomor akhir meter harus valid"),
    totalLiter: z.number().min(0, "Total liter harus valid"),
    cashSetoran: z.number().min(0, "Cash setoran harus valid"),
    qrisSetoran: z.number().min(0, "QRIS setoran harus valid"),
    totalSetoran: z.number().min(0, "Total setoran harus valid"),
    expenses: z.array(z.object({
      id: z.string(),
      description: z.string().min(1),
      amount: z.number().min(0)
    })),
    income: z.array(z.object({
      id: z.string(),
      description: z.string().min(1),
      amount: z.number().min(0)
    })),
    totalExpenses: z.number().min(0, "Total pengeluaran harus valid"),
    totalIncome: z.number().min(0, "Total pemasukan harus valid"),
    totalKeseluruhan: z.number("Total keseluruhan harus valid")
  }).refine(data => data.nomorAkhir > data.nomorAwal, {
    message: "Nomor akhir harus lebih besar dari nomor awal",
    path: ["nomorAkhir"]
  });

  // Utility functions for robust parsing
  const normalizeText = (text: string): string => {
    // Remove emojis and normalize spacing
    return text
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseIndonesianNumber = (str: string): number => {
    if (!str) return 0;
    
    // Clean the string: remove "Rp", spaces, and handle Indonesian format
    const cleaned = str
      .replace(/Rp\s*/gi, '')  // Remove "Rp" prefix
      .replace(/\s/g, '')      // Remove spaces
      .replace(/\./g, '')      // Remove thousands separator (dots)
      .replace(/,/g, '.');     // Convert decimal comma to dot
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseIndonesianDate = (dateStr: string): string => {
    const months = {
      'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
      'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
      'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
    };

    // Try multiple date patterns
    const patterns = [
      // "Sabtu, 20 September 2025"
      /(?:\w+,?\s*)?(\d{1,2})\s+(\w+)\s+(\d{4})/i,
      // "20 September 2025"
      /(\d{1,2})\s+(\w+)\s+(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const day = match[1].padStart(2, '0');
        const monthName = match[2].toLowerCase();
        const year = match[3];
        const month = months[monthName as keyof typeof months];
        
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Default to today if no match
    return new Date().toISOString().split('T')[0];
  };

  const extractLineItems = (text: string, sectionName: string): Array<{id: string, description: string, amount: number}> => {
    const items: Array<{id: string, description: string, amount: number}> = [];
    
    // Find section with flexible regex
    const sectionPattern = new RegExp(`${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?Total\\s+[^:]*:\\s*Rp\\s*[\\d,.]+`, 'i');
    const section = text.match(sectionPattern);
    
    if (section) {
      // Extract individual items with flexible pattern
      const itemPattern = /(?:\*|-)?\s*([^:]+?):\s*Rp\s*([\d,.]+)/gi;
      let match;
      let index = 1;
      
      while ((match = itemPattern.exec(section[0])) !== null) {
        const description = match[1].trim();
        const amount = parseIndonesianNumber(match[2]);
        
        if (description && amount > 0) {
          items.push({
            id: `${sectionName.toLowerCase()}_${index}`,
            description,
            amount
          });
          index++;
        }
      }
    }
    
    return items;
  };

  // Enhanced parsing function
  const parseSetoranText = (text: string) => {
    const errors: string[] = [];
    const normalized = normalizeText(text);
    
    const data: any = {
      staffName: "",
      date: "",
      jamMasuk: "",
      jamKeluar: "",
      nomorAwal: 0,
      nomorAkhir: 0,
      totalLiter: 0,
      cashSetoran: 0,
      qrisSetoran: 0,
      totalSetoran: 0,
      expenses: [],
      income: [],
      totalExpenses: 0,
      totalIncome: 0,
      totalKeseluruhan: 0
    };

    try {
      // Extract name with flexible patterns
      const namePatterns = [
        /(?:nama|name)\s*:\s*(.+?)(?:\n|$)/i,
        /Nama:\s*(.+?)(?:\n|$)/i,
        /(.+?)(?:\s*-\s*|\n)/, // Fallback: first line content
      ];
      
      for (const pattern of namePatterns) {
        const match = normalized.match(pattern);
        if (match && match[1].trim()) {
          data.staffName = match[1].trim();
          break;
        }
      }

      // Extract date with flexible parsing
      data.date = parseIndonesianDate(text);

      // Extract time with flexible patterns
      const timePatterns = [
        /(?:jam|waktu|time)\s*:?\s*\(?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)?/i,
        /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/,
      ];
      
      for (const pattern of timePatterns) {
        const match = text.match(pattern);
        if (match) {
          data.jamMasuk = match[1];
          data.jamKeluar = match[2];
          break;
        }
      }

      // Extract meter data with flexible patterns
      const meterPatterns = {
        awal: /(?:nomor\s*awal|awal|start)\s*:?\s*([\d,.]+)/i,
        akhir: /(?:nomor\s*akhir|akhir|end)\s*:?\s*([\d,.]+)/i,
        liter: /(?:total\s*liter|liter)\s*:?\s*([\d,.]+)/i
      };

      const awalMatch = text.match(meterPatterns.awal);
      if (awalMatch) data.nomorAwal = parseIndonesianNumber(awalMatch[1]);

      const akhirMatch = text.match(meterPatterns.akhir);
      if (akhirMatch) data.nomorAkhir = parseIndonesianNumber(akhirMatch[1]);

      const literMatch = text.match(meterPatterns.liter);
      if (literMatch) {
        data.totalLiter = parseIndonesianNumber(literMatch[1]);
      } else {
        // Calculate if not provided
        data.totalLiter = Math.max(0, data.nomorAkhir - data.nomorAwal);
      }

      // Extract setoran data with flexible patterns
      const cashMatch = text.match(/(?:cash|tunai)\s*:?\s*Rp\s*([\d,.]+)/i);
      if (cashMatch) data.cashSetoran = parseIndonesianNumber(cashMatch[1]);

      const qrisMatch = text.match(/(?:qris|digital)\s*:?\s*Rp\s*([\d,.]+)/i);
      if (qrisMatch) data.qrisSetoran = parseIndonesianNumber(qrisMatch[1]);

      const totalMatch = text.match(/(?:total.*setoran|total)\s*:?\s*Rp\s*([\d,.]+)/i);
      if (totalMatch) {
        data.totalSetoran = parseIndonesianNumber(totalMatch[1]);
      } else {
        // Calculate if not provided
        data.totalSetoran = data.cashSetoran + data.qrisSetoran;
      }

      // Extract expenses and income with enhanced parsing
      data.expenses = extractLineItems(text, 'Pengeluaran');
      data.income = extractLineItems(text, 'Pemasukan');

      // Calculate totals
      data.totalExpenses = data.expenses.reduce((sum: number, item: any) => sum + item.amount, 0);
      data.totalIncome = data.income.reduce((sum: number, item: any) => sum + item.amount, 0);

      // Extract or calculate total keseluruhan
      const keseluruhanMatch = text.match(/(?:total\s*keseluruhan|grand\s*total)\s*:?\s*Rp\s*([\d,.]+)/i);
      if (keseluruhanMatch) {
        data.totalKeseluruhan = parseIndonesianNumber(keseluruhanMatch[1]);
      } else {
        // Calculate: Cash + Income - Expenses
        data.totalKeseluruhan = data.cashSetoran + data.totalIncome - data.totalExpenses;
      }

      // Validate parsed data using Zod schema
      const validation = ParsedSetoranSchema.safeParse(data);
      if (!validation.success) {
        validation.error.errors.forEach(err => {
          errors.push(`${err.path.join('.')}: ${err.message}`);
        });
      }

      if (errors.length > 0) {
        throw new Error(`Validation errors: ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('Error parsing setoran text:', error);
      throw error;
    }

    return data;
  };

  // Import mutation for creating sales from setoran text
  const importMutation = useMutation({
    mutationFn: async (setoranData: any) => {
      // Find user by name
      const allUsers = await apiRequest("GET", "/api/users").then(res => res.json());
      const user = allUsers.find((u: any) => u.name.toLowerCase().includes(setoranData.staffName.toLowerCase()));
      
      if (!user) {
        throw new Error(`Staff dengan nama "${setoranData.staffName}" tidak ditemukan`);
      }

      // Prepare sales data
      const salesData = {
        storeId: parseInt(selectedStore) || 1,
        userId: user.id,
        date: setoranData.date || new Date().toISOString().split('T')[0],
        totalSales: setoranData.totalSetoran.toString(),
        transactions: 1,
        averageTicket: setoranData.totalSetoran.toString(),
        totalQris: setoranData.qrisSetoran.toString(),
        totalCash: setoranData.cashSetoran.toString(),
        meterStart: setoranData.nomorAwal.toString(),
        meterEnd: setoranData.nomorAkhir.toString(),
        totalLiters: setoranData.totalLiter.toString(),
        totalIncome: setoranData.totalIncome.toString(),
        totalExpenses: setoranData.totalExpenses.toString(),
        incomeDetails: JSON.stringify(setoranData.income),
        expenseDetails: JSON.stringify(setoranData.expenses),
        shift: setoranData.jamMasuk ? (
          setoranData.jamMasuk < '14:00' ? 'pagi' : 
          setoranData.jamMasuk < '22:00' ? 'siang' : 'malam'
        ) : 'pagi',
        checkIn: setoranData.jamMasuk,
        checkOut: setoranData.jamKeluar,
        submissionDate: `${setoranData.date}-${user.id}-${selectedStore || '1'}`
      };

      const res = await apiRequest("POST", "/api/sales", salesData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setIsImportModalOpen(false);
      setImportText("");
      toast({
        title: "✅ Import Berhasil!",
        description: "Data setoran berhasil diimport ke sales report",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Import Gagal",
        description: error.message || "Gagal mengimport data setoran",
        variant: "destructive",
      });
    },
  });

  // Function to parse and preview data
  const handleParseText = () => {
    if (!importText.trim()) {
      toast({
        title: "❌ Text Kosong",
        description: "Silakan paste format setoran harian",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = parseSetoranText(importText);
      setParsedData(parsed);
      setShowPreview(true);
      setValidationErrors([]);
      
      toast({
        title: "✅ Parsing Berhasil",
        description: "Data berhasil diparse. Silakan review sebelum import.",
      });
    } catch (error: any) {
      setValidationErrors([error.message]);
      toast({
        title: "❌ Error Parsing",
        description: error.message || "Format setoran tidak valid",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportSetoran = async () => {
    if (!parsedData) {
      toast({
        title: "❌ No Data",
        description: "Silakan parse data terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await importMutation.mutateAsync(parsedData);
    } catch (error: any) {
      toast({
        title: "❌ Import Gagal",
        description: error.message || "Gagal mengimport data setoran",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setIsImportModalOpen(false);
    setImportText("");
    setParsedData(null);
    setShowPreview(false);
    setValidationErrors([]);
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export/pdf?" + new URLSearchParams({
        startDate,
        endDate,
        storeId: selectedStore !== "all" ? selectedStore : "",
      }));
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "PDF exported successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/export/excel?" + new URLSearchParams({
        startDate,
        endDate,
        storeId: selectedStore !== "all" ? selectedStore : "",
      }));
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-report.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Excel exported successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  // Google Sheets sync functionality
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => {
    return localStorage.getItem('sheetsSync') === 'enabled';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('lastSyncTime') || null;
  });

  // Query for Google Sheets status
  const { data: sheetsStatus } = useQuery({
    queryKey: ['/api/sales/sheets-status'],
    enabled: ['manager', 'administrasi'].includes(user?.role || ''),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for syncing to Google Sheets
  const syncToSheetsMutation = useMutation({
    mutationFn: async (data: { storeId?: string; startDate?: string; endDate?: string }) => {
      return await apiRequest("POST", "/api/sales/sync-to-sheets", data);
    },
    onSuccess: () => {
      const now = new Date().toLocaleString('id-ID');
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now);
      
      toast({
        title: "Sync Berhasil! ✅",
        description: "Data berhasil disync ke Google Sheets",
      });
      setIsSyncing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Gagal ❌",
        description: error.message || "Gagal sync ke Google Sheets",
        variant: "destructive",
      });
      setIsSyncing(false);
    },
  });

  const handleSyncToSheets = async () => {
    if (!salesRecords || salesRecords.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data sales untuk di-sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    
    syncToSheetsMutation.mutate({
      storeId: selectedStore !== "all" ? selectedStore : undefined,
      startDate,
      endDate
    });
  };

  const handleExportCSV = () => {
    if (!salesRecords || salesRecords.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    // Convert sales data to CSV format
    const csvHeaders = [
      'Tanggal',
      'Store',
      'Staff',
      'Shift',
      'Jam Masuk',
      'Jam Keluar',
      'Total Sales (Rp)',
      'Cash (Rp)',
      'QRIS (Rp)',
      'Jumlah Transaksi',
      'Rata-rata per Transaksi (Rp)',
      'Meter Awal',
      'Meter Akhir',
      'Total Liter',
      'Total Pemasukan (Rp)',
      'Total Pengeluaran (Rp)'
    ];

    const csvRows = salesRecords.map(record => [
      new Date(record.date || '').toLocaleDateString('id-ID'),
      record.storeId === 1 ? 'Main Store' : 'Branch Store',
      getUserNameFromId(record.userId, allUsers),
      record.shift || '',
      record.checkIn || '',
      record.checkOut || '',
      record.totalSales || '0',
      record.totalCash || '0',
      record.totalQris || '0',
      record.transactions || '0',
      record.averageTicket || '0',
      record.meterStart || '0',
      record.meterEnd || '0',
      record.totalLiters || '0',
      record.totalIncome || '0',
      record.totalExpenses || '0'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    const now = new Date().toLocaleString('id-ID');
    setLastSyncTime(now);
    localStorage.setItem('lastSyncTime', now);

    toast({
      title: "Export Berhasil! 📊",
      description: "File CSV siap diimport ke Google Sheets",
    });
  };

  const toggleSync = () => {
    const newState = !isSyncEnabled;
    setIsSyncEnabled(newState);
    localStorage.setItem('sheetsSync', newState ? 'enabled' : 'disabled');
    
    toast({
      title: newState ? "Sync Diaktifkan" : "Sync Dinonaktifkan",
      description: newState ? "Auto-sync ke spreadsheet aktif" : "Auto-sync dimatikan",
    });
  };

  // Get users data for CSV export
  const { data: allUsers } = useQuery<any[]>({ queryKey: ['/api/users'] });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Reports
          </CardTitle>
        </div>
        
        {/* Store-based tabs for Sales Reports and Cashflow */}
        <Tabs defaultValue="store-1" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="store-1" data-testid="tab-store-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Main Store (ID: 1)
            </TabsTrigger>
            <TabsTrigger value="store-2" data-testid="tab-store-2">
              <DollarSign className="h-4 w-4 mr-2" />
              Branch Store (ID: 2)
            </TabsTrigger>
          </TabsList>
          
          {/* Main Store Content */}
          <TabsContent value="store-1" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Main Store - Sales Reports & Cash Flow</h3>
            </div>
            
            {/* Sales Reports Section */}
            <div className="space-y-4">
              <h4 className="text-md font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sales Reports
              </h4>
            <div className="flex gap-3">
              <Input
                type="date"
                placeholder="Start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                data-testid="input-start-date"
              />
              <Input
                type="date"
                placeholder="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                data-testid="input-end-date"
              />
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    data-testid="button-import-setoran"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Setoran
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import dari Format Setoran Harian</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {!showPreview ? (
                    // Text input section
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="import-text" className="text-base font-medium">
                          Paste Format Setoran Harian
                        </Label>
                        <p className="text-sm text-gray-600 mb-2">
                          Paste format setoran harian seperti: "Setoran Harian 📋, Sabtu, 20 September 2025..."
                        </p>
                        <Textarea
                          id="import-text"
                          placeholder="Paste format setoran harian disini..."
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          className="min-h-[300px] font-mono text-sm"
                          data-testid="textarea-import-setoran"
                        />
                      </div>
                      
                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Errors ditemukan:</strong>
                            <ul className="mt-1 list-disc pl-4">
                              {validationErrors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Format yang didukung:</strong><br/>
                          • Nama staff harus sudah terdaftar di sistem<br/>
                          • Format tanggal fleksibel: "Sabtu, 20 September 2025" atau "20 September 2025"<br/>
                          • Format jam: "(07:00 - 14:00)" atau "07:00 - 14:00"<br/>
                          • Format rupiah: "Rp 95.000" atau "Rp 95,000"<br/>
                          • Data meter, setoran (Cash/QRIS), pengeluaran dan pemasukan
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Preview section
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Preview Data Parsed</h3>
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowPreview(false);
                            setParsedData(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Edit Text
                        </Button>
                      </div>

                      {parsedData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Basic Info */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium">Informasi Dasar</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Staff:</span>
                                <span className="text-sm font-medium">{parsedData.staffName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Tanggal:</span>
                                <span className="text-sm font-medium">{parsedData.date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Jam:</span>
                                <span className="text-sm font-medium">{parsedData.jamMasuk} - {parsedData.jamKeluar}</span>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Meter Data */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium">Data Meter</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Nomor Awal:</span>
                                <span className="text-sm font-medium">{parsedData.nomorAwal}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Nomor Akhir:</span>
                                <span className="text-sm font-medium">{parsedData.nomorAkhir}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Liter:</span>
                                <span className="text-sm font-medium">{parsedData.totalLiter} L</span>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Setoran Data */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium">Data Setoran</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Cash:</span>
                                <span className="text-sm font-medium">{formatRupiah(parsedData.cashSetoran)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">QRIS:</span>
                                <span className="text-sm font-medium">{formatRupiah(parsedData.qrisSetoran)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total:</span>
                                <span className="text-sm font-medium text-green-600">{formatRupiah(parsedData.totalSetoran)}</span>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Financial Summary */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium">Ringkasan Keuangan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Pengeluaran:</span>
                                <span className="text-sm font-medium text-red-600">{formatRupiah(parsedData.totalExpenses)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Pemasukan:</span>
                                <span className="text-sm font-medium text-green-600">{formatRupiah(parsedData.totalIncome)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-sm font-medium">Total Keseluruhan:</span>
                                <span className="text-sm font-bold text-blue-600">{formatRupiah(parsedData.totalKeseluruhan)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Expenses and Income Details */}
                      {parsedData && (parsedData.expenses.length > 0 || parsedData.income.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {parsedData.expenses.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-red-600">Detail Pengeluaran</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-1">
                                  {parsedData.expenses.map((expense: any, index: number) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span className="truncate mr-2">{expense.description}</span>
                                      <span className="font-medium">{formatRupiah(expense.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {parsedData.income.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-green-600">Detail Pemasukan</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-1">
                                  {parsedData.income.map((income: any, index: number) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span className="truncate mr-2">{income.description}</span>
                                      <span className="font-medium">{formatRupiah(income.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Data berhasil diparse!</strong> Silakan review data di atas dan klik "Import ke Sales" jika sudah benar.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={resetModal}
                    disabled={isProcessing}
                    data-testid="button-cancel-import"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                  
                  {!showPreview ? (
                    <Button
                      onClick={handleParseText}
                      disabled={isProcessing || !importText.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-parse-text"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Parse & Preview
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleImportSetoran}
                      disabled={isProcessing || !parsedData}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-import-to-sales"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import ke Sales
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="text-red-600 border-red-200 hover:bg-red-50"
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="text-green-600 border-green-200 hover:bg-green-50"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncToSheets}
              disabled={isSyncing}
              className={`${isSyncEnabled ? 'text-purple-600 border-purple-200 hover:bg-purple-50' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              data-testid="button-sync-sheets"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isSyncEnabled ? (
                <Wifi className="h-4 w-4 mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? "Syncing..." : "Sync to Sheets"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSync}
              className={`${isSyncEnabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
              data-testid="button-toggle-sync"
              title={isSyncEnabled ? "Disable auto-sync" : "Enable auto-sync"}
            >
              {isSyncEnabled ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </Button>
          </div>
          
          {lastSyncTime && (
            <div className="text-xs text-gray-500 mt-2">
              Last sync: {lastSyncTime}
            </div>
          )}

              {/* Sales Table Content for Main Store */}
              {isLoading ? (
                <div className="text-center py-8">Loading sales records...</div>
              ) : salesRecords && salesRecords.filter(record => record.storeId === 1).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Hari Ini</TableHead>
                        <TableHead>Total Liter</TableHead>
                        <TableHead>Total Penjualan</TableHead>
                        <TableHead>Total QRIS</TableHead>
                        <TableHead>Total Cash</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesRecords.filter(record => record.storeId === 1).map((record) => {
                        const recordDate = record.date ? new Date(record.date) : new Date();
                        const today = new Date();
                        const isToday = recordDate.toDateString() === today.toDateString();
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {recordDate.toLocaleDateString('id-ID', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </TableCell>
                            <TableCell>
                              {isToday ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Hari Ini
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                               {record.totalLiters || "0"} L
                            </TableCell>
                            <TableCell className="font-semibold text-green-700">
                              {formatRupiah(record.totalSales)}
                            </TableCell>
                            <TableCell className="text-blue-600">
                              {formatRupiah(record.totalQris || 0)}
                            </TableCell>
                            <TableCell className="text-orange-600">
                              {formatRupiah(record.totalCash || 0)}
                            </TableCell>
                            <TableCell>
                              <MultiSalesDetailModal records={[record]} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales records found for Main Store</p>
                  <p className="text-sm">Try adjusting your filters or date range</p>
                </div>
              )}
              
              {/* Cash Flow Section for Main Store */}
              <div className="mt-8 space-y-4">
                <h4 className="text-md font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cash Flow
                </h4>
                <StoreCashflowContent storeId={1} />
              </div>
            </div>
        </TabsContent>

          {/* Branch Store Content */}
          <TabsContent value="store-2" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Branch Store - Sales Reports & Cash Flow</h3>
            </div>
            
            {/* Sales Reports Section */}
            <div className="space-y-4">
              <h4 className="text-md font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sales Reports
              </h4>
              
              <div className="flex gap-3">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-start-date-store-2"
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-end-date-store-2"
                />
                <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      data-testid="button-import-setoran-store-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import from Setoran
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Import dari Format Setoran Harian - Branch Store</DialogTitle>
                    </DialogHeader>
                    {/* Same import dialog content as store 1 */}
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  data-testid="button-export-pdf-store-2"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  data-testid="button-export-excel-store-2"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
              
              {lastSyncTime && (
                <div className="text-xs text-gray-500 mt-2">
                  Last sync: {lastSyncTime}
                </div>
              )}

              {/* Sales Table Content for Branch Store */}
              {isLoading ? (
                <div className="text-center py-8">Loading sales records...</div>
              ) : salesRecords && salesRecords.filter(record => record.storeId === 2).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Hari Ini</TableHead>
                        <TableHead>Total Liter</TableHead>
                        <TableHead>Total Penjualan</TableHead>
                        <TableHead>Total QRIS</TableHead>
                        <TableHead>Total Cash</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesRecords.filter(record => record.storeId === 2).map((record) => {
                        const recordDate = record.date ? new Date(record.date) : new Date();
                        const today = new Date();
                        const isToday = recordDate.toDateString() === today.toDateString();
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {recordDate.toLocaleDateString('id-ID', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </TableCell>
                            <TableCell>
                              {isToday ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Hari Ini
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                               {record.totalLiters || "0"} L
                            </TableCell>
                            <TableCell className="font-semibold text-green-700">
                              {formatRupiah(record.totalSales)}
                            </TableCell>
                            <TableCell className="text-blue-600">
                              {formatRupiah(record.totalQris || 0)}
                            </TableCell>
                            <TableCell className="text-orange-600">
                              {formatRupiah(record.totalCash || 0)}
                            </TableCell>
                            <TableCell>
                              <MultiSalesDetailModal records={[record]} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales records found for Branch Store</p>
                  <p className="text-sm">Try adjusting your filters or date range</p>
                </div>
              )}
              
              {/* Cash Flow Section for Branch Store */}
              <div className="mt-8 space-y-4">
                <h4 className="text-md font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cash Flow
                </h4>
                <StoreCashflowContent storeId={2} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
