/**
 * Size Measurement Configuration by Product Category
 * Defines which measurements are relevant for each clothing type
 */

export interface MeasurementField {
  key: keyof ProductSizeMeasurements;
  label: string;
  unit: string;
  placeholder: string;
}

export interface ProductSizeMeasurements {
  // Shirts/Tops
  chest_cm?: number | null;
  shoulder_width_cm?: number | null;
  sleeve_length_cm?: number | null;
  front_length_cm?: number | null;
  back_length_cm?: number | null;
  // Pants/Bottoms
  waist_cm?: number | null;
  hip_cm?: number | null;
  inseam_cm?: number | null;
  thigh_width_cm?: number | null;
  // Shoes
  size_us?: number | null;
  size_eu?: number | null;
  foot_length_cm?: number | null;
  foot_width_cm?: number | null;
  // Belts/Accessories
  belt_length_cm?: number | null;
  belt_width_cm?: number | null;
}

export interface SizeCategoryConfig {
  name: string;
  fields: MeasurementField[];
}

export const SIZE_CATEGORIES: Record<string, SizeCategoryConfig> = {
  shirts: {
    name: "Shirts & Tops",
    fields: [
      {
        key: "chest_cm",
        label: "Chest",
        unit: "cm",
        placeholder: "e.g., 86",
      },
      {
        key: "shoulder_width_cm",
        label: "Shoulder Width",
        unit: "cm",
        placeholder: "e.g., 38",
      },
      {
        key: "sleeve_length_cm",
        label: "Sleeve Length",
        unit: "cm",
        placeholder: "e.g., 63",
      },
      {
        key: "front_length_cm",
        label: "Front Length",
        unit: "cm",
        placeholder: "e.g., 70",
      },
      {
        key: "back_length_cm",
        label: "Back Length",
        unit: "cm",
        placeholder: "e.g., 70",
      },
    ],
  },
  pants: {
    name: "Pants & Bottoms",
    fields: [
      {
        key: "waist_cm",
        label: "Waist",
        unit: "cm",
        placeholder: "e.g., 71",
      },
      {
        key: "hip_cm",
        label: "Hip",
        unit: "cm",
        placeholder: "e.g., 89",
      },
      {
        key: "inseam_cm",
        label: "Inseam",
        unit: "cm",
        placeholder: "e.g., 76",
      },
      {
        key: "thigh_width_cm",
        label: "Thigh Width",
        unit: "cm",
        placeholder: "e.g., 28",
      },
    ],
  },
  shoes: {
    name: "Shoes & Footwear",
    fields: [
      {
        key: "size_us",
        label: "US Size",
        unit: "",
        placeholder: "e.g., 10",
      },
      {
        key: "size_eu",
        label: "EU Size",
        unit: "",
        placeholder: "e.g., 42",
      },
      {
        key: "foot_length_cm",
        label: "Foot Length",
        unit: "cm",
        placeholder: "e.g., 27",
      },
      {
        key: "foot_width_cm",
        label: "Foot Width",
        unit: "cm",
        placeholder: "e.g., 9.5",
      },
    ],
  },
  belts: {
    name: "Belts & Accessories",
    fields: [
      {
        key: "belt_length_cm",
        label: "Belt Length",
        unit: "cm",
        placeholder: "e.g., 90",
      },
      {
        key: "belt_width_cm",
        label: "Belt Width",
        unit: "cm",
        placeholder: "e.g., 3.5",
      },
    ],
  },
  dresses: {
    name: "Dresses & Skirts",
    fields: [
      {
        key: "chest_cm",
        label: "Chest/Bust",
        unit: "cm",
        placeholder: "e.g., 86",
      },
      {
        key: "waist_cm",
        label: "Waist",
        unit: "cm",
        placeholder: "e.g., 71",
      },
      {
        key: "hip_cm",
        label: "Hip",
        unit: "cm",
        placeholder: "e.g., 89",
      },
      {
        key: "front_length_cm",
        label: "Front Length",
        unit: "cm",
        placeholder: "e.g., 95",
      },
      {
        key: "back_length_cm",
        label: "Back Length",
        unit: "cm",
        placeholder: "e.g., 95",
      },
    ],
  },
  jackets: {
    name: "Jackets & Coats",
    fields: [
      {
        key: "chest_cm",
        label: "Chest",
        unit: "cm",
        placeholder: "e.g., 86",
      },
      {
        key: "shoulder_width_cm",
        label: "Shoulder Width",
        unit: "cm",
        placeholder: "e.g., 38",
      },
      {
        key: "sleeve_length_cm",
        label: "Sleeve Length",
        unit: "cm",
        placeholder: "e.g., 63",
      },
      {
        key: "front_length_cm",
        label: "Front Length",
        unit: "cm",
        placeholder: "e.g., 75",
      },
    ],
  },
  perfumes: {
    name: "Perfumes & Fragrances",
    fields: [],
  },
  generic: {
    name: "Generic Size",
    fields: [
      {
        key: "chest_cm",
        label: "Chest",
        unit: "cm",
        placeholder: "e.g., 86",
      },
      {
        key: "waist_cm",
        label: "Waist",
        unit: "cm",
        placeholder: "e.g., 71",
      },
      {
        key: "hip_cm",
        label: "Hip",
        unit: "cm",
        placeholder: "e.g., 89",
      },
      {
        key: "front_length_cm",
        label: "Length",
        unit: "cm",
        placeholder: "e.g., 70",
      },
    ],
  },
};

/**
 * Detects product category from category tags
 * Returns the most specific category config match
 */
export function detectProductCategory(
  categories: string[] | undefined
): string {
  if (!categories || categories.length === 0) return "generic";

  const categoryLower = categories.join(" ").toLowerCase();

  // Check for specific matches
  if (
    categoryLower.includes("shirt") ||
    categoryLower.includes("top") ||
    categoryLower.includes("tee") ||
    categoryLower.includes("blouse")
  ) {
    return "shirts";
  }
  if (
    categoryLower.includes("pant") ||
    categoryLower.includes("jean") ||
    categoryLower.includes("trouser") ||
    categoryLower.includes("legging")
  ) {
    return "pants";
  }
  if (categoryLower.includes("shoe") || categoryLower.includes("sneaker")) {
    return "shoes";
  }
  if (categoryLower.includes("belt") || categoryLower.includes("accessory")) {
    return "belts";
  }
  if (
    categoryLower.includes("dress") ||
    categoryLower.includes("skirt") ||
    categoryLower.includes("gown")
  ) {
    return "dresses";
  }
  if (
    categoryLower.includes("jacket") ||
    categoryLower.includes("coat") ||
    categoryLower.includes("blazer")
  ) {
    return "jackets";
  }
  if (
    categoryLower.includes("perfume") ||
    categoryLower.includes("fragrance") ||
    categoryLower.includes("cologne") ||
    categoryLower.includes("scent")
  ) {
    return "perfumes";
  }

  return "generic";
}

/**
 * Get measurement fields for a category
 */
export function getMeasurementFields(category: string): MeasurementField[] {
  return SIZE_CATEGORIES[category]?.fields || SIZE_CATEGORIES.generic.fields;
}

/**
 * Get all field keys for a category (for saving/loading)
 */
export function getCategoryFieldKeys(category: string): string[] {
  return getMeasurementFields(category).map((f) => f.key);
}
