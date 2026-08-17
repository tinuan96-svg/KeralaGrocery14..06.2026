/**
 * Dynamic Theme Accent System
 *
 * Maps banner types to accent color palettes.
 * Writes CSS custom properties to :root so any component on the page
 * can reference them via var(--ka-*) and get smooth transitions via @property.
 *
 * Palette design rules:
 *  --ka-c      primary accent (icon color, active states)
 *  --ka-bg     ultra-light background tint (section gradient top)
 *  --ka-border border / ring color
 *  --ka-text   dark readable accent text (View All labels, timer text)
 */

export interface AccentPalette {
  c:      string;
  bg:     string;
  border: string;
  text:   string;
}

// One palette per banner_type value in the DB / fallbacks
const PALETTES: Record<string, AccentPalette> = {
  // Flash Deals → warm orange/red
  flash_deal: {
    c:      '#EA580C',
    bg:     '#FFF7ED',
    border: '#FED7AA',
    text:   '#9A3412',
  },
  // Cashback / loyalty → KG brand green
  cashback_promotion: {
    c:      '#16A34A',
    bg:     '#F0FDF4',
    border: '#86EFAC',
    text:   '#14532D',
  },
  // Free delivery → golden amber
  free_delivery: {
    c:      '#D97706',
    bg:     '#FFFBEB',
    border: '#FDE68A',
    text:   '#78350F',
  },
  // New arrivals → clear blue
  new_arrivals: {
    c:      '#2563EB',
    bg:     '#EFF6FF',
    border: '#BFDBFE',
    text:   '#1E3A8A',
  },
  // Product spotlight → teal
  product_promotion: {
    c:      '#0891B2',
    bg:     '#ECFEFF',
    border: '#A5F3FC',
    text:   '#164E63',
  },
  // Seasonal / special → amber
  seasonal: {
    c:      '#D97706',
    bg:     '#FFFBEB',
    border: '#FDE68A',
    text:   '#78350F',
  },
  // Brand highlight → rose
  brand_promotion: {
    c:      '#E11D48',
    bg:     '#FFF1F2',
    border: '#FECDD3',
    text:   '#881337',
  },
};

// Default palette — Warmer KG brand green
const DEFAULT_PALETTE: AccentPalette = {
  c:      '#166534', // Warm deep green
  bg:     '#FDFBF7', // Creamy warm background
  border: '#DCFCE7', // Light green border
  text:   '#064E3B', // Deep forest text
};

let lastType: string | undefined;

/**
 * Apply an accent palette matching the given banner type.
 * Called whenever the active carousel slide changes.
 * No-ops server-side or when the type hasn't changed.
 */
export function applyAccent(bannerType: string | undefined | null): void {
  if (typeof document === 'undefined') return;
  if (bannerType === lastType) return;
  lastType = bannerType ?? undefined;

  const p: AccentPalette = (bannerType ? PALETTES[bannerType] : undefined) ?? DEFAULT_PALETTE;
  const root = document.documentElement;
  root.style.setProperty('--ka-c',      p.c);
  root.style.setProperty('--ka-bg',     p.bg);
  root.style.setProperty('--ka-border', p.border);
  root.style.setProperty('--ka-text',   p.text);
}

/** Reset to the default KG green palette. */
export function resetAccent(): void {
  applyAccent(undefined);
}
