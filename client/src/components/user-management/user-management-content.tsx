import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserPlus, Edit, Trash2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(3, "Password must be at least 3 characters"),
  role: z.enum(["staff", "manager", "administrasi"], {
    errorMap: () => ({ message: "Please select a role" })
  }),
  storeIds: z.array(z.number()).min(1, "Please select at least one store"),
  salary: z.coerce.number().min(0, "Salary must be a positive number").optional(),
});

type CreateUserData = z.infer<typeof createUserSchema>;

interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  stores?: Store[];
  salary?: number;
  createdAt: string;
}

export default function UserManagementContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch users
  const { data: users = [], refetch } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "manager",
  });

  // Fetch stores
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
    enabled: user?.role === "manager",
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await apiRequest('POST', '/api/users', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Success",
        description: "User created successfully",
      });
      refetch();
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

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserData> }) => {
      const response = await apiRequest('PATCH', `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Success",
        description: "User updated successfully",
      });
      refetch();
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "✅ Success",
        description: "User deleted successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
      storeIds: [],
      salary: 0,
    },
  });

  // Watch for role and name changes to auto-set password for staff
  const watchRole = createForm.watch("role");
  const watchName = createForm.watch("name");

  useEffect(() => {
    if (watchRole === "staff" && watchName) {
      createForm.setValue("password", watchName, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchRole, watchName, createForm]);

  const editUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email"),
    role: z.enum(["staff", "manager", "administrasi"], {
      errorMap: () => ({ message: "Please select a role" })
    }),
    storeIds: z.array(z.number()).min(1, "Please select at least one store"),
    salary: z.coerce.number().min(0, "Salary must be a positive number").optional(),
  });

  const editForm = useForm<Omit<CreateUserData, 'password'>>({
    resolver: zodResolver(editUserSchema),
  });

  const onCreateUser = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  const handleEditUser = (userData: User) => {
    setEditingUser(userData);
    editForm.reset({
      name: userData.name,
      email: userData.email,
      role: userData.role as any,
      storeIds: userData.stores?.map(s => s.id) || [],
      salary: userData.salary || 0,
    });
  };

  const handleUpdateUser = (data: Omit<CreateUserData, 'password'>) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    editForm.reset();
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : "Unknown Store";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager": return "bg-blue-100 text-blue-800";
      case "administrasi": return "bg-green-100 text-green-800";
      case "staff": return "bg-gray-100 text-gray-800";
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
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Access denied. Manager role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage employee registration, salaries, and store assignments</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Employee List</TabsTrigger>
          <TabsTrigger value="create">Create Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell className="font-medium">{userData.name}</TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(userData.role)}>
                          {userData.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userData.stores && userData.stores.length > 0
                          ? userData.stores.map(store => store.name).join(", ")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {userData.salary ? formatCurrency(userData.salary) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(userData)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(userData.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
                <UserPlus className="h-5 w-5" />
                Create New Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter employee name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder={watchRole === "staff" ? "Password will be set to name" : "Create password"}
                              readOnly={watchRole === "staff"}
                              className={watchRole === "staff" ? "bg-gray-100 cursor-not-allowed" : ""}
                              data-testid="input-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="staff">Karyawan (Staff)</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="administrasi">Keuangan (Administrator)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="storeIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Assignment</FormLabel>
                          <div className="space-y-2">
                            {stores.map((store) => (
                              <div key={store.id} className="flex items-center space-x-2">
                                <Checkbox
                                  data-testid={`checkbox-store-${store.id}`}
                                  id={`store-${store.id}`}
                                  checked={field.value?.includes(store.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValues, store.id]);
                                    } else {
                                      field.onChange(currentValues.filter((id) => id !== store.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`store-${store.id}`} className="text-sm font-normal">
                                  {store.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary (IDR)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter salary amount" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create Employee"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Employee: {editingUser?.name}
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="staff">Karyawan (Staff)</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="administrasi">Keuangan (Administrator)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="storeIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Assignment</FormLabel>
                      <div className="space-y-2">
                        {stores.map((store) => (
                          <div key={store.id} className="flex items-center space-x-2">
                            <Checkbox
                              data-testid={`checkbox-edit-store-${store.id}`}
                              id={`edit-store-${store.id}`}
                              checked={field.value?.includes(store.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, store.id]);
                                } else {
                                  field.onChange(currentValues.filter((id) => id !== store.id));
                                }
                              }}
                            />
                            <Label htmlFor={`edit-store-${store.id}`} className="text-sm font-normal">
                              {store.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary (IDR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter salary amount" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={updateUserMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateUserMutation.isPending ? "Updating..." : "Update Employee"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={updateUserMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}