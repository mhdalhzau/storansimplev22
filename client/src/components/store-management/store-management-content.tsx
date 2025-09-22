import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Building, Users, MapPin, Edit, Trash2, Plus, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required"),
  manager: z.string().optional(),
  description: z.string().optional(),
  entryTimeStart: z.string().default("07:00"),
  entryTimeEnd: z.string().default("09:00"),
  exitTimeStart: z.string().default("17:00"),
  exitTimeEnd: z.string().default("19:00"),
  timezone: z.string().default("Asia/Jakarta"),
});

type StoreData = z.infer<typeof storeSchema>;

interface StoreInfo {
  id: number;
  name: string;
  address: string;
  phone: string;
  manager?: string;
  description?: string;
  entryTimeStart?: string;
  entryTimeEnd?: string;
  exitTimeStart?: string;
  exitTimeEnd?: string;
  timezone?: string;
  employeeCount: number;
  status: "active" | "inactive";
  createdAt: string;
}

interface StoreEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  salary?: number;
  joinDate: string;
}

export default function StoreManagementContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [editingStore, setEditingStore] = useState<StoreInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch stores
  const { data: stores = [], refetch: refetchStores, isLoading: storesLoading, error: storesError } = useQuery<StoreInfo[]>({
    queryKey: ["/api/stores"],
    enabled: user?.role === "manager",
  });

  // Fetch users to show available managers
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "manager",
  });

  // Fetch employees for selected store
  const { data: storeEmployees = [], isLoading: employeesLoading, error: employeesError } = useQuery<StoreEmployee[]>({
    queryKey: ["/api/stores", selectedStore?.id, "employees"],
    enabled: user?.role === "manager" && !!selectedStore,
  });

  // Create store mutation
  const createStoreMutation = useMutation({
    mutationFn: async (data: StoreData) => {
      const response = await apiRequest('POST', '/api/stores', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Success",
        description: "Store created successfully",
      });
      refetchStores();
      setActiveTab("list");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update store mutation
  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StoreData> }) => {
      const response = await apiRequest('PATCH', `/api/stores/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Success",
        description: "Store updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setEditDialogOpen(false);
      setEditingStore(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update store",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<StoreData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      manager: "",
      description: "",
      entryTimeStart: "07:00",
      entryTimeEnd: "09:00",
      exitTimeStart: "17:00",
      exitTimeEnd: "19:00",
      timezone: "Asia/Jakarta",
    },
  });

  const editForm = useForm<StoreData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      manager: "",
      description: "",
      entryTimeStart: "07:00",
      entryTimeEnd: "09:00",
      exitTimeStart: "17:00",
      exitTimeEnd: "19:00",
      timezone: "Asia/Jakarta",
    },
  });

  const onCreateStore = (data: StoreData) => {
    createStoreMutation.mutate(data);
  };

  const onEditStore = (data: StoreData) => {
    if (editingStore) {
      updateStoreMutation.mutate({ id: editingStore.id, data });
    }
  };

  const openEditDialog = (store: StoreInfo) => {
    setEditingStore(store);
    editForm.reset({
      name: store.name,
      address: store.address,
      phone: store.phone,
      manager: store.manager || "",
      description: store.description || "",
      entryTimeStart: store.entryTimeStart || "07:00",
      entryTimeEnd: store.entryTimeEnd || "09:00", 
      exitTimeStart: store.exitTimeStart || "17:00",
      exitTimeEnd: store.exitTimeEnd || "19:00",
      timezone: store.timezone || "Asia/Jakarta",
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingStore(null);
    editForm.reset();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (user?.role !== "manager") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Access denied. Manager role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Store Management</h1>
          <p className="text-gray-600">Manage store information and personnel</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Store List</TabsTrigger>
          <TabsTrigger value="create">Create Store</TabsTrigger>
          {selectedStore && <TabsTrigger value="employees">Store Employees</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Store Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storesError && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">Error loading stores: {(storesError as any)?.message}</p>
                </div>
              )}
              {storesLoading && (
                <div className="flex items-center justify-center p-8">
                  <p className="text-gray-500">Loading stores...</p>
                </div>
              )}
              {!storesLoading && stores.length === 0 && !storesError && (
                <div className="text-center p-8">
                  <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No stores found</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first store to get started</p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.address}</TableCell>
                      <TableCell>{store.manager || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {store.employeeCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(store.status)}>
                          {store.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStore(store);
                              setActiveTab("employees");
                            }}
                            data-testid={`button-view-employees-${store.id}`}
                            title="View Employees"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(store)}
                            data-testid={`button-edit-store-${store.id}`}
                            title="Edit Store"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Store
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateStore)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter store name" 
                              data-testid="input-store-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter phone number" 
                              data-testid="input-store-phone"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="manager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manager</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-store-manager">
                                <SelectValue placeholder="Select a manager" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-manager">No Manager</SelectItem>
                                {users
                                  .filter(user => user.role === 'manager')
                                  .map((manager) => (
                                    <SelectItem key={manager.id} value={manager.name}>
                                      {manager.name}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter store address" 
                            data-testid="input-store-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter store description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Entry/Exit Time Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700">Entry Time Settings</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={createForm.control}
                          name="entryTimeStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Start Time</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time" 
                                  data-testid="input-entry-time-start"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="entryTimeEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">End Time</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time" 
                                  data-testid="input-entry-time-end"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700">Exit Time Settings</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={createForm.control}
                          name="exitTimeStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Start Time</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time" 
                                  data-testid="input-exit-time-start"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="exitTimeEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">End Time</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time" 
                                  data-testid="input-exit-time-end"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={createForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                              <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                              <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createStoreMutation.isPending}
                    data-testid="button-create-store"
                  >
                    {createStoreMutation.isPending ? "Creating..." : "Create Store"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {selectedStore && (
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedStore.name} - Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        Store Info
                      </Label>
                      <p className="text-sm text-gray-600 font-medium" data-testid={`text-store-name-${selectedStore.id}`}>{selectedStore.name}</p>
                      <p className="text-xs text-gray-500 flex items-start gap-1 mt-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {selectedStore.address}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Contact</Label>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedStore.phone || "No phone"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Manager</Label>
                      <p className="text-sm text-gray-600">{selectedStore.manager || "No manager assigned"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Employees</Label>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selectedStore.employeeCount} employees
                      </p>
                    </div>
                  </div>
                </div>

                {employeesError && (
                  <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">Error loading employees: {(employeesError as any)?.message}</p>
                  </div>
                )}
                {employeesLoading && (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-gray-500">Loading employees...</p>
                  </div>
                )}
                {!employeesLoading && storeEmployees.length === 0 && !employeesError && (
                  <div className="text-center p-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No employees found in this store</p>
                    <p className="text-sm text-gray-400 mt-1">Employees need to be assigned to this store</p>
                  </div>
                )}

                {!employeesLoading && storeEmployees.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Join Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeEmployees.map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                          <TableCell className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                            {employee.name}
                          </TableCell>
                          <TableCell data-testid={`text-employee-email-${employee.id}`}>
                            {employee.email}
                          </TableCell>
                          <TableCell>
                            <Badge className="capitalize" data-testid={`badge-employee-role-${employee.id}`}>
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-employee-salary-${employee.id}`}>
                            {employee.salary ? formatCurrency(employee.salary) : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-employee-joindate-${employee.id}`}>
                            {new Date(employee.joinDate).toLocaleDateString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Edit Store Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Store: {editingStore?.name}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditStore)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter store name" 
                            data-testid="input-edit-store-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter phone number" 
                            data-testid="input-edit-store-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="manager"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager</FormLabel>
                        <FormControl>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-edit-store-manager">
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-manager">No Manager</SelectItem>
                              {users
                                .filter(user => user.role === 'manager')
                                .map((manager) => (
                                  <SelectItem key={manager.id} value={manager.name}>
                                    {manager.name}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter store address" 
                          data-testid="input-edit-store-address"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter store description" 
                          data-testid="input-edit-store-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Entry/Exit Time Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Entry Time Settings</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={editForm.control}
                        name="entryTimeStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Start Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-edit-entry-time-start"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="entryTimeEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-edit-entry-time-end"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Exit Time Settings</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={editForm.control}
                        name="exitTimeStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Start Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-edit-exit-time-start"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="exitTimeEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                data-testid="input-edit-exit-time-end"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={editForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-edit-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                            <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                            <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={closeEditDialog}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateStoreMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateStoreMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
}