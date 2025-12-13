# Comprehensive Product Size System - Complete Reference

## Overview

The updated size management system now supports **all clothing and accessory types** with intelligent measurement field detection based on product categories:

- **Shirts & Tops**: Chest, Shoulder Width, Sleeve Length, Front/Back Length
- **Pants & Bottoms**: Waist, Hip, Inseam, Thigh Width
- **Shoes & Footwear**: US Size, EU Size, Foot Length, Foot Width
- **Belts & Accessories**: Belt Length, Belt Width
- **Dresses & Skirts**: Chest/Bust, Waist, Hip, Front/Back Length
- **Jackets & Coats**: Chest, Shoulder Width, Sleeve Length, Front Length
- **Generic/Other**: Chest, Waist, Hip, Length (default fallback)

## Database Schema

### product_sizes Table

```sql
CREATE TABLE product_sizes (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_name text NOT NULL,

  -- Shirts/Tops Measurements
  chest_cm numeric,
  shoulder_width_cm numeric,
  sleeve_length_cm numeric,
  front_length_cm numeric,
  back_length_cm numeric,

  -- Pants/Bottoms Measurements
  waist_cm numeric,
  hip_cm numeric,
  inseam_cm numeric,
  thigh_width_cm numeric,

  -- Shoes Measurements
  size_us numeric,
  size_eu numeric,
  foot_length_cm numeric,
  foot_width_cm numeric,

  -- Belts/Accessories Measurements
  belt_length_cm numeric,
  belt_width_cm numeric,

  created_at timestamp DEFAULT now(),
  UNIQUE(product_id, size_name)
);
```

## Size Configuration System

### File: `src/lib/size-config.ts`

Contains the complete size configuration for all product categories.

#### Key Components

**1. ProductSizeMeasurements Interface**

```typescript
interface ProductSizeMeasurements {
  chest_cm?: number | null;
  shoulder_width_cm?: number | null;
  sleeve_length_cm?: number | null;
  front_length_cm?: number | null;
  back_length_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  inseam_cm?: number | null;
  thigh_width_cm?: number | null;
  size_us?: number | null;
  size_eu?: number | null;
  foot_length_cm?: number | null;
  foot_width_cm?: number | null;
  belt_length_cm?: number | null;
  belt_width_cm?: number | null;
}
```

**2. MeasurementField Interface**

```typescript
interface MeasurementField {
  key: keyof ProductSizeMeasurements;
  label: string;
  unit: string;
  placeholder: string;
}
```

**3. SizeCategoryConfig**

```typescript
interface SizeCategoryConfig {
  name: string;
  fields: MeasurementField[];
}
```

#### Category Configurations

```typescript
SIZE_CATEGORIES: Record<string, SizeCategoryConfig> = {
  shirts: {
    name: "Shirts & Tops",
    fields: [
      { key: "chest_cm", label: "Chest", unit: "cm", placeholder: "e.g., 86" },
      { key: "shoulder_width_cm", label: "Shoulder Width", unit: "cm", ... },
      { key: "sleeve_length_cm", label: "Sleeve Length", unit: "cm", ... },
      { key: "front_length_cm", label: "Front Length", unit: "cm", ... },
      { key: "back_length_cm", label: "Back Length", unit: "cm", ... },
    ],
  },
  pants: {
    name: "Pants & Bottoms",
    fields: [
      { key: "waist_cm", label: "Waist", unit: "cm", ... },
      { key: "hip_cm", label: "Hip", unit: "cm", ... },
      { key: "inseam_cm", label: "Inseam", unit: "cm", ... },
      { key: "thigh_width_cm", label: "Thigh Width", unit: "cm", ... },
    ],
  },
  shoes: {
    name: "Shoes & Footwear",
    fields: [
      { key: "size_us", label: "US Size", unit: "", ... },
      { key: "size_eu", label: "EU Size", unit: "", ... },
      { key: "foot_length_cm", label: "Foot Length", unit: "cm", ... },
      { key: "foot_width_cm", label: "Foot Width", unit: "cm", ... },
    ],
  },
  belts: {
    name: "Belts & Accessories",
    fields: [
      { key: "belt_length_cm", label: "Belt Length", unit: "cm", ... },
      { key: "belt_width_cm", label: "Belt Width", unit: "cm", ... },
    ],
  },
  dresses: {
    name: "Dresses & Skirts",
    fields: [...],
  },
  jackets: {
    name: "Jackets & Coats",
    fields: [...],
  },
  generic: {
    name: "Generic Size",
    fields: [
      { key: "chest_cm", label: "Chest", ... },
      { key: "waist_cm", label: "Waist", ... },
      { key: "hip_cm", label: "Hip", ... },
      { key: "length_cm", label: "Length", ... },
    ],
  },
}
```

