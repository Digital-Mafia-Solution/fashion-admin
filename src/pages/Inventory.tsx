import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Database } from "../lib/database.types";
import { useUpdatingSet } from "../hooks/use-updating-set";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Plus, Search, MapPin, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];

type InventoryExt = InventoryRow & {
  locations?: Pick<LocationRow, "name" | "type"> | null;
};
type ProductExt = ProductRow & { inventory?: InventoryExt[] };

export default function Inventory() {
  const { profile, isAdmin } = useAuth();
  const [products, setProducts] = useState<ProductExt[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Stock Management State
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductExt | null>(
    null
  );
  const [stockForm, setStockForm] = useState({ location_id: "", quantity: 0 });
  const [saving, setSaving] = useState(false);
  const {
    add: addUpdatingProduct,
    remove: removeUpdatingProduct,
    has: hasUpdatingProduct,
  } = useUpdatingSet();

  // Add Product State (Admin Only)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    category: "General",
    image_url: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    // 1. Fetch Products & Inventory
    const { data: productData } = await supabase
      .from("products")
      .select(
        `
        *,
        inventory (
          quantity,
          location_id,
          locations ( name, type )
        )
      `
      )
      .order("name");

    // 2. Fetch Locations
    let locQuery = supabase
      .from("locations")
      .select("id, name, type")
      .eq("is_active", true);
    if (!isAdmin && profile?.assigned_location_id) {
      locQuery = locQuery.eq("id", profile.assigned_location_id);
    }
    const { data: locData } = await locQuery;

    if (productData) setProducts(productData as unknown as ProductExt[]);
    if (locData) setLocations(locData as unknown as LocationRow[]);
    setLoading(false);
  }, [isAdmin, profile?.assigned_location_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStock = async () => {
    if (!stockForm.location_id) {
      toast.error("Please select a location");
      return;
    }
    setSaving(true);
    if (selectedProduct) addUpdatingProduct(selectedProduct.id);

    const previousProducts = products;

    // Optimistically update products state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProduct?.id) return p;
        const inv = p.inventory ?? [];
        const invIndex = inv.findIndex(
          (i) => i.location_id === stockForm.location_id
        );
        const updatedInv = [...inv];
        if (invIndex > -1) {
          updatedInv[invIndex] = {
            ...updatedInv[invIndex],
            quantity: Number(stockForm.quantity),
          };
        } else {
          updatedInv.push({
            location_id: stockForm.location_id,
            quantity: Number(stockForm.quantity),
            locations:
              locations.find((l) => l.id === stockForm.location_id) || null,
          } as InventoryExt);
        }
        return { ...p, inventory: updatedInv };
      })
    );

    try {
      const { error } = await supabase.from("inventory").upsert(
        {
          product_id: selectedProduct?.id,
          location_id: stockForm.location_id,
          quantity: Number(stockForm.quantity),
        },
        { onConflict: "product_id, location_id" }
      );

      if (error) {
        // revert
        setProducts(previousProducts);
        throw error;
      }

      toast.success("Stock updated successfully");
      setIsStockOpen(false);
    } catch (error: unknown) {
      let errorMessage = "Failed to update stock";
      if (error instanceof Error) errorMessage = error.message;
      else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      if (selectedProduct) removeUpdatingProduct(selectedProduct.id);
      fetchData();
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.price) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);

    const previousProducts = products;

    // Create a temporary product to show instantly
    const tempId = `temp-${Date.now()}`;
    const tempProduct = {
      id: tempId,
      name: newProduct.name,
      sku: newProduct.sku,
      price: parseFloat(newProduct.price),
      image_url: newProduct.image_url || null,
      category: newProduct.category ? [newProduct.category] : null,
      inventory: [],
    } as unknown as ProductExt;

    setProducts((p) => [tempProduct, ...p]);
    setIsAddOpen(false);

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: newProduct.name,
          sku: newProduct.sku,
          price: parseFloat(newProduct.price),
          category: newProduct.category ? [newProduct.category] : null,
          image_url: newProduct.image_url || null,
        })
        .select()
        .single();

      if (error) {
        // revert
        setProducts(previousProducts);
        throw error;
      }

      // Replace temp product with real product returned from DB
      if (data) {
        setProducts((prev) => [
          data as ProductExt,
          ...prev.filter((x) => x.id !== tempId),
        ]);
      }

      toast.success("Product created");
      setNewProduct({
        name: "",
        sku: "",
        price: "",
        category: "General",
        image_url: "",
      });
    } catch (error: unknown) {
      let errorMessage = "Failed to create product";
      if (error instanceof Error) errorMessage = error.message;
      else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        errorMessage = String((error as { message: unknown }).message);
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      fetchData();
    }
  };

  const openStockDialog = (product: ProductExt) => {
    setSelectedProduct(product);
    if (!isAdmin && profile?.assigned_location_id) {
      const currentStock =
        (product.inventory ?? []).find(
          (i: InventoryExt) => i.location_id === profile.assigned_location_id
        )?.quantity || 0;
      setStockForm({
        location_id: profile.assigned_location_id,
        quantity: currentStock,
      });
    } else {
      setStockForm({ location_id: "", quantity: 0 });
    }
    setIsStockOpen(true);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Global Stock Control" : "My Store Inventory"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          {isAdmin && (
            <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />{" "}
              <span className="hidden md:inline">Add Product</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:block border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock Breakdown</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-md overflow-hidden border border-border shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            Img
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{product.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {product.sku}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>R {product.price}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(product.inventory ?? [])
                        .filter(
                          (inv: InventoryExt) =>
                            isAdmin ||
                            inv.location_id === profile?.assigned_location_id
                        )
                        .map((inv: InventoryExt, i: number) => (
                          <div
                            key={i}
                            className="text-xs flex items-center gap-1.5 border rounded px-2 py-1 bg-background"
                          >
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {inv.locations?.name}:
                            </span>
                            <span
                              className={
                                (inv.quantity ?? 0) > 0
                                  ? "text-green-600 font-bold"
                                  : "text-red-500 font-bold"
                              }
                            >
                              {inv.quantity ?? 0}
                            </span>
                          </div>
                        ))}
                      {(product.inventory?.length ?? 0) === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          No stock
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openStockDialog(product)}
                      disabled={hasUpdatingProduct(product.id)}
                    >
                      {hasUpdatingProduct(product.id) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {isAdmin ? "Manage" : "Update Stock"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-md overflow-hidden border border-border shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Img
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {product.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground font-mono">
                        {product.sku}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold">R {product.price}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Stock Levels
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(product.inventory ?? [])
                      .filter(
                        (inv: InventoryExt) =>
                          isAdmin ||
                          inv.location_id === profile?.assigned_location_id
                      )
                      .map((inv: InventoryExt, i: number) => (
                        <div
                          key={i}
                          className="text-xs flex flex-col border rounded p-2 bg-muted/20"
                        >
                          <span className="font-medium truncate">
                            {inv.locations?.name}
                          </span>
                          <span
                            className={
                              (inv.quantity ?? 0) > 0
                                ? "text-green-600 font-bold"
                                : "text-red-500 font-bold"
                            }
                          >
                            {inv.quantity ?? 0} units
                          </span>
                        </div>
                      ))}
                    {(product.inventory?.length ?? 0) === 0 && (
                      <span className="text-xs italic text-muted-foreground">
                        No stock records
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => openStockDialog(product)}
                    disabled={hasUpdatingProduct(product.id)}
                  >
                    {hasUpdatingProduct(product.id) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Update Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="text-primary">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Adjust inventory for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={stockForm.location_id}
                onValueChange={(val) => {
                  const existing = selectedProduct?.inventory?.find(
                    (i: InventoryExt) => i.location_id === val
                  );
                  setStockForm({
                    location_id: val,
                    quantity: existing?.quantity || 0,
                  });
                }}
                disabled={!isAdmin && !!profile?.assigned_location_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity On Hand</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setStockForm((prev) => ({
                      ...prev,
                      quantity: Math.max(0, prev.quantity - 1),
                    }))
                  }
                >
                  -
                </Button>
                <Input
                  type="number"
                  className="text-center"
                  value={stockForm.quantity}
                  onChange={(e) =>
                    setStockForm((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setStockForm((prev) => ({
                      ...prev,
                      quantity: prev.quantity + 1,
                    }))
                  }
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStock} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog (Admin Only) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="text-primary">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={newProduct.sku}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, sku: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddProduct} disabled={saving}>
              Save Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
