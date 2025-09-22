import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Mail, Phone, MapPin, Edit, Trash2, Search, UserCheck, Building } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Customer, insertCustomerSchema, type InsertCustomer, type User } from "@shared/schema";

export default function CustomerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: !!user
  });

  // Fetch staff users from all branches
  const { data: staffUsers = [], isLoading: isLoadingStaff } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && (user.role === "manager" || user.role === "administrasi")
  });

  // Customer form for add/edit
  const customerForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCustomer }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (customer.name || "").toLowerCase().includes(searchLower) ||
      (customer.email || "").toLowerCase().includes(searchLower) ||
      (customer.phone || "").toLowerCase().includes(searchLower)
    );
  });

  // Filter staff users based on search term
  const filteredStaffUsers = staffUsers.filter((staff) => {
    const searchLower = staffSearchTerm.toLowerCase();
    return (
      (staff.name || "").toLowerCase().includes(searchLower) ||
      (staff.email || "").toLowerCase().includes(searchLower) ||
      (staff.role || "").toLowerCase().includes(searchLower) ||
      (staff.stores && staff.stores.some(store => store.name.toLowerCase().includes(searchLower)))
    );
  });

  const onSubmitCustomer = (data: InsertCustomer) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    customerForm.reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
  };

  const handleDeleteCustomer = (customer: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingCustomer(null);
    customerForm.reset();
  };

  if (isLoading || isLoadingStaff) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="title-customer-management">
              Customer & Staff Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage customers, staff users across all branches
            </p>
          </div>
        </div>
        <Dialog open={isAddModalOpen || !!editingCustomer} onOpenChange={(open) => open ? setIsAddModalOpen(true) : closeModal()}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-add-customer">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer information" : "Create a new customer for your debt transactions"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit(onSubmitCustomer)} className="space-y-4">
                <FormField
                  control={customerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter customer name"
                          data-testid="input-customer-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Enter email address"
                          data-testid="input-customer-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter phone number"
                          data-testid="input-customer-phone"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customerForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter customer address"
                          data-testid="input-customer-address"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={closeModal}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                    data-testid="button-save"
                  >
                    {createCustomerMutation.isPending || updateCustomerMutation.isPending ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Customers and Staff */}
      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2" data-testid="tab-customers">
            <Users className="h-4 w-4" />
            External Customers
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2" data-testid="tab-staff">
            <UserCheck className="h-4 w-4" />
            Staff Users (All Branches)
          </TabsTrigger>
        </TabsList>

        {/* External Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          {/* Customer Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow" data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-customer-name-${customer.id}`}>
                            {customer.name}
                          </h3>
                          <div className="flex flex-col gap-1 mt-2">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span data-testid={`text-customer-email-${customer.id}`}>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4" />
                                <span data-testid={`text-customer-phone-${customer.id}`}>{customer.phone}</span>
                              </div>
                            )}
                            {customer.address && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="h-4 w-4" />
                                <span data-testid={`text-customer-address-${customer.id}`}>{customer.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-customers">
                    {searchTerm ? "No customers found matching your search." : "No customers yet. Add your first customer to get started."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Staff Users Tab */}
        <TabsContent value="staff" className="space-y-6">
          {/* Staff Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search staff by name, email, role, or store..."
              value={staffSearchTerm}
              onChange={(e) => setStaffSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-staff"
            />
          </div>

          {/* Staff List */}
          <div className="space-y-4">
            {user && (user.role === "manager" || user.role === "administrasi") ? (
              filteredStaffUsers.length > 0 ? (
                filteredStaffUsers.map((staff) => (
                  <Card key={staff.id} className="hover:shadow-md transition-shadow" data-testid={`card-staff-${staff.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-staff-name-${staff.id}`}>
                              {staff.name}
                            </h3>
                            <div className="flex flex-col gap-1 mt-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span data-testid={`text-staff-email-${staff.id}`}>{staff.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge className={
                                  staff.role === "manager" ? "bg-purple-100 text-purple-800" :
                                  staff.role === "administrasi" ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }>
                                  {staff.role}
                                </Badge>
                              </div>
                              {staff.stores && staff.stores.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Building className="h-4 w-4" />
                                  <span data-testid={`text-staff-stores-${staff.id}`}>
                                    {staff.stores.map(store => store.name).join(", ")}
                                  </span>
                                </div>
                              )}
                              {staff.salary && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Salary: Rp {Number(staff.salary).toLocaleString("id-ID")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-staff">
                      {staffSearchTerm ? "No staff found matching your search." : "No staff users found."}
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Access restricted. Manager or administration role required to view staff users.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}