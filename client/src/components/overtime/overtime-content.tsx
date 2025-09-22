import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Overtime, insertOvertimeSchema } from "@shared/schema";
import { calculateOvertimeFromMinutes, formatOvertimeDuration } from "@shared/overtime-utils";
import { Timer, CheckCircle2, XCircle, Cloud, Plus, Clock } from "lucide-react";
import { z } from "zod";

// Form schema for overtime submission
const overtimeFormSchema = insertOvertimeSchema.extend({
  minutes: z.number().min(1, "Waktu lembur minimal 1 menit").optional(),
  hours: z.number().min(0.01, "Jam lembur minimal 0.01 jam").optional(),
}).refine((data) => data.hours || data.minutes, {
  message: "Harap isi jam atau menit lembur",
  path: ["hours"]
});

type OvertimeFormData = z.infer<typeof overtimeFormSchema>;

export default function OvertimeContent() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<OvertimeFormData>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      date: new Date(),
      hours: 0,
      minutes: 0,
      reason: ""
    },
  });

  const { data: overtimeRequests, isLoading } = useQuery<Overtime[]>({
    queryKey: ["/api/overtime"],
  });

  const createOvertimeMutation = useMutation({
    mutationFn: async (data: OvertimeFormData) => {
      // Calculate final hours from either hours or minutes input
      let finalHours = data.hours || 0;
      if (data.minutes && data.minutes > 0) {
        const calculation = calculateOvertimeFromMinutes(data.minutes);
        finalHours = calculation.totalHours;
      }
      
      const payload = {
        date: data.date,
        hours: finalHours.toString(), // Convert to string for server validation
        reason: data.reason,
        storeId: data.storeId
      };
      
      const res = await apiRequest("POST", "/api/overtime", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Permintaan lembur berhasil diajukan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOvertimeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/overtime/${id}`, { status });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Berhasil",
        description: `Lembur ${variables.status === 'approved' ? 'disetujui' : 'ditolak'} berhasil!`,
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
        title: "Berhasil",
        description: `Sync selesai! ${data.recordsCount} data berhasil disinkronkan.`,
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

  const onSubmit = (data: OvertimeFormData) => {
    createOvertimeMutation.mutate(data);
  };

  // Watch form values for real-time calculation display
  const watchedHours = form.watch("hours");
  const watchedMinutes = form.watch("minutes");
  
  const displayCalculation = () => {
    if (watchedMinutes && watchedMinutes > 0) {
      const calc = calculateOvertimeFromMinutes(watchedMinutes);
      return formatOvertimeDuration(calc.totalMinutes);
    } else if (watchedHours && watchedHours > 0) {
      const calc = calculateOvertimeFromMinutes(watchedHours * 60);
      return formatOvertimeDuration(calc.totalMinutes);
    }
    return "0 menit";
  };

  return (
    <div className="space-y-6">
      {/* Overtime Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Manajemen Lembur Karyawan
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" data-testid="button-add-overtime">
                  <Plus className="h-4 w-4" />
                  Ajukan Lembur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Ajukan Permintaan Lembur</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Lembur</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              data-testid="input-overtime-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jam Lembur</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  form.setValue("minutes", 0); // Reset minutes when hours is set
                                }}
                                data-testid="input-overtime-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Atau Menit Lembur</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value) || 0);
                                  form.setValue("hours", 0); // Reset hours when minutes is set
                                }}
                                data-testid="input-overtime-minutes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      <strong>Durasi Lembur:</strong> {displayCalculation()}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alasan Lembur</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Jelaskan alasan mengapa memerlukan lembur..."
                              {...field}
                              data-testid="textarea-overtime-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel-overtime"
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createOvertimeMutation.isPending}
                        data-testid="button-submit-overtime"
                      >
                        {createOvertimeMutation.isPending ? "Menyimpan..." : "Ajukan Lembur"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Overtime Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Persetujuan Lembur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Memuat permintaan lembur...</div>
          ) : overtimeRequests && overtimeRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{request.hours} jam</span>
                          <span className="text-xs text-muted-foreground">
                            {formatOvertimeDuration(parseFloat(request.hours) * 60)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            request.status === "approved" ? "default" : 
                            request.status === "rejected" ? "destructive" : 
                            "secondary"
                          }
                        >
                          {request.status === "approved" ? "Disetujui" : 
                           request.status === "rejected" ? "Ditolak" : 
                           "Menunggu"}
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
                              Setujui
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
                              Tolak
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
              <p>Tidak ada permintaan lembur</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Sheets Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Integrasi Google Sheets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Sync Data ke Google Sheets</p>
              <p className="text-sm text-muted-foreground">Export data absensi, penjualan, dan payroll</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => syncToGoogleSheetsMutation.mutate()}
                disabled={syncToGoogleSheetsMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-sync-google-sheets"
              >
                <Cloud className="h-4 w-4 mr-2" />
                {syncToGoogleSheetsMutation.isPending ? "Syncing..." : "Sync Sekarang"}
              </Button>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Terhubung
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
