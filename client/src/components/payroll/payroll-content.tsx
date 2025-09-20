import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Payroll } from "@shared/schema";
import { Wallet, DollarSign, CheckCircle2 } from "lucide-react";

export default function PayrollContent() {
  const { toast } = useToast();

  const { data: payrollRecords, isLoading } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payroll/generate");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll generated successfully!",
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
            {generatePayrollMutation.isPending ? "Generating..." : "Generate Payroll"}
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
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {record.userId.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{record.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.month}</TableCell>
                    <TableCell>${parseFloat(record.baseSalary).toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(record.overtimePay || "0").toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(record.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={record.status === "paid" ? "default" : "secondary"}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
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
    </Card>
  );
}
