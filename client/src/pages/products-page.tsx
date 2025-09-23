import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, Search, Truck, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProductWithSupplier, Supplier, insertProductSchema, type InsertProduct } from "@shared/schema";

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSupplier | null>(null);

  // Fetch products
  const { data: products = [], isLoading } = useQuery<ProductWithSupplier[]>({
    queryKey: ["/api/products"],
    enabled: !!user
  });

  // Fetch suppliers for the dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: !!user
  });

  // Product form for add/edit
  const productForm = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      category: "",
      buyingPrice: "",
      sellingPrice: "",
      supplierId: "",
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await apiRequest("POST", "/api/products", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertProduct }) => {
      const res = await apiRequest("PUT", `/api/products/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully!",
      });
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Filter products based on search term
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku || "").toLowerCase().includes(searchLower) ||
      (product.category || "").toLowerCase().includes(searchLower) ||
      (product.description || "").toLowerCase().includes(searchLower)
    );
  });

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    productForm.reset();
  };

  const handleEdit = (product: ProductWithSupplier) => {
    setEditingProduct(product);
    productForm.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      category: product.category || "",
      buyingPrice: product.buyingPrice || "",
      sellingPrice: product.sellingPrice || "",
      supplierId: product.supplierId || "",
    });
  };

  const handleSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleDelete = (product: ProductWithSupplier) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "-";
    return `Rp ${parseInt(price).toLocaleString()}`;
  };

  const canCreateOrEdit = user?.role === "manager" || user?.role === "administrasi";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Product Management</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        {canCreateOrEdit && (
          <Dialog open={isAddModalOpen || !!editingProduct} onOpenChange={(open) => !open && closeModal()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-product">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update product information" : "Create a new product in your catalog"}
                </DialogDescription>
              </DialogHeader>
              <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={productForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} data-testid="input-product-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={productForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Product SKU/Code" {...field} data-testid="input-product-sku" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={productForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Product category" {...field} data-testid="input-product-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={productForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Product description" 
                            className="min-h-[60px]" 
                            {...field} 
                            data-testid="input-product-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="buyingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buying Price</FormLabel>
                          <FormControl>
                            <Input placeholder="0" {...field} data-testid="input-buying-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price</FormLabel>
                          <FormControl>
                            <Input placeholder="0" {...field} data-testid="input-selling-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={productForm.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-supplier">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No supplier</SelectItem>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                      data-testid="button-submit-product"
                    >
                      {editingProduct ? "Update" : "Create"} Product
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      data-testid="button-cancel-product"
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
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-products"
          />
        </div>
      </div>

      {/* Products List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="relative" data-testid={`card-product-${product.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`text-product-name-${product.id}`}>
                    {product.name}
                  </CardTitle>
                  {product.sku && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-product-sku-${product.id}`}>
                      SKU: {product.sku}
                    </p>
                  )}
                </div>
                {canCreateOrEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {product.category && (
                  <Badge variant="secondary" data-testid={`badge-category-${product.id}`}>
                    {product.category}
                  </Badge>
                )}
                
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${product.id}`}>
                    {product.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Buying Price</p>
                    <p className="font-medium" data-testid={`text-buying-price-${product.id}`}>
                      {formatPrice(product.buyingPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Selling Price</p>
                    <p className="font-medium" data-testid={`text-selling-price-${product.id}`}>
                      {formatPrice(product.sellingPrice)}
                    </p>
                  </div>
                </div>

                {product.supplier && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span data-testid={`text-supplier-${product.id}`}>{product.supplier.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No products match your search criteria."
                  : "Get started by adding your first product."}
              </p>
              {canCreateOrEdit && !searchTerm && (
                <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-first-product">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}