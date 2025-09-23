import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Building2,
  Wallet
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { type Cashflow } from "@shared/schema";
import { useState, useEffect } from "react";

interface WalletTransaction extends Cashflow {
  storeName: string;
}

interface StoreWallet {
  storeId: number;
  storeName: string;
  totalBalance: string;
  walletCount: number;
  wallets: {
    id: string;
    name: string;
    type: string;
    balance: string;
  }[];
}

const months = [
  { key: 'juni', label: 'Juni', value: '06' },
  { key: 'juli', label: 'Juli', value: '07' },
  { key: 'agustus', label: 'Agustus', value: '08' },
  { key: 'september', label: 'September', value: '09' }
];

export default function MobileBankingWallet() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('september');
  
  const { data: storeWallets, isLoading: isLoadingWallets } = useQuery<StoreWallet[]>({
    queryKey: ["/api/dashboard/store-wallets"],
  });

  // Set default selected store when stores load
  useEffect(() => {
    if (storeWallets && storeWallets.length > 0 && selectedStoreId === null) {
      setSelectedStoreId(storeWallets[0].storeId);
    }
  }, [storeWallets, selectedStoreId]);

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions", selectedStoreId],
    queryFn: async () => {
      const url = selectedStoreId 
        ? `/api/wallet/transactions?storeId=${selectedStoreId}&limit=100`
        : "/api/wallet/transactions?limit=100";
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: selectedStoreId !== null,
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  const getTransactionIcon = (type: string, category: string) => {
    if (type.toLowerCase().includes('biaya') || type.toLowerCase().includes('fee')) {
      return (
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-red-600" />
        </div>
      );
    } else if (category === 'Expense' || type.toLowerCase().includes('keluar') || type.toLowerCase().includes('pembayaran')) {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <TrendingDown className="h-5 w-5 text-blue-600" />
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-yellow-600" />
        </div>
      );
    }
  };

  const getTransactionTitle = (type: string, category: string) => {
    if (type.toLowerCase().includes('biaya') || type.toLowerCase().includes('fee')) {
      return 'Biaya';
    } else if (category === 'Expense' || type.toLowerCase().includes('keluar') || type.toLowerCase().includes('pembayaran')) {
      return 'Dana Keluar';
    } else {
      return 'Dana Masuk';
    }
  };

  const filterTransactionsByMonth = (transactions: WalletTransaction[], month: string) => {
    if (!transactions) return [];
    
    const monthValue = months.find(m => m.key === month)?.value;
    if (!monthValue) return transactions;

    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, parseInt(monthValue) - 1, 1);
    const endDate = new Date(currentYear, parseInt(monthValue), 0);

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  const groupTransactionsByDate = (transactions: WalletTransaction[]) => {
    if (!transactions) return {};
    
    return transactions.reduce((groups, transaction) => {
      const date = format(new Date(transaction.date), 'dd MMMM yyyy', { locale: localeId }).toUpperCase();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, WalletTransaction[]>);
  };

  const selectedStore = storeWallets?.find(store => store.storeId === selectedStoreId);
  const filteredTransactions = filterTransactionsByMonth(transactions || [], selectedMonth);
  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  if (isLoadingWallets) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Informasi Wallet per Store</h1>
        <p className="text-gray-600">Kelola cashflow dan transaksi untuk setiap toko</p>
      </div>

      {/* Store Wallets Table */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Wallet per Store</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingWallets ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : storeWallets && storeWallets.length > 0 ? (
                storeWallets.map((store) => (
                  <tr key={store.storeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {store.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{store.totalBalance || 'Rp 0,00'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedStoreId(store.storeId)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          selectedStoreId === store.storeId
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        data-testid={`select-store-${store.storeId}`}
                      >
                        {selectedStoreId === store.storeId ? 'Dipilih' : 'Pilih'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada data store
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Store Transactions */}
      {selectedStore && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Transaksi - {selectedStore.storeName}
            </h2>
            <div className="flex gap-2">
              {months.map((month) => (
                <button
                  key={month.key}
                  onClick={() => setSelectedMonth(month.key)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    selectedMonth === month.key
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  data-testid={`month-tab-${month.key}`}
                >
                  {month.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jenis Transaksi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingTransactions ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    </tr>
                  ))
                ) : filteredTransactions && filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50" data-testid={`transaction-${transaction.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(transaction.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type, transaction.category)}
                          <span>{getTransactionTitle(transaction.type, transaction.category)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {transaction.description || transaction.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.category === 'Income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.category === 'Income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Tidak ada transaksi di bulan {months.find(m => m.key === selectedMonth)?.label}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}