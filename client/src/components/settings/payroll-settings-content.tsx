import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Calculator, 
  Clock, 
  DollarSign, 
  Save, 
  Wallet,
  Users,
  Building
} from "lucide-react";

// Schema for payroll configuration
const payrollConfigSchema = z.object({
  payrollCycle: z.enum(["28", "30"], {
    errorMap: () => ({ message: "Please select payroll cycle" })
  }),
  overtimeRate: z.coerce.number().min(0, "Overtime rate must be positive").default(10000),
  startDate: z.string().min(1, "Start date is required"),
});

type PayrollConfigData = z.infer<typeof payrollConfigSchema>;

interface PayrollConfig {
  payrollCycle: string;
  overtimeRate: number;
  startDate: string;
  nextPayrollDate: string;
}

export default function PayrollSettingsContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("config");

  // Fetch current payroll configuration
  const { data: payrollConfig, isLoading } = useQuery<PayrollConfig>({
    queryKey: ["/api/payroll/config"],
    retry: false,
  });

  // Fetch stores for per-store configuration
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/stores"],
  });

  const configForm = useForm<PayrollConfigData>({
    resolver: zodResolver(payrollConfigSchema),
    defaultValues: {
      payrollCycle: "30",
      overtimeRate: 10000,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  // Update form values when config data loads
  useEffect(() => {
    if (payrollConfig) {
      configForm.reset({
        payrollCycle: payrollConfig.payrollCycle as "28" | "30",
        overtimeRate: payrollConfig.overtimeRate,
        startDate: payrollConfig.startDate,
      });
    }
  }, [payrollConfig, configForm]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: PayrollConfigData) => {
      const res = await apiRequest("POST", "/api/payroll/config", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll configuration updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/config"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payroll configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmitConfig = (data: PayrollConfigData) => {
    updateConfigMutation.mutate(data);
  };

  const calculateNextPayrollDate = (startDate: string, cycle: string) => {
    const start = new Date(startDate);
    const days = parseInt(cycle);
    const next = new Date(start);
    next.setDate(start.getDate() + days);
    return next.toLocaleDateString('id-ID');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2" data-testid="tab-payroll-config">
            <Calendar className="h-4 w-4" />
            Payroll Configuration
          </TabsTrigger>
          <TabsTrigger value="formula" className="flex items-center gap-2" data-testid="tab-salary-formula">
            <Calculator className="h-4 w-4" />
            Salary Formula
          </TabsTrigger>
        </TabsList>

        {/* Payroll Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Payroll Date Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onSubmitConfig)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="payrollCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payroll Cycle</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-payroll-cycle">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payroll cycle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="28">Every 28 days</SelectItem>
                              <SelectItem value="30">Every 30 days</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={configForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              data-testid="input-start-date"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={configForm.control}
                    name="overtimeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Rate (per hour)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000"
                            data-testid="input-overtime-rate"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preview Next Payroll Date */}
                  {configForm.watch("startDate") && configForm.watch("payrollCycle") && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900 dark:text-blue-100">Next Payroll Date</span>
                      </div>
                      <p className="text-blue-800 dark:text-blue-200">
                        {calculateNextPayrollDate(configForm.watch("startDate"), configForm.watch("payrollCycle"))}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateConfigMutation.isPending}
                      data-testid="button-save-config"
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Formula Tab */}
        <TabsContent value="formula" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Salary Calculation Formula
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formula Description */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Current Formula
                </h3>
                <div className="text-green-800 dark:text-green-200 space-y-2">
                  <p className="font-mono text-sm bg-white dark:bg-green-900 p-2 rounded">
                    Total Salary = (Total Working Days × Daily Salary) + (Total Overtime Hours × Rp {configForm.watch("overtimeRate")?.toLocaleString("id-ID") || "10,000"})
                  </p>
                  <div className="text-sm space-y-1">
                    <p>• <strong>Daily Salary</strong> = Monthly Salary ÷ {configForm.watch("payrollCycle") || "30"} days</p>
                    <p>• <strong>Working Days</strong> = Days with attendance records</p>
                    <p>• <strong>Overtime Hours</strong> = Total approved overtime hours</p>
                    <p>• <strong>Overtime Rate</strong> = Rp {configForm.watch("overtimeRate")?.toLocaleString("id-ID") || "10,000"} per hour</p>
                  </div>
                </div>
              </div>

              {/* Store-specific Configuration */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Store Configuration
                </h3>
                {stores.length > 0 ? (
                  <div className="grid gap-4">
                    {stores.map((store: any) => (
                      <Card key={store.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{store.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Formula applies to all staff in this store
                              </p>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Active
                            </Badge>
                          </div>
                          <Separator className="my-3" />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Payroll Cycle:</span>
                              <p className="font-medium">{configForm.watch("payrollCycle") || "30"} days</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Overtime Rate:</span>
                              <p className="font-medium">Rp {configForm.watch("overtimeRate")?.toLocaleString("id-ID") || "10,000"}/hour</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No stores configured. Add stores in Store Management first.
                  </div>
                )}
              </div>

              {/* Example Calculation */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Example Calculation
                </h3>
                <div className="text-sm space-y-2">
                  <p><strong>Staff:</strong> John Doe</p>
                  <p><strong>Monthly Salary:</strong> Rp 3,000,000</p>
                  <p><strong>Working Days:</strong> 25 days</p>
                  <p><strong>Overtime Hours:</strong> 8 hours</p>
                  <hr className="my-2" />
                  <p><strong>Daily Salary:</strong> Rp 3,000,000 ÷ {configForm.watch("payrollCycle") || "30"} = Rp {Math.round(3000000 / (parseInt(configForm.watch("payrollCycle") || "30"))).toLocaleString("id-ID")}</p>
                  <p><strong>Base Pay:</strong> Rp {Math.round(3000000 / (parseInt(configForm.watch("payrollCycle") || "30"))).toLocaleString("id-ID")} × 25 = Rp {(Math.round(3000000 / (parseInt(configForm.watch("payrollCycle") || "30"))) * 25).toLocaleString("id-ID")}</p>
                  <p><strong>Overtime Pay:</strong> Rp {configForm.watch("overtimeRate")?.toLocaleString("id-ID") || "10,000"} × 8 = Rp {((configForm.watch("overtimeRate") || 10000) * 8).toLocaleString("id-ID")}</p>
                  <p className="font-bold text-green-600"><strong>Total Salary:</strong> Rp {((Math.round(3000000 / (parseInt(configForm.watch("payrollCycle") || "30"))) * 25) + ((configForm.watch("overtimeRate") || 10000) * 8)).toLocaleString("id-ID")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}