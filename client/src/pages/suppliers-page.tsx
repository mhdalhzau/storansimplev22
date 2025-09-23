import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Edit, Trash2, Search, Mail, Phone, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Supplier, insertSupplierSchema, type InsertSupplier } from "@shared/schema";

export default function SuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: !!user
  });

  // Supplier form for add/edit
  const supplierForm = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    },
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier created successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSupplier }) => {
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier updated successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/suppliers/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(searchLower) ||
      (supplier.contactPerson || "").toLowerCase().includes(searchLower) ||
      (supplier.phone || "").toLowerCase().includes(searchLower) ||
      (supplier.email || "").toLowerCase().includes(searchLower)
    );
  });

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingSupplier(null);
    supplierForm.reset();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    supplierForm.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      description: supplier.description || "",
    });
  };

  const handleSubmit = (data: InsertSupplier) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  const canCreateOrEdit = user?.role === "manager" || user?.role === "administrasi";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Supplier Management</h1>
          <p className="text-muted-foreground">Manage your suppliers and vendors</p>
        </div>
        {canCreateOrEdit && (
          <Dialog open={isAddModalOpen || !!editingSupplier} onOpenChange={(open) => !open && closeModal()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-supplier">
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </DialogTitle>
                <DialogDescription>
                  {editingSupplier ? "Update supplier information" : "Add a new supplier to your vendor list"}
                </DialogDescription>
              </DialogHeader>
              <Form {...supplierForm}>
                <form onSubmit={supplierForm.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={supplierForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter supplier name" {...field} data-testid="input-supplier-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={supplierForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person name" {...field} data-testid="input-contact-person" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={supplierForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={supplierForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Email address" type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={supplierForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Supplier address" 
                            className="min-h-[60px]" 
                            {...field} 
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes about supplier" 
                            className="min-h-[60px]" 
                            {...field} 
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                      data-testid="button-submit-supplier"
                    >
                      {editingSupplier ? "Update" : "Create"} Supplier
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      data-testid="button-cancel-supplier"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-suppliers"
          />
        </div>
      </div>

      {/* Suppliers List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="relative" data-testid={`card-supplier-${supplier.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`text-supplier-name-${supplier.id}`}>
                    {supplier.name}
                  </CardTitle>
                  {supplier.contactPerson && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-contact-person-${supplier.id}`}>
                      Contact: {supplier.contactPerson}
                    </p>
                  )}
                </div>
                {canCreateOrEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                      data-testid={`button-edit-supplier-${supplier.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(supplier)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-supplier-${supplier.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <Badge variant="outline" data-testid={`badge-status-${supplier.id}`}>
                  {supplier.status}
                </Badge>
                
                {supplier.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${supplier.id}`}>
                    {supplier.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span data-testid={`text-phone-${supplier.id}`}>{supplier.phone}</span>
                    </div>
                  )}
                  
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span data-testid={`text-email-${supplier.id}`}>{supplier.email}</span>
                    </div>
                  )}
                  
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1" data-testid={`text-address-${supplier.id}`}>
                        {supplier.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No suppliers match your search criteria."
                  : "Get started by adding your first supplier."}
              </p>
              {canCreateOrEdit && !searchTerm && (
                <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-first-supplier">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Supplier
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}