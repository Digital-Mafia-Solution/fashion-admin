# Product Sizes Implementation Guide

## Overview

Added product size management with optional custom measurements support. Each product can have multiple sizes (e.g., S, M, L) with associated body measurements (chest, waist, hip, length, sleeve, inseam in cm).

## Database Changes

### 1. Migration SQL

File: `migrations/add_product_sizes.sql`

Run this migration in Supabase SQL Editor to:

- Add `allow_custom_measurements` boolean column to `products` table
- Create `product_sizes` table with detailed measurements for each size
- Set up RLS policies (admins can write, all can read)
- Create index for performance

**To apply:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/add_product_sizes.sql`
3. Execute

### 2. Update Database Types

After running the migration, regenerate types:

```bash
npx supabase gen types typescript --project-id "ksodyocfkgmmiosriixa" --schema public > src/lib/database.types.ts
```

## New Components

### `src/components/SizeManager.tsx`

Reusable size management component with:

- Add/Edit/Delete sizes UI
- Measurement input fields (cm-based):
  - Chest, Waist, Hip (body width measurements)
  - Length, Sleeve Length, Inseam (length measurements)
  - All optional except size name
- Toggle for allowing custom measurements
- Table display of current sizes

## Updated Pages

### `src/pages/Inventory.tsx`

Changes:

- Added `sizes` and `allowCustomMeasurements` to product form state
- Integrated `SizeManager` component in Add/Edit Product dialog
- Added `saveSizes()` function to persist sizes to `product_sizes` table
- Added `loadSizes()` function to load sizes when editing
- Sizes are persisted separately from main product record

**Flow:**

1. Admin adds/edits product
2. Admin adds sizes with measurements via SizeManager
3. On save: Product is created/updated first
4. Then sizes are saved to `product_sizes` table
5. On edit: Sizes are loaded from DB and populate SizeManager

## Data Structure

### Product Sizes

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "size_name": "M",
  "chest_cm": 86,
  "waist_cm": 71,
  "hip_cm": 89,
  "length_cm": 70,
  "sleeve_length_cm": 63,
  "inseam_cm": 76,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Product with Sizes

```json
{
  "id": "uuid",
  "name": "T-Shirt",
  "sku": "TS-001",
  "sizes": ["XS", "S", "M", "L", "XL"],
  "allow_custom_measurements": true,
  ...
}
```

## UI Flow

### Adding a Product with Sizes

1. Click "Add Product" button
2. Fill in Name, SKU, Weight, Categories, Image
3. Click "Add Size" in the Sizes section
4. Enter size name (e.g., "M")
5. (Optional) Enter measurements in cm
6. Click "Add Size"
7. Repeat for each size
8. (Optional) Check "Allow customers to enter custom measurements"
9. Click "Save Product"

### Editing a Product

1. Click "Edit" button on product
2. Form pre-fills with existing data including sizes
3. Can add, edit, or delete sizes
4. Changes persist when "Save Product" is clicked

## Future Enhancements

1. **Size Charts**: Display size chart on product detail page (customer-facing)
2. **Inventory by Size**: Track quantity per size per location
3. **Size Recommendation**: Suggest sizes based on customer measurements
4. **Size Variants**: Link sizes to inventory entries for better stock tracking
5. **Custom Size Guidelines**: Allow per-product custom measurement instructions

## Notes

- All measurements are in centimeters for consistency
- Size names are unique per product
- Measurements are optional and can be left blank
- Custom measurements feature is optional per product
- Sizes are deleted when product is archived/deleted (CASCADE)
- All authenticated users can view sizes (RLS policy)
- Only admins can create/edit/delete sizes (RLS policy)
