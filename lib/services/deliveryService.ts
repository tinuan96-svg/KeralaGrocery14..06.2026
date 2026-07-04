import { getSupabase } from '@/lib/supabase/client';

export interface DeliverySettings {
  id: string;
  free_delivery_threshold: number;
  free_delivery_enabled: boolean;
  free_delivery_message: string;
  standard_delivery_fee: number;
  standard_delivery_enabled: boolean;
  standard_delivery_label: string;
  express_delivery_fee: number;
  express_delivery_enabled: boolean;
  express_delivery_label: string;
  same_day_delivery_fee: number;
  same_day_delivery_enabled: boolean;
  same_day_delivery_label: string;
  click_collect_fee: number;
  click_collect_enabled: boolean;
  click_collect_label: string;
  updated_at: string;
  updated_by: string | null;
}

export interface DeliveryRegion {
  id: string;
  region_name: string;
  delivery_fee: number;
  enabled: boolean;
  sort_order: number;
  updated_at: string;
}

export interface DeliveryCalcResult {
  fee: number;
  isFree: boolean;
  label: string;
  progressMessage: string;
  remaining: number;
}

const FALLBACK_SETTINGS: DeliverySettings = {
  id: '',
  free_delivery_threshold: 40,
  free_delivery_enabled: true,
  free_delivery_message: 'Spend £{remaining} more for FREE delivery',
  standard_delivery_fee: 4.99,
  standard_delivery_enabled: true,
  standard_delivery_label: 'Standard Delivery (2-3 days)',
  express_delivery_fee: 7.99,
  express_delivery_enabled: false,
  express_delivery_label: 'Express Delivery (Next day)',
  same_day_delivery_fee: 9.99,
  same_day_delivery_enabled: false,
  same_day_delivery_label: 'Same Day Delivery',
  click_collect_fee: 0,
  click_collect_enabled: false,
  click_collect_label: 'Click & Collect',
  updated_at: new Date().toISOString(),
  updated_by: null,
};

// Module-level cache so we don't re-fetch on every render
let _settingsCache: DeliverySettings | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  if (_settingsCache && Date.now() < _cacheExpiry) return _settingsCache;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error('[deliveryService] fetch settings:', error);
    return FALLBACK_SETTINGS;
  }

  _settingsCache = normaliseSettings(data);
  _cacheExpiry = Date.now() + CACHE_TTL_MS;
  return _settingsCache;
}

export function invalidateDeliveryCache() {
  _settingsCache = null;
  _cacheExpiry = 0;
}

export async function fetchDeliveryRegions(): Promise<DeliveryRegion[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('delivery_regions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[deliveryService] fetch regions:', error);
    return [];
  }
  return (data ?? []).map(normaliseRegion);
}

export async function fetchDeliveryAuditLog(limit = 50) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('delivery_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[deliveryService] fetch audit log:', error);
    return [];
  }
  return data ?? [];
}

// ── Calculate delivery fee for a given subtotal (optionally region-aware) ──────
export function calcDelivery(
  subtotal: number,
  settings: DeliverySettings,
  regionFee?: number
): DeliveryCalcResult {
  const threshold = settings.free_delivery_threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const isFree = settings.free_delivery_enabled && subtotal >= threshold;

  let fee: number;
  let label: string;

  if (isFree) {
    fee = 0;
    label = 'FREE';
  } else if (regionFee !== undefined) {
    fee = regionFee;
    label = `£${regionFee.toFixed(2)}`;
  } else {
    fee = settings.standard_delivery_enabled ? settings.standard_delivery_fee : 0;
    label = fee === 0 ? 'FREE' : `£${fee.toFixed(2)}`;
  }

  const progressMessage = isFree
    ? 'Free delivery applied'
    : settings.free_delivery_message.replace('{remaining}', `£${remaining.toFixed(2)}`);

  return { fee, isFree, label, progressMessage, remaining };
}