#### Helper Functions

**`detectProductCategory(categories: string[] | undefined): string`**

- Analyzes product categories
- Returns matching category key (shirts, pants, shoes, belts, dresses, jackets, or generic)
- Examples:
  - `["t-shirt", "tops"]` → `"shirts"`
  - `["jeans", "pants"]` → `"pants"`
  - `["sneakers", "shoes"]` → `"shoes"`
  - `["belt"]` → `"belts"`

**`getMeasurementFields(category: string): MeasurementField[]`**

- Returns measurement fields for a category
- Falls back to generic if category not found

**`getCategoryFieldKeys(category: string): string[]`**

- Returns array of field keys for database operations

## SizeManager Component

### File: `src/components/SizeManager.tsx`

#### Props

```typescript
interface SizeManagerProps {
  sizes: ProductSize[];
  onSizesChange: (sizes: ProductSize[]) => void;
  categories?: string[]; // Product categories (auto-detected)
  allowCustomMeasurements?: boolean;
  onAllowCustomChange?: (allow: boolean) => void;
}
```

#### Features

1. **Dynamic Field Rendering**

   - Shows only relevant measurements for product type
   - Fields automatically update when categories change

2. **Responsive Table**

   - Shows size name + all relevant measurements
   - Horizontal scrollable on small screens
   - Edit/Delete buttons per size

3. **Add/Edit Size Dialog**

   - Required: Size name
   - Optional: All relevant measurements
   - Prevents duplicate size names
   - Validates input

4. **Custom Measurements Toggle**
   - Optional per product
   - Allows customers to input custom measurements

#### Usage Example

```typescript
<SizeManager
  sizes={newProduct.sizes}
  onSizesChange={(sizes) => setNewProduct({ ...newProduct, sizes })}
  categories={["jeans", "pants"]} // Auto-detects pants category
  allowCustomMeasurements={newProduct.allowCustomMeasurements}
  onAllowCustomChange={(allow) =>
    setNewProduct({ ...newProduct, allowCustomMeasurements: allow })
  }
/>
```

## Integration in Inventory Page

The Inventory page now:

1. **Passes Categories to SizeManager**

   ```typescript
   categories={
     newProduct.categories
       .split(",")
       .map((c) => c.trim())
       .filter(Boolean)
   }
   ```

2. **Handles Size Persistence**

   - Saves sizes to `product_sizes` table
   - Loads sizes when editing product
   - Cleans up sizes on product delete (CASCADE)

3. **Type Safety**
   - Full TypeScript support
   - Database types regenerated with new columns
   - No `any` types

## Product Workflows

### Adding a T-Shirt

1. Click "Add Product"
2. Fill in Name: "Classic T-Shirt", SKU: "TS-001"
3. Categories: **"shirt, tops"** ← Triggers shirt category detection
4. SizeManager shows: Chest, Shoulder Width, Sleeve Length, Front Length, Back Length
5. Add sizes: XS, S, M, L, XL with measurements
6. Save

### Adding Jeans

1. Click "Add Product"
2. Fill in Name: "Denim Jeans", SKU: "JN-001"
3. Categories: **"pants, jeans"** ← Triggers pants category detection
4. SizeManager shows: Waist, Hip, Inseam, Thigh Width
5. Add sizes: 28, 30, 32, 34, 36 with measurements
6. Save

