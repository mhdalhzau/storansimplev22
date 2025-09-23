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
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Mobile Banking Header */}
      <div className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-500 pb-8">
        {/* Abstract green paint splash overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-12 left-0 w-full h-20 bg-green-400 opacity-80 transform -skew-y-3 rotate-12"></div>
          <div className="absolute top-16 right-0 w-3/4 h-16 bg-green-300 opacity-70 transform skew-y-2 -rotate-6"></div>
        </div>
        
        {/* Header content */}
        <div className="relative z-10 px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <ArrowLeft className="h-5 w-5 text-white" />
            <h1 className="text-white text-base font-medium">Tabungan Bisnis</h1>
            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center">
              <span className="text-white text-xs">i</span>
            </div>
          </div>
          
          {/* Store selector for multiple stores */}
          {storeWallets && storeWallets.length > 1 && (
            <div className="mb-4">
              <select 
                value={selectedStoreId || ''} 
                onChange={(e) => setSelectedStoreId(parseInt(e.target.value))}
                className="bg-white/20 text-white text-sm rounded-lg px-3 py-2 border border-white/30 w-full"
                data-testid="store-selector"
              >
                {storeWallets.map(store => (
                  <option key={store.storeId} value={store.storeId} className="text-gray-900">
                    {store.storeName}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Balance */}
          <div className="text-center">
            <div className="text-white text-3xl font-bold mb-1">
              {selectedStore?.totalBalance || 'Rp 0,00'}
            </div>
            <div className="text-white/80 text-sm">
              {selectedStore?.storeName}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction section */}
      <div className="bg-white rounded-t-3xl -mt-4 relative z-20 px-4 pt-6 pb-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Mutasi Keuangan</h2>
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Month tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {months.map((month) => (
            <button
              key={month.key}
              onClick={() => setSelectedMonth(month.key)}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                selectedMonth === month.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid={`month-tab-${month.key}`}
            >
              {month.label}
            </button>
          ))}
          <button className="px-2 py-2 rounded-md">
            <Calendar className="h-3 w-3 text-gray-600" />
          </button>
        </div>

        {/* Transactions */}
        <div className="space-y-4">
          {isLoadingTransactions ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : Object.keys(groupedTransactions).length > 0 ? (
            Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <div key={date}>
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase">{date}</div>
                <div className="space-y-3">
                  {dayTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center gap-3 py-1"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      {getTransactionIcon(transaction.type, transaction.category)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {getTransactionTitle(transaction.type, transaction.category)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {transaction.description || transaction.type}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-semibold text-sm ${
                          transaction.category === 'Income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.category === 'Income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tidak ada transaksi di bulan {months.find(m => m.key === selectedMonth)?.label}</p>
              <p className="text-xs mt-1">Transaksi akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}