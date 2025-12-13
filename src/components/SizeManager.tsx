import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import {
  type ProductSizeMeasurements,
  getMeasurementFields,
  detectProductCategory,
} from "../lib/size-config";

export interface ProductSize extends ProductSizeMeasurements {
  id?: string;
  size_name: string;
}

interface SizeManagerProps {
  sizes: ProductSize[];
  onSizesChange: (sizes: ProductSize[]) => void;
  categories?: string[];
  allowCustomMeasurements?: boolean;
  onAllowCustomChange?: (allow: boolean) => void;
  clothingType?: string;
}

export default function SizeManager({
  sizes,
  onSizesChange,
  categories,
  allowCustomMeasurements = false,
  onAllowCustomChange,
  clothingType,
}: SizeManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductSize>({
    size_name: "",
  });

  // Prefer explicit clothingType when provided; otherwise detect from categories
  const productCategory = clothingType
    ? clothingType
    : detectProductCategory(categories);
  const measurementFields = getMeasurementFields(productCategory);

  const resetForm = () => {
    setFormData({ size_name: "" });
    setEditingIndex(null);
  };

  const handleAdd = () => {
    if (!formData.size_name.trim()) {
      toast.error("Size name is required");
      return;
    }

    // Check for duplicates
    if (
      sizes.some(
        (s, idx) =>
          s.size_name.toLowerCase() === formData.size_name.toLowerCase() &&
          idx !== editingIndex
      )
    ) {
      toast.error("Size already exists");
      return;
    }

    if (editingIndex !== null) {
      // Update existing
      const updated = [...sizes];
      updated[editingIndex] = formData;
      onSizesChange(updated);
      toast.success("Size updated");
    } else {
      // Add new
      onSizesChange([...sizes, formData]);
      toast.success("Size added");
    }

    resetForm();
    setIsOpen(false);
  };

  const handleEdit = (index: number) => {
    setFormData(sizes[index]);
    setEditingIndex(index);
    setIsOpen(true);
  };

  const handleDelete = (index: number) => {
    onSizesChange(sizes.filter((_, i) => i !== index));
    toast.success("Size removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Product Sizes</Label>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Size
        </Button>
      </div>

      {sizes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No sizes added yet
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                {measurementFields.map((field) => (
                  <TableHead key={field.key}>
                    {field.label} {field.unit && `(${field.unit})`}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {size.size_name}
                  </TableCell>
                  {measurementFields.map((field) => {
                    const value = size[field.key as keyof ProductSize] as
                      | number
                      | null
                      | undefined;
                    return (
                      <TableCell key={field.key}>
                        {value !== null && value !== undefined ? value : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(idx)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Allow Custom Measurements */}
      {allowCustomMeasurements !== undefined && onAllowCustomChange && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCustomMeasurements}
              onChange={(e) => onAllowCustomChange(e.target.checked)}
              className="h-4 w-4 rounded border border-input"
            />
            <span className="text-sm font-medium">
              Allow customers to enter custom measurements
            </span>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            If enabled, customers can provide their own measurements instead of
            selecting a size.
          </p>
        </div>
      )}

      {/* Size Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Edit Size" : "Add New Size"}
            </DialogTitle>
            <DialogDescription>
              Enter size name and optional body measurements for this size.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="size_name">Size Name *</Label>
              <Input
                id="size_name"
                placeholder="e.g., XS, S, M, L, XL, 28, 30, Custom"
                value={formData.size_name}
                onChange={(e) =>
                  setFormData({ ...formData, size_name: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Required. Enter a unique identifier for this size.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {measurementFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.unit && ` (${field.unit})`}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    step="0.5"
                    placeholder={field.placeholder}
                    value={
                      (formData[field.key as keyof ProductSize] as
                        | number
                        | undefined) || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Leave measurements blank if not applicable for this size.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              {editingIndex !== null ? "Update Size" : "Add Size"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
