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
import {
  Plus,
  Search,
  MapPin,
  Loader2,
  RefreshCw,
  Edit,
  Archive,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import SizeManager, { type ProductSize } from "../components/SizeManager";
import { detectProductCategory } from "../lib/size-config";
import { toast } from "sonner";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];

type InventoryExt = InventoryRow & {
  locations?: Pick<LocationRow, "name" | "type"> | null;
  price?: number | null;
};
type ProductExt = ProductRow & {
  inventory?: InventoryExt[];
  product_sizes?: Database["public"]["Tables"]["product_sizes"]["Row"][];
  allow_custom_measurements?: boolean;
};

const CLOTHING_TYPES = [
  "shirts",
  "pants",
  "shoes",
  "belts",
  "dresses",
  "jackets",
  "perfumes",
  "generic",
];

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
  const [stockForm, setStockForm] = useState({
    location_id: "",
    quantity: 0,
    price: 0,
    size_name: "",
  });
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
    categories: "General",
    image_url: "",
    weight: "",
    sizes: [] as ProductSize[],
    allowCustomMeasurements: false,
    clothingType: "",
  });
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(
    null
  );
  const [editingProduct, setEditingProduct] = useState<ProductExt | null>(null);

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
          price,
          location_id,
          size_name,
          locations ( name, type )
        ),
        product_sizes (
          id,
          size_name,
          chest_cm,
          shoulder_width_cm,
          sleeve_length_cm,
          front_length_cm,
          back_length_cm,
          waist_cm,
          hip_cm,
          inseam_cm,
          thigh_width_cm,
          size_us,
          size_eu,
          foot_length_cm,
          foot_width_cm,
          belt_length_cm,
          belt_width_cm
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
        let updatedInv = [...inv];

        // If quantity is 0, remove the inventory entry; otherwise update or add
        if (Number(stockForm.quantity) === 0) {
          updatedInv = updatedInv.filter((_, i) => i !== invIndex);
        } else if (invIndex > -1) {
          updatedInv[invIndex] = {
            ...updatedInv[invIndex],
            quantity: Number(stockForm.quantity),
            price: Number(stockForm.price),
          };
        } else {
          updatedInv.push({
            location_id: stockForm.location_id,
            quantity: Number(stockForm.quantity),
            price: Number(stockForm.price),
            locations:
              locations.find((l) => l.id === stockForm.location_id) || null,
          } as InventoryExt);
        }
        return { ...p, inventory: updatedInv };
      })
    );

    try {
      // If quantity is 0, delete the inventory entry; otherwise upsert
      if (Number(stockForm.quantity) === 0) {
        if (!selectedProduct?.id || !stockForm.location_id) {
          throw new Error("Missing product_id or location_id for deletion");
        }

        const { error: delErr } = await supabase
          .from("inventory")
          .delete()
          .eq("product_id", selectedProduct.id)
          .eq("location_id", stockForm.location_id)
          .eq("size_name", stockForm.size_name || null);

        if (delErr) {
          console.error("Delete error:", delErr);
          setProducts(previousProducts);
          throw delErr;
        }
        console.log(
          `Successfully deleted inventory for product ${selectedProduct.id} at location ${stockForm.location_id}`
        );
      } else {
        const { error } = await supabase.from("inventory").upsert(
          {
            product_id: selectedProduct?.id,
            location_id: stockForm.location_id,
            quantity: Number(stockForm.quantity),
            price: Number(stockForm.price),
            size_name: stockForm.size_name || null,
          },
          { onConflict: "product_id,location_id,size_name" }
        );

        if (error) {
          setProducts(previousProducts);
          throw error;
        }
      }

      // After updating inventory, check if product has any inventory entries left
      try {
        if (selectedProduct) {
          const { data: invRows, error: invErr } = await supabase
            .from("inventory")
            .select("id")
            .eq("product_id", selectedProduct.id);

          if (!invErr) {
            // Archive if no inventory entries exist
            const hasInventory = (invRows || []).length > 0;
            const shouldArchive = !hasInventory;

            // Optimistically update product archive flag in UI
            setProducts((prev) =>
              prev.map((p) =>
                p.id === selectedProduct.id
                  ? ({ ...p, is_archived: shouldArchive } as ProductExt)
                  : p
              )
            );

            // Persist archive flag if it differs
            if (selectedProduct.is_archived !== shouldArchive) {
              const { error: archErr } = await supabase
                .from("products")
                .update({ is_archived: shouldArchive })
                .eq("id", selectedProduct.id);
              if (archErr)
                console.error("Failed to update archive flag", archErr);
            }
          }
        }
      } catch (e) {
        console.error("Error checking inventory entries", e);
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
    // Validate required fields (weight required)
    if (!newProduct.name || !newProduct.sku || !newProduct.weight) {
      toast.error("Please fill in all required fields (including weight)");
      return;
    }

    setSaving(true);
    const previousProducts = products;

    // Helper: upload image file if provided
    const uploadImage = async () => {
      if (!newProductImageFile) return newProduct.image_url || null;
      try {
        const file = newProductImageFile;
        const fileExt = file.name.split(".").pop();
        const filePath = `products/${Date.now()}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        return publicData.publicUrl;
      } catch (err) {
        console.error("Product image upload failed", err);
        return null;
      }
    };

    // Build payload (weight in grams)
    const categoriesArr = (newProduct.categories || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      const imageUrl = await uploadImage();

      const parsedWeight = (() => {
        const v = Number(newProduct.weight);
        return Number.isFinite(v) ? Math.round(v) : null;
      })();

      // Extract size names for the sizes array
      const sizeNames = newProduct.sizes
        .map((s) => s.size_name.trim())
        .filter(Boolean);

      const payloadInsert: Database["public"]["Tables"]["products"]["Insert"] =
        {
          name: newProduct.name,
          sku: newProduct.sku,
          image_url: imageUrl,
          weight_grams: parsedWeight,
          category: categoriesArr.length ? categoriesArr : null,
          sizes: sizeNames.length ? sizeNames : null,
          clothing_type: newProduct.clothingType || null,
        };

      const payloadUpdate: Database["public"]["Tables"]["products"]["Update"] =
        {
          name: newProduct.name,
          sku: newProduct.sku,
          image_url: imageUrl,
          weight_grams: parsedWeight,
          category: categoriesArr.length ? categoriesArr : null,
          sizes: sizeNames.length ? sizeNames : null,
          clothing_type: newProduct.clothingType || null,
        };

      // If editingProduct is set, update instead of insert
      if (editingProduct) {
        // optimistic update
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? ({ ...p, ...payloadUpdate } as ProductExt)
              : p
          )
        );

        const { data, error } = await supabase
          .from("products")
          .update(payloadUpdate)
          .eq("id", editingProduct.id)
          .select("*");

        if (error) {
          console.error("Update error:", error);
          setProducts(previousProducts);
          throw error;
        }

        if (data && data.length > 0) {
          const updatedProduct = data[0] as ProductExt;
          setProducts((prev) =>
            prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          );

          // Save product sizes if any
          if (newProduct.sizes.length > 0) {
            await saveSizes(updatedProduct.id, newProduct.sizes);
          }

          // Update custom measurements if table exists
          if (newProduct.allowCustomMeasurements !== false) {
            try {
              await supabase
                .from("products")
                .update({
                  allow_custom_measurements: newProduct.allowCustomMeasurements,
                })
                .eq("id", updatedProduct.id);
            } catch {
              console.warn(
                "allow_custom_measurements field may not exist yet - run migration"
              );
            }
          }

          toast.success("Product updated");
        } else {
          console.warn("Update returned no rows, using optimistic update");
          toast.success("Product updated");
        }
        setEditingProduct(null);
        setIsAddOpen(false);
      } else {
        // create temp product for optimistic UI
        const tempId = `temp-${Date.now()}`;
        const tempProduct = {
          id: tempId,
          name: newProduct.name,
          sku: newProduct.sku,
          image_url: imageUrl || null,
          category: categoriesArr.length ? categoriesArr : null,
          inventory: [],
          weight_grams: parsedWeight,
        } as unknown as ProductExt;

        setProducts((p) => [tempProduct, ...p]);
        setIsAddOpen(false);

        const { data, error } = await supabase
          .from("products")
          .insert(payloadInsert)
          .select("*");

        if (error) {
          console.error("Insert error:", error);
          setProducts(previousProducts);
          throw error;
        }

        if (data && data.length > 0) {
          const insertedProduct = data[0] as ProductExt;

          // Save product sizes if any
          if (newProduct.sizes.length > 0) {
            await saveSizes(insertedProduct.id, newProduct.sizes);
          }

          // Update custom measurements if table exists
          if (newProduct.allowCustomMeasurements !== false) {
            try {
              await supabase
                .from("products")
                .update({
                  allow_custom_measurements: newProduct.allowCustomMeasurements,
                })
                .eq("id", insertedProduct.id);
            } catch {
              console.warn(
                "allow_custom_measurements field may not exist yet - run migration"
              );
            }
          }

          setProducts((prev) => [
            insertedProduct,
            ...prev.filter((x) => x.id !== tempId),
          ]);
          toast.success("Product created");
        } else {
          console.warn(
            "Insert returned no rows, using temp product as fallback"
          );
          toast.success("Product created");
        }
      }

      // reset form
      setNewProduct({
        name: "",
        sku: "",
        categories: "General",
        image_url: "",
        weight: "",
        sizes: [],
        allowCustomMeasurements: false,
        clothingType: "",
      });
      setNewProductImageFile(null);
    } catch (error: unknown) {
      let errorMessage = "Failed to save product";
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
      const currentPrice =
        (product.inventory ?? []).find(
          (i: InventoryExt) => i.location_id === profile.assigned_location_id
        )?.price || 0;
      setStockForm({
        location_id: profile.assigned_location_id,
        quantity: currentStock,
        price: currentPrice,
        size_name: "",
      });
    } else {
      setStockForm({ location_id: "", quantity: 0, price: 0, size_name: "" });
    }
    setIsStockOpen(true);
  };

  const saveSizes = async (productId: string, sizes: ProductSize[]) => {
    try {
      // Delete existing sizes for this product
      await supabase.from("product_sizes").delete().eq("product_id", productId);

      // Insert new sizes
      if (sizes.length > 0) {
        const sizesToInsert = sizes.map((size) => ({
          product_id: productId,
          size_name: size.size_name,
          chest_cm: size.chest_cm || null,
          shoulder_width_cm: size.shoulder_width_cm || null,
          sleeve_length_cm: size.sleeve_length_cm || null,
          front_length_cm: size.front_length_cm || null,
          back_length_cm: size.back_length_cm || null,
          waist_cm: size.waist_cm || null,
          hip_cm: size.hip_cm || null,
          inseam_cm: size.inseam_cm || null,
          thigh_width_cm: size.thigh_width_cm || null,
          size_us: size.size_us || null,
          size_eu: size.size_eu || null,
          foot_length_cm: size.foot_length_cm || null,
          foot_width_cm: size.foot_width_cm || null,
          belt_length_cm: size.belt_length_cm || null,
          belt_width_cm: size.belt_width_cm || null,
        }));
        const { error } = await supabase
          .from("product_sizes")
          .insert(sizesToInsert);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to save sizes:", err);
      throw err;
    }
  };

  const loadSizes = async (productId: string): Promise<ProductSize[]> => {
    try {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("*")
        .eq("product_id", productId);
      if (error) throw error;
      return (data || []) as ProductSize[];
    } catch (err) {
      console.error("Failed to load sizes:", err);
      return [];
    }
  };

  const openEditProduct = async (product: ProductExt) => {
    setEditingProduct(product);
    const sizes = await loadSizes(product.id);
    const productCategories = Array.isArray(product.category)
      ? product.category
      : ((product.category as unknown as string) || "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
    const detected = detectProductCategory(productCategories);
    setNewProduct({
      name: product.name || "",
      sku: product.sku || "",
      categories: Array.isArray(product.category)
        ? product.category.join(", ")
        : (product.category as unknown as string) || "",
      image_url: product.image_url || "",
      weight: product.weight_grams?.toString() || "",
      sizes: sizes,
      allowCustomMeasurements: product.allow_custom_measurements || false,
      clothingType: detected !== "generic" ? detected : "",
    });
    setIsAddOpen(true);
  };

  const toggleArchive = async (product: ProductExt) => {
    const prev = products;
    // optimistic
    setProducts((p) =>
      p.map((x) =>
        x.id === product.id
          ? ({ ...x, is_archived: !x.is_archived } as ProductExt)
          : x
      )
    );
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_archived: !product.is_archived })
        .eq("id", product.id);
      if (error) {
        setProducts(prev);
        throw error;
      }
      toast.success(
        product.is_archived ? "Product unarchived" : "Product archived"
      );
    } catch (err: unknown) {
      let msg = "Failed to update archive status";
      if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      fetchData();
    }
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
              <TableHead>Stock Breakdown</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No products found
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
                        <div className="flex items-center gap-2">
                          <div className="font-bold">{product.name}</div>
                          {product.is_archived && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {product.sku}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {(product.sizes ?? []).length > 0 ? (
                        (product.sizes ?? []).map((sizeName: string) => {
                          const sizeInventory = (
                            product.inventory ?? []
                          ).filter(
                            (inv: InventoryExt) =>
                              (isAdmin ||
                                inv.location_id ===
                                  profile?.assigned_location_id) &&
                              inv.size_name === (sizeName || null)
                          );
                          return (
                            <div
                              key={sizeName}
                              className="text-xs border rounded p-2 bg-muted/30"
                            >
                              <div className="font-semibold mb-1">
                                {sizeName}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {sizeInventory.map(
                                  (inv: InventoryExt, i: number) => (
                                    <span
                                      key={i}
                                      className="flex items-center gap-1 px-1.5 py-0.5 border border-border rounded bg-background text-xs"
                                    >
                                      <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
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
                                      {inv.price && (
                                        <span className="text-muted-foreground">
                                          @ R{inv.price}
                                        </span>
                                      )}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(product.inventory ?? [])
                            .filter(
                              (inv: InventoryExt) =>
                                isAdmin ||
                                inv.location_id ===
                                  profile?.assigned_location_id
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
                                {inv.price && (
                                  <span className="text-muted-foreground ml-1">
                                    @ R{inv.price}
                                  </span>
                                )}
                              </div>
                            ))}
                          {(product.inventory?.length ?? 0) === 0 && (
                            <span className="text-xs text-muted-foreground italic">
                              No stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => toggleArchive(product)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
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
                    </div>
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
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8 opacity-20" />}
            title="No products found"
            description="Try adjusting your search or add a new product."
          />
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
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {product.name}
                        </CardTitle>
                        {product.is_archived && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {product.sku}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Stock Levels
                  </div>
                  {(product.sizes ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(product.sizes ?? []).map((sizeName: string) => {
                        const sizeInventory = (product.inventory ?? []).filter(
                          (inv: InventoryExt) =>
                            (isAdmin ||
                              inv.location_id ===
                                profile?.assigned_location_id) &&
                            inv.size_name === (sizeName || null)
                        );
                        return (
                          <div
                            key={sizeName}
                            className="text-xs border rounded p-2 bg-muted/30"
                          >
                            <div className="font-semibold mb-1">{sizeName}</div>
                            <div className="grid grid-cols-2 gap-1">
                              {sizeInventory.map(
                                (inv: InventoryExt, i: number) => (
                                  <div
                                    key={i}
                                    className="text-xs flex flex-col border rounded p-1.5 bg-background"
                                  >
                                    <span className="font-medium truncate text-xs">
                                      {inv.locations?.name}
                                    </span>
                                    <span
                                      className={
                                        (inv.quantity ?? 0) > 0
                                          ? "text-green-600 font-bold text-xs"
                                          : "text-red-500 font-bold text-xs"
                                      }
                                    >
                                      {inv.quantity ?? 0}
                                    </span>
                                    {inv.price && (
                                      <span className="text-muted-foreground text-xs mt-0.5">
                                        R{inv.price}
                                      </span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
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
                            {inv.price && (
                              <span className="text-muted-foreground text-xs mt-1">
                                R{inv.price} each
                              </span>
                            )}
                          </div>
                        ))}
                      {(product.inventory?.length ?? 0) === 0 && (
                        <span className="text-xs italic text-muted-foreground">
                          No stock records
                        </span>
                      )}
                    </div>
                  )}
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
                  {isAdmin && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => toggleArchive(product)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="text-primary w-[95vw] max-w-3xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
                  setStockForm((prev) => ({
                    ...prev,
                    location_id: val,
                    size_name: "",
                    quantity: 0,
                    price: 0,
                  }));
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
            {(selectedProduct?.sizes ?? []).length > 0 && (
              <div className="space-y-2">
                <Label>Size</Label>
                <Select
                  value={stockForm.size_name || "none"}
                  onValueChange={(val) => {
                    const newSize = val === "none" ? "" : val;
                    const existing = selectedProduct?.inventory?.find(
                      (i: InventoryExt) =>
                        i.location_id === stockForm.location_id &&
                        i.size_name === (newSize || null)
                    );
                    setStockForm((prev) => ({
                      ...prev,
                      size_name: newSize,
                      quantity: existing?.quantity || 0,
                      price: existing?.price || 0,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Size (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific size</SelectItem>
                    {(selectedProduct?.sizes ?? []).map((size: string) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(selectedProduct?.sizes ?? []).length > 0 &&
            !stockForm.size_name ? (
              <div className="text-sm text-muted-foreground p-2 border rounded bg-muted/30">
                Please select a size first
              </div>
            ) : (
              <>
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
                <div className="space-y-2">
                  <Label>Price (per unit)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={stockForm.price}
                    onChange={(e) =>
                      setStockForm((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </>
            )}
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
        <DialogContent className="text-primary w-[95vw] max-w-5xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
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
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProductImageFile(e.target.files?.[0] || null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (g)</Label>
                <Input
                  type="number"
                  step="1"
                  value={newProduct.weight}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, weight: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select
                  value={newProduct.clothingType}
                  onValueChange={(val) =>
                    setNewProduct({ ...newProduct, clothingType: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOTHING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for sizing guidance; not stored in categories.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Category (comma separated)</Label>
                <Input
                  value={newProduct.categories}
                  onChange={(e) => {
                    const value = e.target.value;
                    const detected = detectProductCategory(
                      value
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)
                    );
                    setNewProduct((prev) => ({
                      ...prev,
                      categories: value,
                      clothingType:
                        detected !== "generic" ? detected : prev.clothingType,
                    }));
                  }}
                />
              </div>
            </div>

            {/* Size Manager */}
            <div className="border-t pt-4">
              <SizeManager
                sizes={newProduct.sizes}
                onSizesChange={(sizes) =>
                  setNewProduct({ ...newProduct, sizes })
                }
                categories={newProduct.categories
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)}
                clothingType={newProduct.clothingType}
                allowCustomMeasurements={newProduct.allowCustomMeasurements}
                onAllowCustomChange={(allow) =>
                  setNewProduct({
                    ...newProduct,
                    allowCustomMeasurements: allow,
                  })
                }
              />
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
