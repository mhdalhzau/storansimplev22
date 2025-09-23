import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Archive, TrendingUp, TrendingDown, AlertTriangle, Search, Package, History, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  InventoryWithProduct, 
  InventoryTransactionWithProduct,
  insertInventoryTransactionSchema, 
  insertInventorySchema,
  type InsertInventoryTransaction,
  type InsertInventory
} from "@shared/schema";
import { format } from "date-fns";

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryWithProduct | null>(null);

  // Fetch inventory
  const { data: inventory = [], isLoading } = useQuery<InventoryWithProduct[]>({
    queryKey: ["/api/inventory"],
    enabled: !!user
  });

  // Fetch inventory transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<InventoryTransactionWithProduct[]>({
    queryKey: ["/api/inventory-transactions"],
    enabled: !!user
  });

  // Transaction form
  const transactionForm = useForm<InsertInventoryTransaction>({
    resolver: zodResolver(insertInventoryTransactionSchema),
    defaultValues: {
      productId: "",
      type: "in",
      quantity: "",
      notes: "",
    },
  });

  // Settings form
  const settingsForm = useForm<InsertInventory>({
    resolver: zodResolver(insertInventorySchema),
    defaultValues: {
      minimumStock: "",
      maximumStock: "",
    },
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: InsertInventoryTransaction) => {
      const res = await apiRequest("POST", "/api/inventory-transactions", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory transaction recorded successfully!",
      });
      closeTransactionModal();
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  // Update inventory settings mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInventory> }) => {
      const res = await apiRequest("PUT", `/api/inventory/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory settings updated successfully!",
      });
      closeSettingsModal();
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory settings",
        variant: "destructive",
      });
    },
  });

  // Filter inventory based on search term
  const filteredInventory = inventory.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.product.name.toLowerCase().includes(searchLower) ||
      (item.product.sku || "").toLowerCase().includes(searchLower) ||
      (item.product.category || "").toLowerCase().includes(searchLower)
    );
  });

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setSelectedProduct(null);
    transactionForm.reset();
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setSelectedProduct(null);
    settingsForm.reset();
  };

  const handleAddTransaction = (product?: InventoryWithProduct) => {
    if (product) {
      setSelectedProduct(product);
      transactionForm.setValue("productId", product.productId);
    }
    setIsTransactionModalOpen(true);
  };

  const handleUpdateSettings = (product: InventoryWithProduct) => {
    setSelectedProduct(product);
    settingsForm.reset({
      minimumStock: product.minimumStock,
      maximumStock: product.maximumStock || "",
    });
    setIsSettingsModalOpen(true);
  };

  const handleTransactionSubmit = (data: InsertInventoryTransaction) => {
    createTransactionMutation.mutate(data);
  };

  const handleSettingsSubmit = (data: InsertInventory) => {
    if (selectedProduct) {
      updateInventoryMutation.mutate({ 
        id: selectedProduct.id, 
        data: {
          minimumStock: data.minimumStock,
          maximumStock: data.maximumStock,
        }
      });
    }
  };

  const getStockStatus = (item: InventoryWithProduct) => {
    const current = parseFloat(item.currentStock);
    const minimum = parseFloat(item.minimumStock);
    const maximum = item.maximumStock ? parseFloat(item.maximumStock) : null;

    if (current <= minimum) {
      return { status: "low", label: "Low Stock", color: "destructive" };
    } else if (maximum && current >= maximum) {
      return { status: "high", label: "Overstock", color: "secondary" };
    } else {
      return { status: "normal", label: "Normal", color: "default" };
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "in":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "out":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "adjustment":
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const canCreateOrEdit = user?.role === "manager" || user?.role === "administrasi";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor and manage your product inventory</p>
        </div>
        {canCreateOrEdit && (
          <Button onClick={() => handleAddTransaction()} data-testid="button-add-transaction">
            <Plus className="mr-2 h-4 w-4" />
            Record Transaction
          </Button>
        )}
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
          </div>

          {/* Inventory Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInventory.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <Card key={item.id} className="relative" data-testid={`card-inventory-${item.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-product-name-${item.id}`}>
                          {item.product.name}
                        </CardTitle>
                        {item.product.sku && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-product-sku-${item.id}`}>
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                      {canCreateOrEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateSettings(item)}
                            data-testid={`button-settings-${item.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddTransaction(item)}
                            data-testid={`button-add-transaction-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={stockStatus.color as any} data-testid={`badge-status-${item.id}`}>
                          {stockStatus.label}
                        </Badge>
                        {stockStatus.status === "low" && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Current</p>
                          <p className="font-bold text-lg" data-testid={`text-current-stock-${item.id}`}>
                            {parseFloat(item.currentStock).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Min</p>
                          <p className="font-medium" data-testid={`text-min-stock-${item.id}`}>
                            {parseFloat(item.minimumStock).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max</p>
                          <p className="font-medium" data-testid={`text-max-stock-${item.id}`}>
                            {item.maximumStock ? parseFloat(item.maximumStock).toLocaleString() : "-"}
                          </p>
                        </div>
                      </div>

                      {item.product.category && (
                        <Badge variant="outline" data-testid={`badge-category-${item.id}`}>
                          {item.product.category}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredInventory.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No inventory found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "No inventory items match your search criteria."
                      : "Inventory items will appear here when you add products."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 50).map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell data-testid={`text-date-${transaction.id}`}>
                          {format(new Date(transaction.createdAt), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell data-testid={`text-product-${transaction.id}`}>
                          <div>
                            <p className="font-medium">{transaction.product.name}</p>
                            {transaction.product.sku && (
                              <p className="text-sm text-muted-foreground">{transaction.product.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-type-${transaction.id}`}>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <span className="capitalize">{transaction.type}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-quantity-${transaction.id}`}>
                          <span className={transaction.type === "out" ? "text-red-600" : "text-green-600"}>
                            {transaction.type === "out" ? "-" : "+"}{parseFloat(transaction.quantity).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-user-${transaction.id}`}>
                          {transaction.user?.email || "Unknown"}
                        </TableCell>
                        <TableCell data-testid={`text-notes-${transaction.id}`}>
                          {transaction.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={(open) => !open && closeTransactionModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inventory Transaction</DialogTitle>
            <DialogDescription>
              Add or remove stock for {selectedProduct?.product.name || "a product"}
            </DialogDescription>
          </DialogHeader>
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit(handleTransactionSubmit)} className="space-y-4">
              <FormField
                control={transactionForm.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-product">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.productId} value={item.productId}>
                            {item.product.name} {item.product.sku && `(${item.product.sku})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-type">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">Stock In</SelectItem>
                        <SelectItem value="out">Stock Out</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional notes about this transaction" 
                        className="min-h-[60px]" 
                        {...field} 
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                  data-testid="button-submit-transaction"
                >
                  Record Transaction
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeTransactionModal}
                  data-testid="button-cancel-transaction"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={(open) => !open && closeSettingsModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Inventory Settings</DialogTitle>
            <DialogDescription>
              Set minimum and maximum stock levels for {selectedProduct?.product.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        data-testid="input-min-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="maximumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Stock Level</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Leave empty for no limit" 
                        {...field} 
                        data-testid="input-max-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={updateInventoryMutation.isPending}
                  data-testid="button-submit-settings"
                >
                  Update Settings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeSettingsModal}
                  data-testid="button-cancel-settings"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}