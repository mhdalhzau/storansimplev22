import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Overtime } from "@shared/schema";
import { Timer, CheckCircle2, XCircle, Cloud } from "lucide-react";

export default function OvertimeContent() {
  const { toast } = useToast();

  const { data: overtimeRequests, isLoading } = useQuery<Overtime[]>({
    queryKey: ["/api/overtime"],
  });

  const updateOvertimeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/overtime/${id}`, { status });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Overtime ${variables.status} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncToGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/store/1/sync");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Sync completed! ${data.recordsCount} records synced.`,
      });
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
    <div className="space-y-6">
      {/* Overtime Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Overtime Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading overtime requests...</div>
          ) : overtimeRequests && overtimeRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {request.userId.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{request.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.date ? new Date(request.date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{request.hours} hrs</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            request.status === "approved" ? "default" : 
                            request.status === "rejected" ? "destructive" : 
                            "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateOvertimeMutation.mutate({ 
                                id: request.id, 
                                status: "approved" 
                              })}
                              disabled={updateOvertimeMutation.isPending}
                              data-testid={`button-approve-overtime-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateOvertimeMutation.mutate({ 
                                id: request.id, 
                                status: "rejected" 
                              })}
                              disabled={updateOvertimeMutation.isPending}
                              data-testid={`button-reject-overtime-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No overtime requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Sheets Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Sync Data to Google Sheets</p>
              <p className="text-sm text-muted-foreground">Export attendance, sales, and payroll data</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => syncToGoogleSheetsMutation.mutate()}
                disabled={syncToGoogleSheetsMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-sync-google-sheets"
              >
                <Cloud className="h-4 w-4 mr-2" />
                {syncToGoogleSheetsMutation.isPending ? "Syncing..." : "Sync Now"}
              </Button>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Connected
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
