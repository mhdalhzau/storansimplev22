import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Minus,
  Copy,
  AlertTriangle,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/utils";
import {
  detectShift,
  calculateLateness,
  calculateOvertime,
} from "@shared/attendance-utils";

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

interface IncomeItem {
  id: string;
  description: string;
  amount: number;
}

// Custom Hook untuk validasi input decimal
const useDecimalInput = (initialValue: number = 0) => {
  const [value, setValue] = useState<number>(initialValue);

  const validateAndCleanInput = useCallback((inputValue: string): string => {
    let cleanedValue = inputValue;

    // 1. Pencegahan Input Alfabet
    cleanedValue = cleanedValue.replace(/[a-zA-Z]/g, "");

    // 2. Konversi Otomatis: Titik ke koma
    cleanedValue = cleanedValue.replace(/\./g, ",");

    // 3. Validasi Ketat: Hanya angka dan koma
    cleanedValue = cleanedValue.replace(/[^0-9,]/g, "");

    // 4. Pembatasan Format: Maksimal 3 digit setelah koma
    const parts = cleanedValue.split(",");
    if (parts.length > 2) {
      cleanedValue = parts[0] + "," + parts[1];
    }
    if (parts.length === 2 && parts[1].length > 3) {
      cleanedValue = parts[0] + "," + parts[1].substring(0, 3);
    }

    return cleanedValue;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleanedValue = validateAndCleanInput(e.target.value);

      if (cleanedValue === "" || cleanedValue === ",") {
        setValue(0);
      } else {
        const numValue = parseFloat(cleanedValue.replace(",", "."));
        if (!isNaN(numValue) && numValue >= 0) {
          setValue(numValue);
        }
      }
    },
    [validateAndCleanInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const paste = e.clipboardData?.getData("text") || "";
      const cleanedPaste = validateAndCleanInput(paste);

      (e.target as HTMLInputElement).value = cleanedPaste;
      e.target.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [validateAndCleanInput],
  );

  const displayValue = useMemo(() => {
    return value === 0 ? "" : value.toString().replace(".", ",");
  }, [value]);

  return {
    value,
    displayValue,
    handleChange,
    handlePaste,
    setValue,
  };
};

// Custom Hook untuk manajemen items (expenses/income)
const useItemsManager = <
  T extends { id: string; description: string; amount: number },
>() => {
  const [items, setItems] = useState<T[]>([]);

  const addItem = useCallback((newItem: T) => {
    setItems((prevItems) => [...prevItems, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof T, value: string | number) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const validItems = useMemo(
    () => items.filter((item) => item.description.trim() && item.amount > 0),
    [items],
  );

  const incompleteItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.description.trim() && item.amount <= 0) ||
          (!item.description.trim() && item.amount > 0),
      ),
    [items],
  );

  const total = useMemo(
    () => validItems.reduce((sum, item) => sum + item.amount, 0),
    [validItems],
  );

  return {
    items,
    validItems,
    incompleteItems,
    total,
    addItem,
    removeItem,
    updateItem,
    hasIncomplete: incompleteItems.length > 0,
  };
};

export default function StaffPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState("");

  // Query untuk fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
  });

  // Filter users to only show staff role
  const staffUsers = users.filter((user: any) => user.role === "staff");

  // Single endpoint submission (server handles all related records)
  const submitDataMutation = useMutation({
    mutationFn: async (data: any) => {
      // Send all data to setoran endpoint - server will handle attendance, sales, cashflow creation
      const setoranResponse = await apiRequest("POST", "/api/setoran", data);
      return setoranResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Berhasil di-copy",
        description:
          "Data berhasil di copy silahkan paste di laporan pesan anda",
        variant: "default",
      });

      // Reset form setelah berhasil save
      setSelectedStaffName("");
      setEmployeeName("");
      setJamMasuk("");
      setJamKeluar("");
      setNomorAwal(0);
      setNomorAkhir(0);
      setQrisSetoran(0);
      setExpenses([]);
      setIncome([]);
      // Reset validation state
      setIsValidated(false);
      setValidationPassword("");
      setShowValidation(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Gagal Menyimpan",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form data
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [jamMasuk, setJamMasuk] = useState("");
  const [jamKeluar, setJamKeluar] = useState("");
  const [nomorAwal, setNomorAwal] = useState(0);
  const [nomorAkhir, setNomorAkhir] = useState(0);
  const [nomorAwalText, setNomorAwalText] = useState("");
  const [nomorAkhirText, setNomorAkhirText] = useState("");
  const [qrisSetoran, setQrisSetoran] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [income, setIncome] = useState<IncomeItem[]>([]);

  // Password validation states
  const [isValidated, setIsValidated] = useState(false);
  const [validationPassword, setValidationPassword] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  // Handle staff selection
  const handleStaffSelect = (staffName: string) => {
    setSelectedStaffName(staffName);
    const selectedStaff = staffUsers.find(
      (user: any) => user.name === staffName,
    );
    if (selectedStaff) {
      setEmployeeName(selectedStaff.name);
    }
    // Reset validation when staff changes
    setIsValidated(false);
    setValidationPassword("");
    setShowValidation(false);
  };

  // Validation function
  const validatePassword = () => {
    if (!employeeName.trim()) {
      toast({
        title: "❌ Error",
        description: "Pilih nama staff terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (
      validationPassword.trim().toLowerCase() ===
      employeeName.trim().toLowerCase()
    ) {
      setIsValidated(true);
      setShowValidation(false);
      toast({
        title: "✅ Validasi Berhasil",
        description: "Nama benar! Sekarang Anda dapat copy data",
        variant: "default",
      });
    } else {
      toast({
        title: "❌ Validasi Gagal",
        description: "Nama harus sama dengan nama Anda",
        variant: "destructive",
      });
    }
  };

  // Calculations
  const totalLiter = Math.max(0, nomorAkhir - nomorAwal); // Prevent negative liter
  const totalSetoran = totalLiter * 11500; // Total = Total Liter × 11500
  const cashSetoran = Math.max(0, totalSetoran - qrisSetoran); // Cash = Total - QRIS, prevent negative

  // Only count valid items (with description and amount > 0)
  const validExpenses = expenses.filter(
    (item) => item.description.trim() && item.amount > 0,
  );
  const validIncome = income.filter(
    (item) => item.description.trim() && item.amount > 0,
  );
  const totalExpenses = validExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalIncome = validIncome.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalKeseluruhan = cashSetoran + totalIncome - totalExpenses; // Cash + Pemasukan - Pengeluaran

  // Validasi untuk enable/disable button
  const isDataComplete =
    selectedStaffName.trim() !== "" &&
    jamMasuk !== "" &&
    jamKeluar !== "" &&
    nomorAwal > 0 &&
    nomorAkhir > nomorAwal &&
    isValidated; // Require validation

  // Check for incomplete entries (partially filled forms)
  const incompleteExpenses = expenses.filter(
    (item) =>
      (item.description.trim() && item.amount <= 0) ||
      (!item.description.trim() && item.amount > 0),
  );
  const incompleteIncome = income.filter(
    (item) =>
      (item.description.trim() && item.amount <= 0) ||
      (!item.description.trim() && item.amount > 0),
  );
  const hasIncompleteExpenses = incompleteExpenses.length > 0;
  const hasIncompleteIncome = incompleteIncome.length > 0;

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(today.toLocaleDateString("id-ID", options));
  }, []);

  const addExpenseItem = () => {
    // Validasi - cek apakah semua item sudah diisi
    const hasEmptyFields = expenses.some(
      (item) => !item.description.trim() || item.amount <= 0,
    );

    if (hasEmptyFields) {
      toast({
        title: "Data Belum Lengkap",
        description:
          "Lengkapi semua field pengeluaran sebelum menambah item baru",
        variant: "destructive",
      });
      return;
    }

    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: "",
      amount: 0,
    };
    setExpenses([...expenses, newItem]);
  };

  const removeExpenseItem = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
  };

  const updateExpenseItem = (
    id: string,
    field: keyof ExpenseItem,
    value: string | number,
  ) => {
    setExpenses(
      expenses.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addIncomeItem = () => {
    // Validasi - cek apakah semua item sudah diisi
    const hasEmptyFields = income.some(
      (item) => !item.description.trim() || item.amount <= 0,
    );

    if (hasEmptyFields) {
      toast({
        title: "Data Belum Lengkap",
        description:
          "Lengkapi semua field pemasukan sebelum menambah item baru",
        variant: "destructive",
      });
      return;
    }

    const newItem: IncomeItem = {
      id: Date.now().toString(),
      description: "",
      amount: 0,
    };
    setIncome([...income, newItem]);
  };

  const removeIncomeItem = (id: string) => {
    setIncome(income.filter((item) => item.id !== id));
  };

  const updateIncomeItem = (
    id: string,
    field: keyof IncomeItem,
    value: string | number,
  ) => {
    setIncome(
      income.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const saveToDatabase = async () => {
    // Validasi form
    if (!selectedStaffName.trim()) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description: "Nama staff harus dipilih",
        variant: "destructive",
      });
      return;
    }

    if (!jamMasuk || !jamKeluar) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description: "Jam masuk dan jam keluar harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (nomorAkhir <= nomorAwal) {
      toast({
        title: "❌ Data Tidak Valid",
        description: "Nomor akhir harus lebih besar dari nomor awal",
        variant: "destructive",
      });
      return;
    }

    // Cek jika ada incomplete items
    if (hasIncompleteExpenses || hasIncompleteIncome) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description:
          "Harap lengkapi atau hapus item yang belum diisi dengan sempurna",
        variant: "destructive",
      });
      return;
    }

    // Calculate attendance data
    const selectedStaff = staffUsers.find(
      (user: any) => user.name === selectedStaffName,
    );
    const shift = detectShift(jamMasuk);
    const latenessMinutes = calculateLateness(jamMasuk, shift);
    const overtimeMinutes = calculateOvertime(jamKeluar, shift);

    // Prepare attendance data
    const attendanceData = {
      userId: selectedStaff?.id || "",
      storeId: 1, // Default store, should be dynamic based on user's store
      checkIn: jamMasuk,
      checkOut: jamKeluar,
      shift: shift,
      latenessMinutes: latenessMinutes,
      overtimeMinutes: overtimeMinutes,
    };

    // Prepare data untuk API
    const setoranData = {
      employee_name: employeeName,
      employeeId: selectedStaff?.id || "",
      attendance: attendanceData, // Include attendance data
      jam_masuk: jamMasuk,
      jam_keluar: jamKeluar,
      nomor_awal: nomorAwal,
      nomor_akhir: nomorAkhir,
      qris_setoran: qrisSetoran,
      total_liter: totalLiter,
      total_setoran: totalSetoran,
      cash_setoran: cashSetoran,
      total_expenses: totalExpenses,
      total_income: totalIncome,
      total_keseluruhan: totalKeseluruhan,
      validExpenses: validExpenses,
      validIncome: validIncome,
      expenses: validExpenses,
      income: validIncome,
    };

    // Save ke database
    submitDataMutation.mutate(setoranData);
  };

  // Fungsi gabungan: Copy ke clipboard + Auto save ke database
  const copyAndSave = async () => {
    // Validasi awal
    if (!isValidated) {
      toast({
        title: "❌ Validasi Diperlukan",
        description: "Masukkan nama Anda untuk validasi terlebih dahulu",
        variant: "destructive",
      });
      setShowValidation(true);
      return;
    }

    if (!isDataComplete) {
      toast({
        title: "❌ Data Tidak Lengkap",
        description:
          "Lengkapi nama staff, jam kerja, dan data meter terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Copy ke clipboard
      let reportText = `
Setoran Harian 📋
${currentDate}

🤷‍♂️ Nama: ${employeeName}
🕐 Jam: (${jamMasuk} - ${jamKeluar})

⛽ Data Meter:
Nomor Awal: ${nomorAwal}
Nomor Akhir: ${nomorAkhir}
Total Liter: ${totalLiter.toFixed(2)} L

💰 Setoran:
Cash: ${formatRupiah(cashSetoran)}
QRIS: ${formatRupiah(qrisSetoran)}
Total: ${formatRupiah(totalSetoran)}`;

      // Tambahkan bagian pengeluaran hanya jika ada data (pu) yang digunakan
      if (validExpenses.length > 0) {
        reportText += `

💸 Pengeluaran (PU):
${validExpenses.map((item) => `- ${item.description}: ${formatRupiah(item.amount)}`).join("\n")}
Total Pengeluaran: ${formatRupiah(totalExpenses)}`;
      }

      // Tambahkan bagian pemasukan hanya jika ada data (pu) yang digunakan
      if (validIncome.length > 0) {
        reportText += `

💵 Pemasukan (PU):
${validIncome.map((item) => `- ${item.description}: ${formatRupiah(item.amount)}`).join("\n")}
Total Pemasukan: ${formatRupiah(totalIncome)}`;
      }

      // Total keseluruhan
      reportText += `

💼 Total Keseluruhan: ${formatRupiah(totalKeseluruhan)}`;

      reportText = reportText.trim();

      await navigator.clipboard.writeText(reportText);

      // 2. Save ke database
      const selectedStaff = staffUsers.find(
        (user: any) => user.name === selectedStaffName,
      );
      const setoranData = {
        employee_name: employeeName,
        employeeId: selectedStaff?.id || "",
        jam_masuk: jamMasuk,
        jam_keluar: jamKeluar,
        nomor_awal: nomorAwal,
        nomor_akhir: nomorAkhir,
        qris_setoran: qrisSetoran,
        total_liter: totalLiter,
        total_setoran: totalSetoran,
        cash_setoran: cashSetoran,
        total_expenses: totalExpenses,
        total_income: totalIncome,
        total_keseluruhan: totalKeseluruhan,
        validExpenses: validExpenses,
        validIncome: validIncome,
        expenses: validExpenses,
        income: validIncome,
      };

      submitDataMutation.mutate(setoranData);

      toast({
        title: "✅ Berhasil!",
        description: "Data disalin ke clipboard dan disimpan ke database",
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Gagal menyalin ke clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Setoran Harian 📋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {currentDate}
          </p>
        </div>

        {/* Staff Selection */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              👤 Nama Staff
            </Label>
            {isLoadingUsers ? (
              <div className="mt-2 text-gray-500">Loading staff...</div>
            ) : (
              <select
                value={selectedStaffName}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-staff-name"
              >
                <option value="">Pilih Nama Staff</option>
                {staffUsers.map((user: any) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              🕐 Jam Kerja
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Jam Masuk</Label>
                <Input
                  type="time"
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  data-testid="input-jam-masuk"
                />
              </div>
              <div>
                <Label>Jam Keluar</Label>
                <Input
                  type="time"
                  value={jamKeluar}
                  onChange={(e) => setJamKeluar(e.target.value)}
                  data-testid="input-jam-keluar"
                />
              </div>
            </div>

            {/* Auto-calculated Attendance Info */}
            {jamMasuk && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  📊 Info Attendance (Auto Calculated)
                </Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Shift:</span>{" "}
                    <span className="text-blue-600 dark:text-blue-300">
                      {detectShift(jamMasuk).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Telat:</span>{" "}
                    <span className="text-red-600 dark:text-red-400">
                      {calculateLateness(jamMasuk, detectShift(jamMasuk))} menit
                    </span>
                  </div>
                  {jamKeluar && (
                    <div>
                      <span className="font-medium">Lembur:</span>{" "}
                      <span className="text-green-600 dark:text-green-400">
                        {calculateOvertime(jamKeluar, detectShift(jamMasuk))}{" "}
                        menit
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meter Data */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              ⛽ Data Meter
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nomor Awal (Liter)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 1234,567"
                  value={nomorAwalText}
                  onChange={(e) => {
                    let value = e.target.value;

                    // 1. Pencegahan Input Alfabet: Hapus semua karakter alfabet
                    value = value.replace(/[a-zA-Z]/g, "");

                    // 2. Konversi Otomatis: Titik (.) otomatis diubah menjadi koma (,)
                    value = value.replace(/\./g, ",");

                    // 3. Validasi Ketat: Hanya menerima digit angka (0-9) dan koma (,)
                    value = value.replace(/[^0-9,]/g, "");

                    // 4. Pembatasan Format: Maksimal 3 digit di belakang koma
                    const parts = value.split(",");
                    if (parts.length > 2) {
                      // Jika ada lebih dari satu koma, ambil yang pertama saja
                      value = parts[0] + "," + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      // Batasi maksimal 3 digit setelah koma
                      value = parts[0] + "," + parts[1].substring(0, 3);
                    }

                    // Update text state (preserves what user is typing)
                    setNomorAwalText(value);

                    // Update numeric state for calculations
                    if (value === "" || value === ",") {
                      setNomorAwal(0);
                    } else {
                      // Convert Indonesian format (comma) to JavaScript decimal (dot)
                      const numValue = parseFloat(value.replace(",", "."));
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAwal(numValue);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // 5. Pencegahan Paste: Mencegah pengguna menempelkan teks yang mengandung huruf
                    e.preventDefault();
                    const paste = e.clipboardData?.getData("text") || "";
                    let cleanedPaste = paste
                      .replace(/[a-zA-Z]/g, "") // Hapus alfabet
                      .replace(/\./g, ",") // Konversi titik ke koma
                      .replace(/[^0-9,]/g, ""); // Hanya angka dan koma

                    // Batasi format koma
                    const parts = cleanedPaste.split(",");
                    if (parts.length > 2) {
                      cleanedPaste = parts[0] + "," + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      cleanedPaste = parts[0] + "," + parts[1].substring(0, 3);
                    }

                    // Update text state directly
                    setNomorAwalText(cleanedPaste);

                    // Update numeric state for calculations
                    if (cleanedPaste === "" || cleanedPaste === ",") {
                      setNomorAwal(0);
                    } else {
                      const numValue = parseFloat(
                        cleanedPaste.replace(",", "."),
                      );
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAwal(numValue);
                      }
                    }
                  }}
                  data-testid="input-nomor-awal"
                />
              </div>
              <div>
                <Label>Nomor Akhir (Liter)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 1567,234"
                  value={nomorAkhirText}
                  onChange={(e) => {
                    let value = e.target.value;

                    // 1. Pencegahan Input Alfabet: Hapus semua karakter alfabet
                    value = value.replace(/[a-zA-Z]/g, "");

                    // 2. Konversi Otomatis: Titik (.) otomatis diubah menjadi koma (,)
                    value = value.replace(/\./g, ",");

                    // 3. Validasi Ketat: Hanya menerima digit angka (0-9) dan koma (,)
                    value = value.replace(/[^0-9,]/g, "");

                    // 4. Pembatasan Format: Maksimal 3 digit di belakang koma
                    const parts = value.split(",");
                    if (parts.length > 2) {
                      // Jika ada lebih dari satu koma, ambil yang pertama saja
                      value = parts[0] + "," + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      // Batasi maksimal 3 digit setelah koma
                      value = parts[0] + "," + parts[1].substring(0, 3);
                    }

                    // Update text state (preserves what user is typing)
                    setNomorAkhirText(value);

                    // Update numeric state for calculations
                    if (value === "" || value === ",") {
                      setNomorAkhir(0);
                    } else {
                      // Convert Indonesian format (comma) to JavaScript decimal (dot)
                      const numValue = parseFloat(value.replace(",", "."));
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAkhir(numValue);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // 5. Pencegahan Paste: Mencegah pengguna menempelkan teks yang mengandung huruf
                    e.preventDefault();
                    const paste = e.clipboardData?.getData("text") || "";
                    let cleanedPaste = paste
                      .replace(/[a-zA-Z]/g, "") // Hapus alfabet
                      .replace(/\./g, ",") // Konversi titik ke koma
                      .replace(/[^0-9,]/g, ""); // Hanya angka dan koma

                    // Batasi format koma
                    const parts = cleanedPaste.split(",");
                    if (parts.length > 2) {
                      cleanedPaste = parts[0] + "," + parts[1];
                    }
                    if (parts.length === 2 && parts[1].length > 3) {
                      cleanedPaste = parts[0] + "," + parts[1].substring(0, 3);
                    }

                    // Update text state directly
                    setNomorAkhirText(cleanedPaste);

                    // Update numeric state for calculations
                    if (cleanedPaste === "" || cleanedPaste === ",") {
                      setNomorAkhir(0);
                    } else {
                      const numValue = parseFloat(
                        cleanedPaste.replace(",", "."),
                      );
                      if (!isNaN(numValue) && numValue >= 0) {
                        setNomorAkhir(numValue);
                      }
                    }
                  }}
                  data-testid="input-nomor-akhir"
                />
              </div>
              <div>
                <Label>Total Liter</Label>
                <Input
                  value={`${totalLiter.toFixed(2)} L`}
                  readOnly
                  className="bg-black text-white font-semibold cursor-default"
                  data-testid="display-total-liter"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setoran */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
              💰 Setoran
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Cash</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <Input
                    value={formatNumber(cashSetoran)}
                    readOnly
                    className="bg-gray-50 cursor-default"
                    data-testid="display-cash-setoran"
                  />
                </div>
              </div>
              <div>
                <Label>QRIS</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <Input
                    type="number"
                    min="0"
                    value={qrisSetoran || ""}
                    onChange={(e) =>
                      setQrisSetoran(Math.max(0, Number(e.target.value) || 0))
                    }
                    data-testid="input-qris-setoran"
                  />
                </div>
              </div>
              <div>
                <Label>Total</Label>
                <div className="flex items-center gap-2">
                  <span>Rp</span>
                  <div className="relative">
                    <Input
                      value={formatNumber(totalSetoran)}
                      readOnly
                      className="pr-10 bg-green-50 cursor-default"
                      data-testid="display-total-setoran"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                💸 Pengeluaran (PU)
              </Label>
              <Button
                onClick={addExpenseItem}
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-add-expense"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>

            {/* Reminder for incomplete expenses */}
            {hasIncompleteExpenses && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Reminder:</strong> Ada {incompleteExpenses.length}{" "}
                  item pengeluaran yang belum lengkap. Silakan{" "}
                  <strong>lengkapi semua field</strong> atau{" "}
                  <strong>hapus item</strong> yang tidak digunakan dengan tombol{" "}
                  <Minus className="h-3 w-3 inline mx-1" /> merah.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              {expenses.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Deskripsi"
                    value={item.description}
                    onChange={(e) =>
                      updateExpenseItem(item.id, "description", e.target.value)
                    }
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span>Rp</span>
                    <Input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateExpenseItem(
                          item.id,
                          "amount",
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      className="w-32"
                    />
                  </div>
                  <Button
                    onClick={() => removeExpenseItem(item.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
              <Label className="text-lg font-semibold">
                Total Pengeluaran: {formatRupiah(totalExpenses)}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                💵 Pemasukan (PU)
              </Label>
              <Button
                onClick={addIncomeItem}
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-add-income"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>

            {/* Reminder for incomplete income */}
            {hasIncompleteIncome && (
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Reminder:</strong> Ada {incompleteIncome.length}{" "}
                  item pemasukan yang belum lengkap. Silakan{" "}
                  <strong>lengkapi semua field</strong> atau{" "}
                  <strong>hapus item</strong> yang tidak digunakan dengan tombol{" "}
                  <Minus className="h-3 w-3 inline mx-1" /> merah.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              {income.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Deskripsi"
                    value={item.description}
                    onChange={(e) =>
                      updateIncomeItem(item.id, "description", e.target.value)
                    }
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span>Rp</span>
                    <Input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateIncomeItem(
                          item.id,
                          "amount",
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      className="w-32"
                    />
                  </div>
                  <Button
                    onClick={() => removeIncomeItem(item.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
              <Label className="text-lg font-semibold">
                Total Pemasukan: {formatRupiah(totalIncome)}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Total Overall */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Label className="text-xl font-bold flex items-center justify-center gap-2">
                💼 Total Keseluruhan: {formatRupiah(totalKeseluruhan)}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cash: {formatRupiah(cashSetoran)} + Pemasukan:{" "}
                {formatRupiah(totalIncome)} - Pengeluaran:{" "}
                {formatRupiah(totalExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Validation */}
        <Card
          className={`${isValidated ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                🔐 Validasi Data
                {isValidated && (
                  <span className="text-green-600 text-sm">
                    (✅ Tervalidasi)
                  </span>
                )}
              </Label>

              {!isValidated && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Masukkan nama Anda untuk validasi sebelum copy data
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Masukkan nama Anda"
                      value={validationPassword}
                      onChange={(e) => setValidationPassword(e.target.value)}
                      disabled={!employeeName}
                      data-testid="input-validation-password"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          validatePassword();
                        }
                      }}
                    />
                    <Button
                      onClick={validatePassword}
                      disabled={!validationPassword.trim() || !employeeName}
                      data-testid="button-validate-password"
                    >
                      Validasi
                    </Button>
                  </div>
                </div>
              )}

              {isValidated && (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-sm">
                    Data tervalidasi untuk: {employeeName}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsValidated(false);
                      setValidationPassword("");
                    }}
                    data-testid="button-reset-validation"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save and Copy Buttons */}
        <div className="space-y-3">
          <Button
            onClick={copyAndSave}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
            disabled={!isDataComplete || submitDataMutation.isPending}
            data-testid="button-copy-and-save"
          >
            <Copy className="h-5 w-5" />
            {submitDataMutation.isPending
              ? "Memproses..."
              : "Copy to clipboard"}
          </Button>

          {!isValidated && selectedStaffName && (
            <p className="text-sm text-red-600 text-center">
              ⚠️ Validasi Nama diperlukan sebelum copy data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