### Adding Shoes

1. Click "Add Product"
2. Fill in Name: "Running Shoes", SKU: "SH-001"
3. Categories: **"shoes, sneakers"** ← Triggers shoes category detection
4. SizeManager shows: US Size, EU Size, Foot Length, Foot Width
5. Add sizes: 8, 9, 10, 11, 12 with measurements
6. Save

### Adding a Belt

1. Click "Add Product"
2. Fill in Name: "Leather Belt", SKU: "BT-001"
3. Categories: **"belt, accessories"** ← Triggers belts category detection
4. SizeManager shows: Belt Length, Belt Width
5. Add sizes: Small (90cm), Medium (95cm), Large (100cm)
6. Save

## Category Detection

The system automatically detects categories from product tags:

| Keywords                     | Detected Category |
| ---------------------------- | ----------------- |
| shirt, top, tee, blouse      | shirts            |
| pant, jean, trouser, legging | pants             |
| shoe, sneaker                | shoes             |
| belt, accessory              | belts             |
| dress, skirt, gown           | dresses           |
| jacket, coat, blazer         | jackets           |
| _(anything else)_            | generic           |

**Case-insensitive matching** - Category names don't need exact case match.

## Data Storage

### Example: Jeans Size Data

```json
{
  "id": "uuid-123",
  "product_id": "product-uuid",
  "size_name": "32",
  "waist_cm": 81,
  "hip_cm": 97,
  "inseam_cm": 81,
  "thigh_width_cm": 29,
  "chest_cm": null,
  "shoulder_width_cm": null,
  "sleeve_length_cm": null,
  "front_length_cm": null,
  "back_length_cm": null,
  "size_us": null,
  "size_eu": null,
  "foot_length_cm": null,
  "foot_width_cm": null,
  "belt_length_cm": null,
  "belt_width_cm": null,
  "created_at": "2025-12-13T10:00:00Z"
}
```

All irrelevant measurements are `null` to save storage space.

## Future Enhancements

1. **Preset Size Scales**

   - Store standard industry sizes per category
   - Quick-fill for common sizes

2. **Size Charts**

   - Generate visual size charts per product
   - Customer-facing comparison

3. **Size Recommendations**

   - AI-powered size suggestions based on customer measurements
   - Historical purchase patterns

4. **Size Conversion**

   - Convert between US/EU sizes automatically
   - Show equivalent sizes across standards

5. **Bulk Size Import**
   - CSV upload for multiple sizes
   - Template for each category

## Deployment Steps

1. **Run Migration**

   ```bash
   # In Supabase SQL Editor, run:
   # migrations/add_product_sizes.sql
   ```

2. **Regenerate Types**

   ```bash
   npx supabase gen types typescript --project-id "ksodyocfkgmmiosriixa" > src/lib/database.types.ts
   ```

3. **Verify**
   ```bash
   npm run lint  # Should pass
   npm run dev   # Start dev server
   ```

## Testing Checklist

- [ ] Add product with shirts category → Shows shirt measurements
- [ ] Add product with pants category → Shows pant measurements
- [ ] Add product with shoes category → Shows shoe measurements
- [ ] Add product with belt category → Shows belt measurements
- [ ] Edit existing product → Sizes load correctly
- [ ] Change categories → Measurement fields update
- [ ] Add size with all measurements → Data saves correctly
- [ ] Edit size → Updates correctly
- [ ] Delete size → Removes correctly
- [ ] Generic category → Shows generic measurements
- [ ] Mixed categories → Matches most relevant

## Troubleshooting

**Q: Sizes not showing correct measurements?**  
A: Check categories are spelled correctly and match keyword list (case-insensitive).

**Q: No category detection?**  
A: Leave categories blank or use generic - defaults to generic measurements.

**Q: Can't edit size measurements?**  
A: Dialog may need scroll - measurements grid is responsive.

**Q: Database migration failed?**  
A: Ensure all columns exist. Check Supabase logs for errors.
