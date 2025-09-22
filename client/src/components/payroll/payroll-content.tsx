import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";
import { type Payroll, type User } from "@shared/schema";
import { Wallet, DollarSign, CheckCircle2, FileText, Clock, Calendar, Printer, Plus, Minus } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

interface PayrollWithUser extends Payroll {
  user?: User;
  store?: { id: number; name: string };
  bonusList?: Array<{name: string; amount: number}>;
  deductionList?: Array<{name: string; amount: number}>;
}

export default function PayrollContent() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newBonus, setNewBonus] = useState({ name: '', amount: 0 });
  const [newDeduction, setNewDeduction] = useState({ name: '', amount: 0 });

  const { data: payrollRecords, isLoading } = useQuery<PayrollWithUser[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: stores } = useQuery<Array<{id: number; name: string}>>({
    queryKey: ["/api/stores"],
  });

  // Process payroll data to include related user and store info first
  const processedRecords = payrollRecords?.map(record => {
    const user = users?.find(u => u.id === record.userId);
    const store = stores?.find(s => s.id === record.storeId);
    let bonusList = [];
    let deductionList = [];
    
    try {
      bonusList = record.bonuses ? JSON.parse(record.bonuses) : [];
    } catch (e) {
      console.warn('Failed to parse bonuses:', e);
    }
    
    try {
      deductionList = record.deductions ? JSON.parse(record.deductions) : [];
    } catch (e) {
      console.warn('Failed to parse deductions:', e);
    }
    
    return {
      ...record,
      user,
      store,
      bonusList,
      deductionList,
    };
  }) || [];

  // Derive selected payroll from processed records
  const selectedPayroll = useMemo(() => {
    return selectedPayrollId ? processedRecords.find(record => record.id === selectedPayrollId) || null : null;
  }, [processedRecords, selectedPayrollId]);

  // Fetch attendance data when selectedPayroll changes
  const { data: allAttendanceRecords } = useQuery<Array<any>>({
    queryKey: [`/api/attendance/user/${selectedPayroll?.userId}`],
    enabled: !!selectedPayroll && (attendanceDialogOpen || detailDialogOpen),
  });

  // Filter attendance records for the current month
  const attendanceRecords = allAttendanceRecords?.filter(record => {
    if (!record.date && !record.createdAt) return false;
    const recordDate = new Date(record.date || record.createdAt);
    const recordMonth = recordDate.toISOString().slice(0, 7); // YYYY-MM
    return recordMonth === selectedPayroll?.month;
  }) || [];

  const generatePayrollMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payroll/generate");
      return await res.json();
    },
    onSuccess: (data) => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const existingRecords = payrollRecords?.filter(record => record.month === currentMonth) || [];
      const isUpdate = existingRecords.length > 0;
      
      toast({
        title: "Success",
        description: isUpdate 
          ? `Payroll updated successfully for ${data.length} staff members!`
          : `Payroll generated successfully for ${data.length} staff members!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/payroll/${id}/pay`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll marked as paid!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePayrollMutation = useMutation({
    mutationFn: async ({ id, bonuses, deductions }: { id: string; bonuses?: string; deductions?: string }) => {
      const res = await apiRequest("PATCH", `/api/payroll/${id}`, {
        bonuses,
        deductions,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setBonusDialogOpen(false);
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: selectedPayroll ? `Payroll-${selectedPayroll.month}-${selectedPayroll.user?.name}` : 'Payroll',
  });

  const addBonus = (record: PayrollWithUser) => {
    if (!newBonus.name || newBonus.amount <= 0) return;
    const bonuses = record.bonusList || [];
    const updatedBonuses = [...bonuses, newBonus];
    updatePayrollMutation.mutate({
      id: record.id,
      bonuses: JSON.stringify(updatedBonuses),
    });
    setNewBonus({ name: '', amount: 0 });
  };

  const addDeduction = (record: PayrollWithUser) => {
    if (!newDeduction.name || newDeduction.amount <= 0) return;
    const deductions = record.deductionList || [];
    const updatedDeductions = [...deductions, newDeduction];
    updatePayrollMutation.mutate({
      id: record.id,
      deductions: JSON.stringify(updatedDeductions),
    });
    setNewDeduction({ name: '', amount: 0 });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payroll Management
          </CardTitle>
          <Button 
            onClick={() => generatePayrollMutation.mutate()}
            disabled={generatePayrollMutation.isPending}
            data-testid="button-generate-payroll"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {generatePayrollMutation.isPending 
              ? "Processing..." 
              : (() => {
                  const currentMonth = new Date().toISOString().slice(0, 7);
                  const existingRecords = processedRecords?.filter(record => record.month === currentMonth) || [];
                  return existingRecords.length > 0 ? "Update Payroll" : "Generate Payroll";
                })()
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading payroll records...</div>
        ) : payrollRecords && payrollRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRecords.map((record) => {
                  const totalBonus = record.bonusList?.reduce((sum, b) => sum + b.amount, 0) || 0;
                  const totalDeduction = record.deductionList?.reduce((sum, d) => sum + d.amount, 0) || 0;
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {record.user?.name?.slice(0, 2).toUpperCase() || record.userId.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{record.user?.name || record.userId}</div>
                            <div className="text-sm text-muted-foreground">{record.store?.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.month}</TableCell>
                      <TableCell data-testid={`text-base-salary-${record.id}`}>{formatRupiah(record.baseSalary)}</TableCell>
                      <TableCell data-testid={`text-overtime-pay-${record.id}`}>{formatRupiah(record.overtimePay || "0")}</TableCell>
                      <TableCell data-testid={`text-total-bonus-${record.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{formatRupiah(totalBonus)}</span>
                          {record.bonusList && record.bonusList.length > 0 && (
                            <Badge variant="outline" className="text-xs">{record.bonusList.length}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-total-deduction-${record.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{formatRupiah(totalDeduction)}</span>
                          {record.deductionList && record.deductionList.length > 0 && (
                            <Badge variant="outline" className="text-xs">{record.deductionList.length}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`text-total-amount-${record.id}`}>
                        {formatRupiah(record.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.status === "paid" ? "default" : "secondary"}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => markAsPaidMutation.mutate(record.id)}
                              disabled={markAsPaidMutation.isPending}
                              data-testid={`button-mark-paid-${record.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayrollId(record.id);
                              setAttendanceDialogOpen(true);
                            }}
                            data-testid={`button-view-attendance-${record.id}`}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Attendance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayrollId(record.id);
                              setDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-detail-${record.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payroll records found</p>
            <p className="text-sm">Generate payroll to get started</p>
          </div>
        )}
      </CardContent>

      {/* Payroll Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Detail Payroll - {selectedPayroll?.user?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">Period: {selectedPayroll?.month} | Store: {selectedPayroll?.store?.name}</p>
              </div>
              <Button
                onClick={() => {
                  // Only print after attendance data is loaded
                  if (allAttendanceRecords) {
                    setTimeout(() => handlePrint(), 100);
                  }
                }}
                disabled={!allAttendanceRecords}
                data-testid={`button-print-detail-${selectedPayroll?.id}`}
              >
                <Printer className="h-4 w-4 mr-2" />
                {!allAttendanceRecords ? 'Loading...' : 'Print Payroll'}
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {/* Print Content - Hidden salary slip format */}
            <div ref={printRef} className="print-content hidden">
              {/* PAGE 1: ATTENDANCE DETAILS */}
              <div className="attendance-page page-break">
                {/* Header Page 1 */}
                <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
                  <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 2px 0' }}>REKAP KEHADIRAN KARYAWAN</h1>
                  <h2 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{selectedPayroll?.store?.name || 'NAMA TOKO'}</h2>
                  <p style={{ fontSize: '10px', margin: '0' }}>Periode: {selectedPayroll?.month}</p>
                </div>

                {/* Employee Info Page 1 */}
                <div style={{ marginBottom: '10px' }}>
                  <table style={{ width: '100%', fontSize: '9px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '100px', padding: '1px 0' }}><strong>Nama</strong></td>
                        <td style={{ padding: '1px 0' }}>: {selectedPayroll?.user?.name || '-'}</td>
                        <td style={{ width: '80px', padding: '1px 0' }}><strong>Toko</strong></td>
                        <td style={{ padding: '1px 0' }}>: {selectedPayroll?.store?.name || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Monthly Attendance Calendar */}
                {(() => {
                  if (!selectedPayroll?.month) return null;
                  
                  const [year, month] = selectedPayroll.month.split('-').map(Number);
                  const daysInMonth = new Date(year, month, 0).getDate();
                  const monthlyDays = Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const attendance = attendanceRecords.find(record => {
                      const recordDate = new Date(record.date || record.createdAt);
                      return recordDate.toISOString().split('T')[0] === dateStr;
                    });
                    
                    return {
                      date: dateStr,
                      day: day,
                      dayName: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' }),
                      attendance
                    };
                  });
                  
                  return (
                    <div style={{ marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #333', paddingBottom: '2px' }}>DETAIL KEHADIRAN HARIAN</h3>
                      <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ border: '1px solid #ddd', padding: '2px', textAlign: 'center', width: '10%' }}>Tgl</th>
                            <th style={{ border: '1px solid #ddd', padding: '2px', textAlign: 'center', width: '15%' }}>Hari</th>
                            <th style={{ border: '1px solid #ddd', padding: '2px', textAlign: 'center', width: '25%' }}>Masuk</th>
                            <th style={{ border: '1px solid #ddd', padding: '2px', textAlign: 'center', width: '25%' }}>Keluar</th>
                            <th style={{ border: '1px solid #ddd', padding: '2px', textAlign: 'center', width: '25%' }}>Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyDays.map(({ date, day, dayName, attendance }) => {
                            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                            const overtimeHours = attendance?.overtimeMinutes ? (attendance.overtimeMinutes / 60).toFixed(1) : '0';
                            
                            return (
                              <tr key={date} style={{ backgroundColor: isWeekend ? '#f9f9f9' : 'white' }}>
                                <td style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', fontSize: '9px' }}>{day}</td>
                                <td style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', fontSize: '9px' }}>{dayName}</td>
                                <td style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', fontSize: '9px' }}>
                                  {attendance?.checkIn || '-'}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', fontSize: '9px' }}>
                                  {attendance?.checkOut || '-'}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '3px', textAlign: 'center', fontSize: '9px' }}>
                                  {attendance?.notes || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Attendance Summary Stats */}
                {(() => {
                  const totalWorkDays = attendanceRecords?.filter(record => record.attendanceStatus === 'hadir').length || 0;
                  const totalLateMinutes = attendanceRecords?.reduce((sum, record) => sum + (record.latenessMinutes || 0), 0) || 0;
                  const totalOvertimeHours = attendanceRecords?.reduce((sum, record) => sum + ((record.overtimeMinutes || 0) / 60), 0) || 0;
                  const totalLeave = attendanceRecords?.filter(record => record.attendanceStatus === 'cuti').length || 0;
                  const totalAbsent = attendanceRecords?.filter(record => record.attendanceStatus === 'tidak hadir').length || 0;
                  
                  return (
                    <div style={{ marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '3px' }}>REKAPITULASI KEHADIRAN</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '10px' }}>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{totalWorkDays}</div>
                          <div>Hari Kerja</div>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#fff7ed' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{totalLateMinutes}</div>
                          <div>Menit Telat</div>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{totalOvertimeHours.toFixed(1)}</div>
                          <div>Jam Lembur</div>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{totalLeave}</div>
                          <div>Hari Cuti</div>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{totalAbsent}</div>
                          <div>Tidak Hadir</div>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{new Date(selectedPayroll?.month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                          <div>Periode</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Page 1 */}
                <div className="print-footer" style={{ 
                  fontSize: '8px',
                  color: '#666',
                  textAlign: 'center',
                  borderTop: '1px solid #ddd',
                  paddingTop: '4px'
                }}>
                  Halaman 1 - Detail Kehadiran | Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* PAGE 2: SALARY SUMMARY */}
              <div className="salary-page">
                {/* Header Page 2 */}
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>SLIP GAJI KARYAWAN</h1>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{selectedPayroll?.store?.name || 'NAMA TOKO'}</h2>
                  <p style={{ fontSize: '12px', margin: '0', color: '#666' }}>Periode: {selectedPayroll?.month}</p>
                </div>

                {/* Employee Info Page 2 */}
                <div style={{ marginBottom: '20px' }}>
                  <table style={{ width: '100%', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '150px', padding: '3px 0' }}><strong>Nama Karyawan</strong></td>
                        <td style={{ padding: '3px 0' }}>: {selectedPayroll?.user?.name || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0' }}><strong>Periode Gaji</strong></td>
                        <td style={{ padding: '3px 0' }}>: {selectedPayroll?.month}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0' }}><strong>Toko</strong></td>
                        <td style={{ padding: '3px 0' }}>: {selectedPayroll?.store?.name || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0' }}><strong>Status</strong></td>
                        <td style={{ padding: '3px 0' }}>: {selectedPayroll?.status?.toUpperCase() || 'PENDING'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Quick Attendance Summary */}
                {(() => {
                  const totalWorkDays = attendanceRecords?.filter(record => record.attendanceStatus === 'hadir').length || 0;
                  const totalLateMinutes = attendanceRecords?.reduce((sum, record) => sum + (record.latenessMinutes || 0), 0) || 0;
                  const totalOvertimeHours = attendanceRecords?.reduce((sum, record) => sum + ((record.overtimeMinutes || 0) / 60), 0) || 0;
                  
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>RINGKASAN KEHADIRAN</h3>
                      <table style={{ width: '100%', fontSize: '12px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '200px', padding: '3px 0' }}>Total Hari Kerja</td>
                            <td style={{ padding: '3px 0' }}>: {totalWorkDays} hari</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '3px 0' }}>Total Keterlambatan</td>
                            <td style={{ padding: '3px 0' }}>: {totalLateMinutes} menit</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '3px 0' }}>Total Lembur</td>
                            <td style={{ padding: '3px 0' }}>: {totalOvertimeHours.toFixed(1)} jam</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Salary Details */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>RINCIAN GAJI</h3>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Komponen</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>Gaji Pokok</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{formatRupiah(selectedPayroll?.baseSalary || 0)}</td>
                      </tr>
                      {selectedPayroll?.overtimePay && parseInt(selectedPayroll.overtimePay) > 0 && (
                        <tr>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>Lembur</td>
                          <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{formatRupiah(selectedPayroll.overtimePay)}</td>
                        </tr>
                      )}
                      {selectedPayroll?.bonusList?.map((bonus, index) => (
                        <tr key={`bonus-${index}`}>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>Bonus: {bonus.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#22c55e' }}>{formatRupiah(bonus.amount)}</td>
                        </tr>
                      ))}
                      {selectedPayroll?.deductionList?.map((deduction, index) => (
                        <tr key={`deduction-${index}`}>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>Potongan: {deduction.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#ef4444' }}>-{formatRupiah(deduction.amount)}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px' }}>TOTAL GAJI</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>{formatRupiah(selectedPayroll?.totalAmount || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Box */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ 
                    border: '2px solid #333', 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>TOTAL GAJI YANG DITERIMA</p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>{formatRupiah(selectedPayroll?.totalAmount || 0)}</p>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ 
                  marginTop: '40px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 60px 0' }}>Mengetahui,</p>
                    <p style={{ margin: '0', borderTop: '1px solid #000', paddingTop: '5px' }}>Pimpinan</p>
                  </div>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 60px 0' }}>Karyawan,</p>
                    <p style={{ margin: '0', borderTop: '1px solid #000', paddingTop: '5px' }}>{selectedPayroll?.user?.name || ''}</p>
                  </div>
                </div>

                {/* Footer Page 2 */}
                <div className="print-footer" style={{ 
                  fontSize: '8px', 
                  color: '#666',
                  textAlign: 'center',
                  borderTop: '1px solid #ddd',
                  paddingTop: '4px'
                }}>
                  Halaman 2 - Slip Gaji | Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Normal View Content */}
            <div className="normal-view space-y-6">
              {/* Monthly Calendar Table */}
              <div>
                <h3 className="font-semibold mb-3">Attendance Details - {selectedPayroll?.month}</h3>
                {(() => {
                  if (!selectedPayroll?.month) return null;
                  
                  const [year, month] = selectedPayroll.month.split('-').map(Number);
                  const daysInMonth = new Date(year, month, 0).getDate();
                  const monthlyDays = Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const attendance = attendanceRecords.find(record => {
                      const recordDate = new Date(record.date || record.createdAt);
                      return recordDate.toISOString().split('T')[0] === dateStr;
                    });
                    
                    return {
                      date: dateStr,
                      day: day,
                      dayName: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' }),
                      attendance
                    };
                  });
                  
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Tanggal</th>
                            <th className="text-left p-2 font-medium">Hari</th>
                            <th className="text-left p-2 font-medium">Masuk</th>
                            <th className="text-left p-2 font-medium">Keluar</th>
                            <th className="text-left p-2 font-medium">Telat</th>
                            <th className="text-left p-2 font-medium">Status</th>
                            <th className="text-left p-2 font-medium">Lembur (Jam)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyDays.map(({ date, day, dayName, attendance }) => {
                            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                            const overtimeHours = attendance?.overtimeMinutes ? (attendance.overtimeMinutes / 60).toFixed(1) : '0';
                            
                            return (
                              <tr key={date} className={`border-t ${isWeekend ? 'bg-gray-50' : ''}`}>
                                <td className="p-2 font-mono">{day}</td>
                                <td className="p-2">{dayName}</td>
                                <td className="p-2">
                                  {attendance?.checkIn ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      {attendance.checkIn}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {attendance?.checkOut ? (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                      {attendance.checkOut}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {attendance?.latenessMinutes && attendance.latenessMinutes > 0 ? (
                                    <span className="text-red-600 font-medium">{attendance.latenessMinutes} menit</span>
                                  ) : (
                                    <span className="text-green-600 text-xs">Tepat waktu</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {attendance ? (
                                    <Badge 
                                      variant={attendance.attendanceStatus === 'hadir' ? 'default' : 
                                              attendance.attendanceStatus === 'cuti' ? 'secondary' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {attendance.attendanceStatus || 'pending'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">tidak ada data</Badge>
                                  )}
                                </td>
                                <td className="p-2">
                                  {overtimeHours !== '0' ? (
                                    <span className="text-orange-600 font-medium">{overtimeHours} jam</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Bonus & Deduction Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bonuses */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-green-700 flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Bonus
                  </h4>
                  <div className="space-y-2 mb-4">
                    {selectedPayroll?.bonusList?.map((bonus, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm">{bonus.name}</span>
                        <span className="font-medium text-green-700">{formatRupiah(bonus.amount)}</span>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">Belum ada bonus</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama bonus"
                        value={newBonus.name}
                        onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Jumlah"
                        value={newBonus.amount}
                        onChange={(e) => setNewBonus({ ...newBonus, amount: parseFloat(e.target.value) || 0 })}
                        className="text-sm"
                      />
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => selectedPayroll && addBonus(selectedPayroll)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah Bonus
                    </Button>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-red-700 flex items-center">
                    <Minus className="h-4 w-4 mr-2" />
                    Potongan
                  </h4>
                  <div className="space-y-2 mb-4">
                    {selectedPayroll?.deductionList?.map((deduction, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm">{deduction.name}</span>
                        <span className="font-medium text-red-700">{formatRupiah(deduction.amount)}</span>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">Belum ada potongan</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama potongan"
                        value={newDeduction.name}
                        onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Jumlah"
                        value={newDeduction.amount}
                        onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) || 0 })}
                        className="text-sm"
                      />
                    </div>
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => selectedPayroll && addDeduction(selectedPayroll)}
                      className="w-full"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Tambah Potongan
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary Totals */}
              {selectedPayroll && (() => {
                const baseSalary = parseFloat(selectedPayroll.baseSalary || '0');
                const overtimePay = parseFloat(selectedPayroll.overtimePay || '0');
                const totalBonus = selectedPayroll.bonusList?.reduce((sum, b) => sum + b.amount, 0) || 0;
                const totalDeduction = selectedPayroll.deductionList?.reduce((sum, d) => sum + d.amount, 0) || 0;
                const grandTotal = baseSalary + overtimePay + totalBonus - totalDeduction;
                const workingDays = attendanceRecords.filter(a => a.attendanceStatus === 'hadir' && a.checkIn && a.checkOut).length;
                const totalOvertimeHours = attendanceRecords.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0) / 60;

                return (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Summary Penggajian</h3>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-lg">{workingDays}</div>
                          <div className="text-muted-foreground">Hari Kerja</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">{totalOvertimeHours.toFixed(1)}</div>
                          <div className="text-muted-foreground">Jam Lembur</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600">{selectedPayroll.bonusList?.length || 0}</div>
                          <div className="text-muted-foreground">Item Bonus</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-red-600">{selectedPayroll.deductionList?.length || 0}</div>
                          <div className="text-muted-foreground">Item Potongan</div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Gaji Pokok:</span>
                          <span className="font-medium">{formatRupiah(baseSalary)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Lembur:</span>
                          <span className="font-medium">{formatRupiah(overtimePay)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-700">
                          <span>Total Bonus:</span>
                          <span className="font-medium">+{formatRupiah(totalBonus)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-700">
                          <span>Total Potongan:</span>
                          <span className="font-medium">-{formatRupiah(totalDeduction)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2 text-lg font-bold">
                          <span>TOTAL GAJI:</span>
                          <span className="text-green-600">{formatRupiah(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Attendance Detail Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Attendance Details - {selectedPayroll?.user?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">Period: {selectedPayroll?.month} | Store: {selectedPayroll?.store?.name}</p>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Check In</th>
                        <th className="text-left p-3 font-medium">Check Out</th>
                        <th className="text-left p-3 font-medium">Telat</th>
                        <th className="text-left p-3 font-medium">Shift</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Overtime</th>
                        <th className="text-left p-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((attendance, index) => (
                        <tr key={attendance.id || index} className="border-t">
                          <td className="p-3">
                            {new Date(attendance.date || attendance.createdAt).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-sm ${
                              attendance.checkIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {attendance.checkIn || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-sm ${
                              attendance.checkOut ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {attendance.checkOut || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            {attendance.latenessMinutes && attendance.latenessMinutes > 0 ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                                {attendance.latenessMinutes} menit
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                Tepat waktu
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{attendance.shift || 'N/A'}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant={attendance.attendanceStatus === 'hadir' ? 'default' : 
                                      attendance.attendanceStatus === 'cuti' ? 'secondary' : 'destructive'}
                            >
                              {attendance.attendanceStatus || 'pending'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {attendance.overtimeMinutes ? (
                              <span className="text-orange-600 font-medium">
                                {Math.floor(attendance.overtimeMinutes / 60)}h {attendance.overtimeMinutes % 60}m
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground">
                              {attendance.notes || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for this period</p>
                </div>
              )}
              
              {/* Summary Statistics */}
              {attendanceRecords && attendanceRecords.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceRecords.filter(a => a.attendanceStatus === 'hadir' && a.checkIn && a.checkOut).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Working Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {attendanceRecords.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Overtime Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {attendanceRecords.filter(a => a.attendanceStatus === 'alpha').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Absent Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendanceRecords.filter(a => a.attendanceStatus === 'cuti').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Leave Days</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Bonus/Deduction Management Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Bonus & Deduction - {selectedPayroll?.user?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Bonuses */}
            <div>
              <h4 className="font-medium mb-3 text-green-700">Current Bonuses</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedPayroll?.bonusList?.map((bonus, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>{bonus.name}</span>
                    <span className="font-medium text-green-700">{formatRupiah(bonus.amount)}</span>
                  </div>
                )) || <p className="text-sm text-muted-foreground">No bonuses added</p>}
              </div>
            </div>

            {/* Add New Bonus */}
            <div>
              <h4 className="font-medium mb-3 text-green-700">Add Bonus</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="bonus-name">Bonus Name</Label>
                  <Input
                    id="bonus-name"
                    placeholder="e.g., Performance Bonus"
                    value={newBonus.name}
                    onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="bonus-amount">Amount</Label>
                  <Input
                    id="bonus-amount"
                    type="number"
                    placeholder="0"
                    value={newBonus.amount}
                    onChange={(e) => setNewBonus({ ...newBonus, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button 
                  onClick={() => selectedPayroll && addBonus(selectedPayroll)}
                  className="mt-6"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Current Deductions */}
            <div>
              <h4 className="font-medium mb-3 text-red-700">Current Deductions</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedPayroll?.deductionList?.map((deduction, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span>{deduction.name}</span>
                    <span className="font-medium text-red-700">{formatRupiah(deduction.amount)}</span>
                  </div>
                )) || <p className="text-sm text-muted-foreground">No deductions added</p>}
              </div>
            </div>

            {/* Add New Deduction */}
            <div>
              <h4 className="font-medium mb-3 text-red-700">Add Deduction</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="deduction-name">Deduction Name</Label>
                  <Input
                    id="deduction-name"
                    placeholder="e.g., Late Penalty"
                    value={newDeduction.name}
                    onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="deduction-amount">Amount</Label>
                  <Input
                    id="deduction-amount"
                    type="number"
                    placeholder="0"
                    value={newDeduction.amount}
                    onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button 
                  onClick={() => selectedPayroll && addDeduction(selectedPayroll)}
                  variant="destructive"
                  className="mt-6"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
