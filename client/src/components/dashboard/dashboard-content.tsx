import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, FileText, TrendingUp, Clock, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalIncome: string;
  totalExpenses: string;
  profit: string;
  totalWalletBalance: string;
  pendingProposals: number;
  monthlyCashflow: string;
}

export default function DashboardContent() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bank Balance (Wallet Simulator) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-income">
                  {stats?.totalIncome || "Rp 0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-expenses">
                  {stats?.totalExpenses || "Rp 0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                stats?.profit && stats.profit.includes('-') 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                <DollarSign className={`h-6 w-6 ${
                  stats?.profit && stats.profit.includes('-') 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Keuntungan</p>
                <p className={`text-2xl font-bold ${
                  stats?.profit && stats.profit.includes('-') 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`} data-testid="text-profit">
                  {stats?.profit || "Rp 0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Bank (Multi Wallet)</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-wallet-balance">
                  {stats?.totalWalletBalance || "Rp 0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent attendance records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
