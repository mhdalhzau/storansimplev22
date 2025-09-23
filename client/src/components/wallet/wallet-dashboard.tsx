import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Wallet,
  Calendar,
  Filter,
  CreditCard,
  Building,
  Plus,
  Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
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

export default function WalletDashboard() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

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
        ? `/api/wallet/transactions?storeId=${selectedStoreId}&limit=50`
        : "/api/wallet/transactions?limit=50";
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const getTransactionIcon = (category: string, type: string) => {
    if (category === 'Income') {
      return <Plus className="h-4 w-4 text-green-600" />;
    } else {
      return <Minus className="h-4 w-4 text-red-600" />;
    }
  };

  const getTransactionColor = (category: string) => {
    return category === 'Income' ? 'text-green-600' : 'text-red-600';
  };

  if (isLoadingWallets) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Wallet Dashboard</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeWallets?.map((store) => (
            <Card key={store.storeId} className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-lg">{store.storeName}</h3>
                  </div>
                  <Badge variant="outline">{store.walletCount} Wallet</Badge>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Saldo Total</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid={`wallet-balance-${store.storeId}`}>
                    {store.totalBalance}
                  </p>
                </div>

                {/* Individual Wallets */}
                <div className="space-y-2">
                  {store.wallets.map((wallet, index) => (
                    <div key={wallet.id}>
                      {index > 0 && <Separator className="my-2" />}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">{wallet.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{wallet.balance}</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">{wallet.type}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction History per Store */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Riwayat Transaksi per Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storeWallets && storeWallets.length > 0 ? (
            <Tabs 
              value={selectedStoreId?.toString()} 
              onValueChange={(value) => setSelectedStoreId(parseInt(value))}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3" data-testid="store-tabs">
                {storeWallets.map((store) => (
                  <TabsTrigger 
                    key={store.storeId} 
                    value={store.storeId.toString()}
                    data-testid={`tab-store-${store.storeId}`}
                  >
                    {store.storeName}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {storeWallets.map((store) => (
                <TabsContent key={store.storeId} value={store.storeId.toString()} className="mt-4">
                  <div className="space-y-4">
                    {/* Store Summary */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold">{store.storeName}</h3>
                        <p className="text-sm text-gray-600">Saldo Total: {store.totalBalance}</p>
                      </div>
                      <Badge variant="outline">{store.walletCount} Wallet</Badge>
                    </div>

                    {/* Transactions for this store */}
                    {isLoadingTransactions ? (
                      <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : transactions && transactions.length > 0 ? (
                      <div className="space-y-1">
                        {transactions.map((transaction) => (
                          <div 
                            key={transaction.id} 
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg border-b border-gray-100 last:border-b-0"
                            data-testid={`transaction-${transaction.id}`}
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                {getTransactionIcon(transaction.category, transaction.type)}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {transaction.type}
                                </p>
                                <Badge variant={transaction.category === 'Income' ? 'default' : 'destructive'} className="text-xs">
                                  {transaction.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{format(new Date(transaction.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
                              </div>
                              {transaction.description && (
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  {transaction.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0 text-right">
                              <p className={`text-sm font-semibold ${getTransactionColor(transaction.category)}`}>
                                {transaction.category === 'Income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                              </p>
                              {transaction.paymentStatus && transaction.paymentStatus !== 'lunas' && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {transaction.paymentStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada transaksi untuk {store.storeName}</p>
                        <p className="text-sm mt-1">Transaksi akan muncul di sini</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada data store</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}