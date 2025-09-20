import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, 
  Sheet, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Download,
  Upload,
  RefreshCw
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const googleSheetsConfigSchema = z.object({
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  worksheetName: z.string().min(1, "Worksheet name is required"),
  syncEnabled: z.boolean(),
  autoSync: z.boolean(),
  credentials: z.string().optional(),
});

type GoogleSheetsConfigData = z.infer<typeof googleSheetsConfigSchema>;

interface GoogleSheetsConfig {
  id?: string;
  spreadsheetId: string;
  worksheetName: string;
  syncEnabled: boolean;
  autoSync: boolean;
  lastSyncAt?: string;
  status: "connected" | "disconnected" | "error";
  errorMessage?: string;
}

interface WorksheetInfo {
  name: string;
  id: number;
  rowCount: number;
  columnCount: number;
}

export default function GoogleSheetsConfigContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [worksheets, setWorksheets] = useState<WorksheetInfo[]>([]);
  const [showCredentialsInput, setShowCredentialsInput] = useState(false);

  // Fetch current Google Sheets configuration
  const { data: config, refetch: refetchConfig } = useQuery<GoogleSheetsConfig>({
    queryKey: ["/api/google-sheets/config"],
    enabled: user?.role === "manager",
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google-sheets/test-connection');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Connection Successful",
        description: "Successfully connected to Google Sheets",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/config"] });
      if (data.worksheets) {
        setWorksheets(data.worksheets);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Connection Failed",
        description: error.message || "Failed to connect to Google Sheets",
        variant: "destructive",
      });
    },
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: GoogleSheetsConfigData) => {
      // Validate credentials requirement based on sync state and existing config
      if (data.syncEnabled && !data.credentials && config?.status === "disconnected") {
        throw new Error("Google Service Account credentials are required when sync is enabled and no existing connection exists");
      }
      
      const response = await apiRequest('POST', '/api/google-sheets/config', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Configuration Saved",
        description: "Google Sheets configuration saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/config"] });
      setShowCredentialsInput(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google-sheets/sync');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Sync Complete",
        description: `Synced ${data.recordCount || 0} records to Google Sheets`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Sync Failed",
        description: error.message || "Failed to sync data",
        variant: "destructive",
      });
    },
  });

  // Create new worksheet mutation
  const createWorksheetMutation = useMutation({
    mutationFn: async (worksheetName: string) => {
      const response = await apiRequest('POST', '/api/google-sheets/create-worksheet', { 
        worksheetName 
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Worksheet Created",
        description: `Worksheet "${data.worksheetName}" created successfully`,
      });
      testConnectionMutation.mutate(); // Refresh worksheet list
    },
    onError: (error: any) => {
      toast({
        title: "❌ Creation Failed",
        description: error.message || "Failed to create worksheet",
        variant: "destructive",
      });
    },
  });

  const form = useForm<GoogleSheetsConfigData>({
    resolver: zodResolver(googleSheetsConfigSchema),
    defaultValues: {
      spreadsheetId: "",
      worksheetName: "Sales Data",
      syncEnabled: false,
      autoSync: false,
      credentials: "",
    },
  });

  // Update form when config is loaded
  useEffect(() => {
    if (config) {
      form.reset({
        spreadsheetId: config.spreadsheetId || "",
        worksheetName: config.worksheetName || "Sales Data",
        syncEnabled: config.syncEnabled || false,
        autoSync: config.autoSync || false,
        credentials: "", // Never pre-fill credentials for security
      });
    }
  }, [config, form]);

  const onSaveConfig = (data: GoogleSheetsConfigData) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    setIsConnecting(true);
    testConnectionMutation.mutate();
    setTimeout(() => setIsConnecting(false), 1000);
  };

  const handleManualSync = () => {
    manualSyncMutation.mutate();
  };

  const handleCreateWorksheet = () => {
    const worksheetName = prompt("Enter new worksheet name:");
    if (worksheetName && worksheetName.trim()) {
      createWorksheetMutation.mutate(worksheetName.trim());
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        );
    }
  };

  if (user?.role !== "manager") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Access denied. Manager role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Google Sheets Sync</h1>
          <p className="text-gray-600">Configure integration with Google Sheets for data backup and analysis</p>
        </div>
        {config?.status && (
          <div className="flex items-center gap-3">
            {getStatusBadge(config.status)}
            {config.lastSyncAt && (
              <p className="text-sm text-gray-500">
                Last sync: {new Date(config.lastSyncAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="worksheets">Worksheets</TabsTrigger>
          <TabsTrigger value="sync-status">Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Google Sheets Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSaveConfig)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="spreadsheetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spreadsheet ID</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" 
                              data-testid="input-spreadsheet-id"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Copy the ID from your Google Sheets URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="worksheetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Worksheet Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Sales Data" 
                              data-testid="input-worksheet-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Name of the worksheet/tab to sync data to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="syncEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Sync</FormLabel>
                            <FormDescription>
                              Allow data synchronization to Google Sheets
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-sync-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoSync"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Sync</FormLabel>
                            <FormDescription>
                              Automatically sync data when changes are made
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch("syncEnabled")}
                              data-testid="switch-auto-sync"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Google Service Account Credentials</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCredentialsInput(!showCredentialsInput)}
                        data-testid="button-toggle-credentials"
                      >
                        {showCredentialsInput ? "Hide" : "Show"} Credentials
                      </Button>
                    </div>

                    {showCredentialsInput && (
                      <FormField
                        control={form.control}
                        name="credentials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Account JSON</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Paste your Google Service Account JSON credentials here..."
                                className="min-h-[150px] font-mono text-sm"
                                data-testid="textarea-credentials"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Paste the entire JSON content from your Google Cloud service account key file
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Security Note:</strong> Credentials are securely stored and encrypted. 
                        Make sure your service account has access to the Google Sheets API and 
                        the spreadsheet is shared with the service account email.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={saveConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isConnecting || testConnectionMutation.isPending}
                      data-testid="button-test-connection"
                    >
                      {isConnecting || testConnectionMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worksheets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sheet className="h-5 w-5" />
                  Available Worksheets
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateWorksheet}
                  disabled={createWorksheetMutation.isPending}
                  data-testid="button-create-worksheet"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Worksheet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {worksheets.length === 0 ? (
                <div className="text-center py-8">
                  <Sheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No worksheets found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Test connection first to load available worksheets
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {worksheets.map((worksheet, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Sheet className="w-5 h-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{worksheet.name}</h3>
                          <p className="text-sm text-gray-500">
                            {worksheet.rowCount} rows × {worksheet.columnCount} columns
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {config?.worksheetName === worksheet.name && (
                          <Badge variant="default">Active</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue("worksheetName", worksheet.name)}
                          data-testid={`button-select-worksheet-${worksheet.name}`}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sync Status & Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {config?.errorMessage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sync Error:</strong> {config.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusBadge(config?.status || "disconnected")}
                    </div>
                    <p className="text-sm text-gray-600">Connection Status</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {config?.syncEnabled ? "ON" : "OFF"}
                    </div>
                    <p className="text-sm text-gray-600">Sync Enabled</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {config?.autoSync ? "AUTO" : "MANUAL"}
                    </div>
                    <p className="text-sm text-gray-600">Sync Mode</p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button
                    onClick={handleManualSync}
                    disabled={manualSyncMutation.isPending || !config?.syncEnabled}
                    data-testid="button-manual-sync"
                  >
                    {manualSyncMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Manual Sync Now
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/config"] })}
                    data-testid="button-refresh-status"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>

                {config?.lastSyncAt && (
                  <div className="text-sm text-gray-500">
                    <strong>Last successful sync:</strong> {new Date(config.lastSyncAt).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}