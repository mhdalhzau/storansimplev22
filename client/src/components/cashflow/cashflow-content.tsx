import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Cashflow } from "@shared/schema";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

const cashflowSchema = z.object({
  category: z.enum(["Income", "Expense", "Investment"], {
    errorMap: () => ({ message: "Please select a category" })
  }),
  type: z.enum(["Sales", "Inventory", "Utilities", "Salary", "Other", "Pembelian Minyak"], {
    errorMap: () => ({ message: "Please select a type" })
  }),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
  // Additional fields for Pembelian Minyak
  jumlahGalon: z.coerce.number().positive("Jumlah galon must be positive").optional(),
  pajakOngkos: z.coerce.number().optional(),
  pajakTransfer: z.coerce.number().optional(),
  totalPengeluaran: z.coerce.number().optional(),
});

type CashflowData = z.infer<typeof cashflowSchema>;

export default function CashflowContent() {
  const { toast } = useToast();

  const form = useForm<CashflowData>({
    resolver: zodResolver(cashflowSchema),
    defaultValues: {
      category: "Expense",
      type: "Other",
      amount: 0,
      description: "",
      jumlahGalon: 0,
      pajakOngkos: 0,
      pajakTransfer: 2500,
      totalPengeluaran: 0,
    },
  });

  const watchType = form.watch("type");
  const watchJumlahGalon = form.watch("jumlahGalon");

  // Helper function to round up pajak ongkos
  const roundUpPajakOngkos = (amount: number): number => {
    if (amount <= 96000) return 100000;
    if (amount <= 154000) return 160000;
    // For amounts above 154000, round up to the next 10000
    return Math.ceil(amount / 10000) * 10000;
  };

  // Watch for changes in jumlahGalon when type is "Pembelian Minyak"
  useEffect(() => {
    if (watchType === "Pembelian Minyak" && watchJumlahGalon && watchJumlahGalon > 0) {
      const baseAmount = watchJumlahGalon * 340000;
      const rawPajakOngkos = watchJumlahGalon * 12000;
      const pajakOngkos = roundUpPajakOngkos(rawPajakOngkos);
      const pajakTransfer = 2500;
      const totalPengeluaran = baseAmount + pajakOngkos + pajakTransfer;

      form.setValue("amount", baseAmount);
      form.setValue("pajakOngkos", pajakOngkos);
      form.setValue("pajakTransfer", pajakTransfer);
      form.setValue("totalPengeluaran", totalPengeluaran);
    } else if (watchType !== "Pembelian Minyak") {
      // Reset fields when type is not "Pembelian Minyak"
      form.setValue("jumlahGalon", 0);
      form.setValue("pajakOngkos", 0);
      form.setValue("pajakTransfer", 2500);
      form.setValue("totalPengeluaran", 0);
    }
  }, [watchType, watchJumlahGalon, form]);

  const { data: cashflowRecords, isLoading } = useQuery<Cashflow[]>({
    queryKey: ["/api/cashflow"],
  });

  const submitCashflowMutation = useMutation({
    mutationFn: async (data: CashflowData) => {
      const res = await apiRequest("POST", "/api/cashflow", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cashflow entry saved successfully!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/cashflow"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CashflowData) => {
    submitCashflowMutation.mutate(data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add Cashflow Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Cashflow Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                        <SelectItem value="Investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Inventory">Inventory</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Pembelian Minyak">Pembelian Minyak</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional fields for Pembelian Minyak */}
              {watchType === "Pembelian Minyak" && (
                <FormField
                  control={form.control}
                  name="jumlahGalon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Galon</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0"
                          data-testid="input-jumlah-galon"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-amount"
                        readOnly={watchType === "Pembelian Minyak"}
                        className={watchType === "Pembelian Minyak" ? "bg-gray-50" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional readonly fields for Pembelian Minyak */}
              {watchType === "Pembelian Minyak" && (
                <>
                  <FormField
                    control={form.control}
                    name="pajakOngkos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pajak Ongkos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-pajak-ongkos"
                            readOnly
                            className="bg-gray-50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pajakTransfer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pajak Transfer</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="2500.00"
                            data-testid="input-pajak-transfer"
                            readOnly
                            className="bg-gray-50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalPengeluaran"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Pengeluaran</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-total-pengeluaran"
                            readOnly
                            className="bg-gray-50 font-semibold"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter description..."
                        data-testid="input-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={submitCashflowMutation.isPending}
                data-testid="button-save-cashflow"
              >
                {submitCashflowMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading cashflow records...</div>
          ) : cashflowRecords && cashflowRecords.length > 0 ? (
            <div className="space-y-4">
              {cashflowRecords.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      entry.category === "Income" 
                        ? "bg-green-100" 
                        : entry.category === "Expense" 
                        ? "bg-red-100" 
                        : "bg-blue-100"
                    }`}>
                      {entry.category === "Income" ? (
                        <TrendingUp className={`h-4 w-4 ${
                          entry.category === "Income" ? "text-green-600" : ""
                        }`} />
                      ) : (
                        <TrendingDown className={`h-4 w-4 ${
                          entry.category === "Expense" ? "text-red-600" : "text-blue-600"
                        }`} />
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
                  <span className={`font-semibold ${
                    entry.category === "Income" ? "text-green-600" : "text-red-600"
                  }`}>
                    {entry.category === "Income" ? "+" : "-"}${parseFloat(entry.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No cashflow entries found</p>
              <p className="text-sm">Add your first entry using the form</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
