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
} from "../components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationType = Database["public"]["Enums"]["location_type"];

export default function Stores() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<LocationInsert>({
    name: "",
    type: "store" as LocationType,
    address: "",
    is_active: true,
  });

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
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
    };

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
        setForm({ name: "", type: "store", address: "", is_active: true });
        toast.success("Store created");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
        <p className="text-muted-foreground">
          Manage store locations — add a new store or view existing ones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Add Store</CardTitle>
              <p className="text-sm text-muted-foreground">
                Provide store details and address.
              </p>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={fetchLocations}>
                <Loader2
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                onValueChange={(val) =>
                  setForm({ ...form, type: val as LocationType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.type} />
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
                defaultValue={form.address || ""}
                onAddressSelect={(address) =>
                  setForm((f) => ({ ...f, address }))
                }
                onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Store
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-xl font-bold">Existing Stores</h2>
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {locations.map((loc) => (
              <Card key={loc.id}>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {loc.type}
                      </div>
                      {loc.address && (
                        <div className="text-xs text-muted-foreground">
                          {loc.address}
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      {loc.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
