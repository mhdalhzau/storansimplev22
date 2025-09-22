import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User, type Attendance } from "@shared/schema";
import { UserCheck, ChevronLeft, ChevronRight, Save, Download, RotateCcw, Edit2 } from "lucide-react";
import { detectShift, calculateLateness, calculateOvertime } from "@shared/attendance-utils";

// Types untuk attendance record
interface AttendanceRecord {
  id?: string;
  date: string;
  day: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  latenessMinutes: number;
  overtimeMinutes: number;
  attendanceStatus: string;
  notes: string;
  status: string;
}

export default function AttendanceContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState("list");
  const [currentEmp, setCurrentEmp] = useState<User | null>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Check user permissions - only finance and manager can edit
  const canEdit = user?.role === 'manager' || user?.role === 'administrasi';

  // Get all employees for the list
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get attendance data for selected employee and month
  const { data: attendanceData, refetch: refetchAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/user", currentEmp?.id, { date: `${year}-${(month + 1).toString().padStart(2, '0')}` }],
    enabled: !!currentEmp?.id,
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: { attendanceRecords: AttendanceRecord[] }) => {
      const promises = data.attendanceRecords.map(async (record) => {
        if (record.id) {
          // Update existing attendance
          return apiRequest("PUT", `/api/attendance/${record.id}`, {
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            shift: record.shift,
            latenessMinutes: record.latenessMinutes,
            overtimeMinutes: record.overtimeMinutes,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes,
          });
        } else {
          // Create new attendance record  
          return apiRequest("POST", "/api/attendance", {
            userId: currentEmp?.id,
            storeId: currentEmp?.stores?.[0]?.id ?? currentEmp?.storeId ?? user?.storeId ?? 1, // Use selected employee's store ID or fallback
            date: record.date,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            shift: record.shift,
            latenessMinutes: record.latenessMinutes,
            overtimeMinutes: record.overtimeMinutes,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes,
          });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data absensi berhasil disimpan!",
      });
      setHasChanges(false);
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data absensi",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  
  const dayName = (y: number, m: number, d: number) =>
    new Date(y, m, d).toLocaleDateString("id-ID", { weekday: "long" });
  
  const monthName = (m: number, y: number) =>
    new Date(y, m, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

  // Load month data for employee
  const loadMonth = (emp: User) => {
    if (!emp) return;
    
    const days = daysInMonth(month, year);
    const monthData: AttendanceRecord[] = [];
    
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      
      // Find existing attendance for this date
      const existingAttendance = attendanceData?.find(att => {
        const attDate = new Date(att.date || "").toISOString().split('T')[0];
        return attDate === dateStr;
      });

      monthData.push({
        id: existingAttendance?.id,
        date: dateStr,
        day: dayName(year, month, d),
        shift: existingAttendance?.shift || "pagi",
        checkIn: existingAttendance?.checkIn || "",
        checkOut: existingAttendance?.checkOut || "",
        latenessMinutes: existingAttendance?.latenessMinutes || 0,
        overtimeMinutes: existingAttendance?.overtimeMinutes || 0,
        attendanceStatus: existingAttendance?.attendanceStatus || "",
        notes: existingAttendance?.notes || "",
        status: existingAttendance?.status || "pending",
      });
    }
    
    setRows(monthData);
    setHasChanges(false);
  };

  // Effect to load month data when attendance data changes
  useEffect(() => {
    if (currentEmp && attendanceData !== undefined) {
      loadMonth(currentEmp);
    }
  }, [currentEmp, attendanceData, month, year]);

  // Open detail view
  const openDetail = (emp: User) => {
    setCurrentEmp(emp);
    setView("detail");
  };

  // Back to list
  const backToList = () => {
    setView("list");
    setCurrentEmp(null);
    setHasChanges(false);
  };

  // Change month navigation
  const changeMonth = (step: number) => {
    let newMonth = month + step;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  // Change year
  const changeYear = (y: string) => {
    setYear(parseInt(y));
  };

  // Update row data
  const updateRow = (i: number, field: keyof AttendanceRecord, value: string | number) => {
    if (!canEdit) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya manager dan administrasi yang dapat mengedit data absensi",
        variant: "destructive",
      });
      return;
    }

    const newRows = [...rows];
    newRows[i] = { ...newRows[i], [field]: value };

    // Auto-calculate lateness and overtime when times are updated
    if (field === "checkIn" || field === "checkOut" || field === "shift") {
      if (newRows[i].checkIn && newRows[i].checkOut) {
        const shift = field === "shift" ? value as string : newRows[i].shift;
        const checkIn = field === "checkIn" ? value as string : newRows[i].checkIn;
        const checkOut = field === "checkOut" ? value as string : newRows[i].checkOut;
        
        newRows[i].shift = shift;
        newRows[i].latenessMinutes = calculateLateness(checkIn, shift);
        newRows[i].overtimeMinutes = calculateOvertime(checkOut, shift);
      }
    }

    setRows(newRows);
    setHasChanges(true);
  };

  // Save data
  const saveData = () => {
    if (!canEdit) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya manager dan administrasi yang dapat menyimpan data absensi",
        variant: "destructive",
      });
      return;
    }

    const recordsToSave = rows.filter(row => 
      row.checkIn || row.checkOut || row.attendanceStatus
    );

    saveAttendanceMutation.mutate({ attendanceRecords: recordsToSave });
  };

  // Cancel edit
  const cancelEdit = () => {
    if (currentEmp) {
      loadMonth(currentEmp);
    }
    setHasChanges(false);
  };

  // Export CSV
  const exportCSV = () => {
    if (!currentEmp) return;
    let csv = "Tanggal,Hari,Shift,Jam Masuk,Jam Keluar,Telat (menit),Lembur (menit),Status,Keterangan\n";
    rows.forEach((r) => {
      csv += `${r.date},${r.day},${r.shift},${r.checkIn},${r.checkOut},${r.latenessMinutes},${r.overtimeMinutes},${r.attendanceStatus},${r.notes}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Absensi_${currentEmp.name}_${month + 1}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary
  const summary = () => {
    const hadir = rows.filter((r) => r.attendanceStatus === "hadir").length;
    const cuti = rows.filter((r) => r.attendanceStatus === "cuti").length;
    const alpha = rows.filter((r) => r.attendanceStatus === "alpha").length;
    const totalTelat = rows.reduce((a, b) => a + b.latenessMinutes, 0);
    const totalLembur = rows.reduce((a, b) => a + b.overtimeMinutes, 0);

    return `Total Telat: ${totalTelat} menit (${(totalTelat / 60).toFixed(2)} jam)
Total Lembur: ${totalLembur} menit (${(totalLembur / 60).toFixed(2)} jam)
Total: Hadir ${hadir}, Cuti ${cuti}, Alpha ${alpha}`;
  };

  // Render list view
  if (view === "list") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Daftar Karyawan
            </CardTitle>
            <p className="text-muted-foreground">Pilih karyawan untuk melihat detail absensi</p>
            {!canEdit && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  ℹ️ Anda hanya dapat melihat data. Hanya manager dan administrasi yang dapat mengedit absensi.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="text-center py-8">Loading karyawan...</div>
            ) : employees && employees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {employee.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{employee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => openDetail(employee)}
                            data-testid={`button-detail-${employee.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {canEdit ? "Edit Absensi" : "Lihat Absensi"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada karyawan yang ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render detail view
  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Absensi - {currentEmp?.name}
              {!canEdit && <span className="text-sm text-muted-foreground ml-2">(View Only)</span>}
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeMonth(-1)}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              <span className="mx-2 text-lg font-medium">
                {monthName(month, year)}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => changeMonth(1)}
                data-testid="button-next-month"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Select value={year.toString()} onValueChange={changeYear}>
                <SelectTrigger className="w-24 ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission warning */}
      {!canEdit && (
        <Card>
          <CardContent className="p-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                ℹ️ Anda hanya dapat melihat data. Hanya manager dan administrasi yang dapat mengedit data absensi.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance table */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Keluar</TableHead>
                  <TableHead>Telat (mnt)</TableHead>
                  <TableHead>Lembur (mnt)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {new Date(row.date).getDate()}
                    </TableCell>
                    <TableCell>{row.day}</TableCell>
                    <TableCell>
                      <Select
                        value={row.shift}
                        onValueChange={(value) => updateRow(i, "shift", value)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pagi">Pagi</SelectItem>
                          <SelectItem value="siang">Siang</SelectItem>
                          <SelectItem value="malam">Malam</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.checkIn}
                        onChange={(e) => updateRow(i, "checkIn", e.target.value)}
                        className="w-32"
                        disabled={!canEdit}
                        data-testid={`input-checkin-${i}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.checkOut}
                        onChange={(e) => updateRow(i, "checkOut", e.target.value)}
                        className="w-32"
                        disabled={!canEdit}
                        data-testid={`input-checkout-${i}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={row.latenessMinutes > 0 ? "text-red-600 font-medium" : ""}>
                        {row.latenessMinutes}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={row.overtimeMinutes > 0 ? "text-blue-600 font-medium" : ""}>
                        {row.overtimeMinutes}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.attendanceStatus}
                        onValueChange={(value) => updateRow(i, "attendanceStatus", value)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hadir">Hadir</SelectItem>
                          <SelectItem value="cuti">Cuti</SelectItem>
                          <SelectItem value="alpha">Alpha</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateRow(i, "notes", e.target.value)}
                        className="w-40"
                        placeholder="Catatan..."
                        disabled={!canEdit}
                        data-testid={`input-note-${i}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {canEdit && (
              <>
                <Button 
                  onClick={saveData} 
                  disabled={!hasChanges || saveAttendanceMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveAttendanceMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelEdit}
                  disabled={!hasChanges}
                  data-testid="button-cancel"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Batal
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              onClick={exportCSV}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={backToList}
              data-testid="button-back"
            >
              Kembali ke List
            </Button>
          </div>
          
          {/* Show save prompt if there are changes */}
          {hasChanges && canEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-amber-800 text-sm">
                ⚠️ Ada perubahan yang belum disimpan. Jangan lupa untuk menyimpan data.
              </p>
            </div>
          )}
          
          {/* Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{summary()}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}