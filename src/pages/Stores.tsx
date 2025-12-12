import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { Button } from "../components/ui/button";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "../components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Store,
  Warehouse,
  Truck,
  Loader2,
  RefreshCw,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationType = Database["public"]["Enums"]["location_type"];

interface AddressData {
  address: string;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
}

const TYPE_CONFIG: Record<
  LocationType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  store: {
    label: "Store",
    icon: <Store className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  warehouse: {
    label: "Warehouse",
    icon: <Warehouse className="h-5 w-5" />,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  virtual_courier: {
    label: "Virtual Courier",
    icon: <Truck className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
};

export default function Locations() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationRow | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<LocationInsert>({
    name: "",
    type: "store" as LocationType,
    address: null,
    is_active: true,
  });

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLocations((data as LocationRow[]) || []);
    } catch (err) {
      console.error("Failed to load locations", err);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: LocationRow = {
      id: tempId,
      name: form.name,
      type: form.type,
      address: form.address || null,
      is_active: form.is_active ?? true,
      created_at: new Date().toISOString(),
    } as LocationRow;

    const previous = locations;
    setLocations((p) => [optimistic, ...p]);

    try {
      const { data, error } = await supabase
        .from("locations")
        .insert(form)
        .select()
        .single();

      if (error) {
        setLocations(previous);
        throw error;
      }

      if (data) {
        setLocations((p) => [
          data as LocationRow,
          ...p.filter((x) => x.id !== tempId),
        ]);
        setForm({ name: "", type: "store", address: null, is_active: true });
        toast.success("Location created");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? (err as Record<string, unknown>).message
          : "Failed to create location";
      console.error(err);
      toast.error(String(errorMessage));
    } finally {
      setSaving(false);
    }
  };

  const groupedByType = locations.reduce((acc, loc) => {
    if (!acc[loc.type]) {
      acc[loc.type] = [];
    }
    acc[loc.type].push(loc);
    return acc;
  }, {} as Record<LocationType, LocationRow[]>);

  const typeOrder: LocationType[] = ["store", "warehouse", "virtual_courier"];

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;

    setDeleting(true);
    console.log("Starting location delete for:", locationToDelete.id);
    try {
      // 1. Clear orders with this pickup location
      console.log("Step 1: Clearing orders...");
      const { error: ordersError } = await supabase
        .from("orders")
        .update({ pickup_location_id: null })
        .eq("pickup_location_id", locationToDelete.id);

      if (ordersError) {
        console.error("Orders error:", ordersError);
        throw new Error(`Failed to clear orders: ${ordersError.message}`);
      }
      console.log("Orders cleared successfully");

      // 2. Delete inventory records for this location
      console.log("Step 2: Deleting inventory...");
      const { error: inventoryError } = await supabase
        .from("inventory")
        .delete()
        .eq("location_id", locationToDelete.id);

      if (inventoryError) {
        console.error("Inventory error:", inventoryError);
        throw new Error(`Failed to clear inventory: ${inventoryError.message}`);
      }
      console.log("Inventory deleted successfully");

      // 3. Clear profiles assigned to this location
      console.log("Step 3: Clearing profiles...");
      const { error: profilesError } = await supabase
        .from("profiles")
        .update({ assigned_location_id: null })
        .eq("assigned_location_id", locationToDelete.id);

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw new Error(`Failed to clear profiles: ${profilesError.message}`);
      }
      console.log("Profiles cleared successfully");

      // 4. Finally delete the location
      console.log("Step 4: Deleting location...");
      const { error: deleteError } = await supabase
        .from("locations")
        .delete()
        .eq("id", locationToDelete.id);

      console.log("Delete response:", { deleteError });

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error(
          deleteError.message || `Delete failed: ${JSON.stringify(deleteError)}`
        );
      }

      console.log("Location deleted successfully");
      toast.success(`${locationToDelete.name} has been deleted.`);
      setLocations((prev) =>
        prev.filter((loc) => loc.id !== locationToDelete.id)
      );
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error: unknown) {
      console.error("Delete location failed:", error);
      let errorMessage = "Failed to delete location";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        errorMessage = String((error as { message: unknown }).message);
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-2">
          Manage and organize all your store, warehouse, and delivery locations.
        </p>
      </div>

      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Add New Location</CardTitle>
              <CardDescription>
                Add a new store, warehouse, or virtual courier location.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLocations}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                placeholder="e.g., Menlyn Main Store"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, name: e.target.value })
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) =>
                  setForm({ ...form, type: val as LocationType })
                }
                disabled={saving}
              >
                <SelectTrigger id="location-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="virtual_courier">
                    Virtual Courier
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <AddressAutocomplete
                label="Address"
                defaultValue={
                  (form.address as AddressData | null)?.address || ""
                }
                onAddressSelect={(address, lat, lng) =>
                  setForm((f) => ({
                    ...f,
                    address: { address, lat, lng },
                  }))
                }
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    address: {
                      ...(f.address as AddressData | null),
                      address: v,
                    },
                  }))
                }
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <Button onClick={handleAdd} disabled={saving} size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Location
          </Button>
        </CardFooter>
      </Card>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" />
        </div>
      ) : locations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No locations added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const items = groupedByType[type];
            if (!items || items.length === 0) return null;

            const config = TYPE_CONFIG[type];

            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{config.label}s</h2>
                    <p className="text-sm text-muted-foreground">
                      {items.length} location{items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((loc) => (
                    <Card
                      key={loc.id}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-base">
                                {loc.name}
                              </h3>
                              <Badge
                                variant={
                                  loc.is_active ? "default" : "secondary"
                                }
                                className="shrink-0"
                              >
                                {loc.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          {loc.address && (
                            <div className="flex gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-muted-foreground wrap-break-word">
                                {typeof loc.address === "string"
                                  ? loc.address
                                  : (loc.address as AddressData).address}
                              </p>
                            </div>
                          )}

                          {loc.created_at && (
                            <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
                              <span>
                                Added{" "}
                                {new Date(loc.created_at).toLocaleDateString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setLocationToDelete(loc);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              This will delete{" "}
              <span className="font-semibold">{locationToDelete?.name}</span>{" "}
              and clear all associated data including orders, inventory, and
              staff assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setLocationToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLocation}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