// ── Save delivery settings (admin) ────────────────────────────────────────────
export async function saveDeliverySettings(
  updates: Partial<Omit<DeliverySettings, 'id' | 'updated_at' | 'updated_by'>>,
  adminId: string,
  adminEmail: string,
  currentSettings: DeliverySettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('delivery_settings')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq('id', currentSettings.id);

  if (error) return { success: false, error: error.message };

  // Write audit log entries for each changed field
  const auditRows = (Object.keys(updates) as (keyof typeof updates)[])
    .filter(k => (updates[k] as unknown) !== (currentSettings[k] as unknown))
    .map(k => ({
      changed_by: adminId,
      changed_by_email: adminEmail,
      table_name: 'delivery_settings',
      field_name: k,
      old_value: String(currentSettings[k] ?? ''),
      new_value: String(updates[k] ?? ''),
    }));

  if (auditRows.length > 0) {
    await supabase.from('delivery_audit_log').insert(auditRows);
  }

  invalidateDeliveryCache();
  return { success: true };
}

// ── Save a single region (admin) ──────────────────────────────────────────────
export async function saveDeliveryRegion(
  regionId: string,
  updates: Partial<Pick<DeliveryRegion, 'delivery_fee' | 'enabled'>>,
  adminId: string,
  adminEmail: string,
  current: DeliveryRegion
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('delivery_regions')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq('id', regionId);

  if (error) return { success: false, error: error.message };

  const auditRows = (Object.keys(updates) as (keyof typeof updates)[])
    .filter(k => updates[k] !== (current[k] as unknown))
    .map(k => ({
      changed_by: adminId,
      changed_by_email: adminEmail,
      table_name: 'delivery_regions',
      field_name: `${current.region_name}.${k}`,
      old_value: String(current[k] ?? ''),
      new_value: String(updates[k] ?? ''),
    }));

  if (auditRows.length > 0) {
    await supabase.from('delivery_audit_log').insert(auditRows);
  }

  return { success: true };
}

// ── Fetch delivery performance stats for dashboard widget ─────────────────────
export async function fetchDeliveryPerformance(range: '1d' | '7d' | '30d' = '1d') {
  const supabase = getSupabase();
  const days = { '1d': 1, '7d': 7, '30d': 30 }[range];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('delivery_fee, payment_status')
    .eq('payment_status', 'paid')
    .gte('created_at', from);

  if (error || !data) return { revenue: 0, freeCount: 0, paidCount: 0, avgFee: 0 };

  const revenue   = data.reduce((s, o) => s + Number(o.delivery_fee ?? 0), 0);
  const freeCount = data.filter(o => Number(o.delivery_fee ?? 0) === 0).length;
  const paidCount = data.filter(o => Number(o.delivery_fee ?? 0) > 0).length;
  const avgFee    = paidCount > 0 ? revenue / paidCount : 0;

  return { revenue, freeCount, paidCount, avgFee };
}

// ── Normalisers ───────────────────────────────────────────────────────────────
function normaliseSettings(r: Record<string, unknown>): DeliverySettings {
  return {
    id:                          String(r.id ?? ''),
    free_delivery_threshold:     Number(r.free_delivery_threshold ?? 40),
    free_delivery_enabled:       Boolean(r.free_delivery_enabled ?? true),
    free_delivery_message:       String(r.free_delivery_message ?? ''),
    standard_delivery_fee:       Number(r.standard_delivery_fee ?? 4.99),
    standard_delivery_enabled:   Boolean(r.standard_delivery_enabled ?? true),
    standard_delivery_label:     String(r.standard_delivery_label ?? ''),
    express_delivery_fee:        Number(r.express_delivery_fee ?? 7.99),
    express_delivery_enabled:    Boolean(r.express_delivery_enabled ?? false),
    express_delivery_label:      String(r.express_delivery_label ?? ''),
    same_day_delivery_fee:       Number(r.same_day_delivery_fee ?? 9.99),
    same_day_delivery_enabled:   Boolean(r.same_day_delivery_enabled ?? false),
    same_day_delivery_label:     String(r.same_day_delivery_label ?? ''),
    click_collect_fee:           Number(r.click_collect_fee ?? 0),
    click_collect_enabled:       Boolean(r.click_collect_enabled ?? false),
    click_collect_label:         String(r.click_collect_label ?? ''),
    updated_at:                  String(r.updated_at ?? ''),
    updated_by:                  r.updated_by ? String(r.updated_by) : null,
  };
}

function normaliseRegion(r: Record<string, unknown>): DeliveryRegion {
  return {
    id:           String(r.id ?? ''),
    region_name:  String(r.region_name ?? ''),
    delivery_fee: Number(r.delivery_fee ?? 4.99),
    enabled:      Boolean(r.enabled ?? true),
    sort_order:   Number(r.sort_order ?? 0),
    updated_at:   String(r.updated_at ?? ''),
  };
}
