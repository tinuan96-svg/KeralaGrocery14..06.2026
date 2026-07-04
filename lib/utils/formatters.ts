// Currency

export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `£${n.toFixed(2)}`;
}

// Stock

export function formatStock(stock: number, unit?: string | null): string {
  if (stock <= 0) return 'Out of stock';
  if (stock <= 5) return `Only ${stock} left`;
  return unit ? `In stock (${unit})` : 'In stock';
}

export function stockLabel(stock: number): {
  text: string;
  color: string;
  dot: string;
} {
  if (stock <= 0) {
    return { text: 'Out of Stock', color: 'text-red-700 bg-red-50', dot: 'bg-red-500' };
  }
  if (stock <= 5) {
    return { text: `Only ${stock} left`, color: 'text-amber-700 bg-amber-50', dot: 'bg-amber-400' };
  }
  return { text: 'In Stock', color: 'text-green-700 bg-green-50', dot: 'bg-green-500' };
}

// Weight / unit display

export function formatWeight(weight: number | null, unit: string | null): string {
  if (!unit) return '';
  if (weight) return `${weight}${unit}`;
  return unit;
}

// Clean product display name: strips embedded weight/unit/brand from display_name,
// then appends brand if not already present.
export function cleanProductName(
  productTitle: string,
  brand: string | null | undefined
): string {
  const title = (productTitle ?? '').trim();
  const brandStr = (brand ?? '').trim();

  // Strip trailing weight+unit patterns like "0Kg", "1Kg", "500g", "250ml", "Kg", "g", "ml", "L", "ltr"
  // and anything that follows (which is usually the brand appended by the data source)
  const cleaned = title
    .replace(/\s+\d*\.?\d+\s*(kg|g|ml|l|ltr|gm|oz|lb)\b.*$/i, '')
    .replace(/\s+\d+\s*(kg|g|ml|l|ltr|gm|oz|lb)\b.*$/i, '')
    .replace(/\s+(kg|g|ml|l|ltr|gm|oz|lb)\b.*$/i, '')
    .trim();

  if (!brandStr) return cleaned;

  // Append brand only if not already present (case-insensitive)
  if (cleaned.toLowerCase().includes(brandStr.toLowerCase())) return cleaned;
  return `${cleaned} ${brandStr}`;
}

// Discount percentage between two prices

export function discountPercent(original: number, effective: number): number {
  if (!original || original <= effective) return 0;
  return Math.round(((original - effective) / original) * 100);
}
