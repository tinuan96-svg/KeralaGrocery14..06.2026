import { getSupabase } from '@/lib/supabase/client';

export type DateRange = '1d' | '7d' | '30d' | '90d' | '365d';

export function getDateRange(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range];
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

export interface ProfitSummary {
  total_revenue: number;
  total_cogs: number;
  total_payment_fees: number;
  gross_profit: number;
  net_profit: number;
  order_count: number;
  avg_order_value: number;
  profit_margin_pct: number;
}

export interface ReserveData {
  total_revenue: number;
  reserve_amount: number;
  net_cash_available: number;
  units_sold: number;
}

export interface OrderKpis {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  avg_order_value: number;
  total_delivery_fees: number;
}

export interface CustomerKpis {
  new_customers: number;
  returning_customers: number;
  total_customers: number;
  guest_orders: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  image_url: string | null;
  units_sold: number;
  revenue: number;
  avg_price?: number;
  cogs?: number;
  profit?: number;
  margin_pct?: number;
}

export interface ChartPoint {
  period_label: string;
  revenue: number;
  order_count: number;
  profit: number;
}

export async function fetchProfitSummary(range: DateRange): Promise<ProfitSummary | null> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_profit_summary', { p_from: from, p_to: to });
  if (error) { console.error('[dashboardService] profit_summary:', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    total_revenue: Number(row.total_revenue ?? 0),
    total_cogs: Number(row.total_cogs ?? 0),
    total_payment_fees: Number(row.total_payment_fees ?? 0),
    gross_profit: Number(row.gross_profit ?? 0),
    net_profit: Number(row.net_profit ?? 0),
    order_count: Number(row.order_count ?? 0),
    avg_order_value: Number(row.avg_order_value ?? 0),
    profit_margin_pct: Number(row.profit_margin_pct ?? 0),
  };
}

export async function fetchReserveData(range: DateRange): Promise<ReserveData | null> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_stock_replenishment_reserve', { p_from: from, p_to: to });
  if (error) { console.error('[dashboardService] reserve:', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    total_revenue: Number(row.total_revenue ?? 0),
    reserve_amount: Number(row.reserve_amount ?? 0),
    net_cash_available: Number(row.net_cash_available ?? 0),
    units_sold: Number(row.units_sold ?? 0),
  };
}

export async function fetchOrderKpis(range: DateRange): Promise<OrderKpis | null> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_order_kpis', { p_from: from, p_to: to });
  if (error) { console.error('[dashboardService] order_kpis:', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    total_orders: Number(row.total_orders ?? 0),
    paid_orders: Number(row.paid_orders ?? 0),
    pending_orders: Number(row.pending_orders ?? 0),
    cancelled_orders: Number(row.cancelled_orders ?? 0),
    total_revenue: Number(row.total_revenue ?? 0),
    avg_order_value: Number(row.avg_order_value ?? 0),
    total_delivery_fees: Number(row.total_delivery_fees ?? 0),
  };
}

export async function fetchCustomerKpis(range: DateRange): Promise<CustomerKpis | null> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_customer_kpis', { p_from: from, p_to: to });
  if (error) { console.error('[dashboardService] customer_kpis:', error); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    new_customers: Number(row.new_customers ?? 0),
    returning_customers: Number(row.returning_customers ?? 0),
    total_customers: Number(row.total_customers ?? 0),
    guest_orders: Number(row.guest_orders ?? 0),
  };
}

export async function fetchTopByRevenue(range: DateRange, limit = 8): Promise<TopProduct[]> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_top_products_by_revenue', { p_from: from, p_to: to, p_limit: limit });
  if (error) { console.error('[dashboardService] top_revenue:', error); return []; }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    product_id: String(r.product_id ?? ''),
    product_name: String(r.product_name ?? ''),
    image_url: r.image_url ? String(r.image_url) : null,
    units_sold: Number(r.units_sold ?? 0),
    revenue: Number(r.revenue ?? 0),
    avg_price: Number(r.avg_price ?? 0),
  }));
}

export async function fetchTopByProfit(range: DateRange, limit = 8): Promise<TopProduct[]> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const { data, error } = await supabase.rpc('get_top_products_by_profit', { p_from: from, p_to: to, p_limit: limit });
  if (error) { console.error('[dashboardService] top_profit:', error); return []; }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    product_id: String(r.product_id ?? ''),
    product_name: String(r.product_name ?? ''),
    image_url: r.image_url ? String(r.image_url) : null,
    units_sold: Number(r.units_sold ?? 0),
    revenue: Number(r.revenue ?? 0),
    cogs: Number(r.cogs ?? 0),
    profit: Number(r.profit ?? 0),
    margin_pct: Number(r.margin_pct ?? 0),
  }));
}

export async function fetchRevenueChart(range: DateRange): Promise<ChartPoint[]> {
  const supabase = getSupabase();
  const { from, to } = getDateRange(range);
  const granularity = range === '1d' ? 'hour' : range === '7d' ? 'day' : range === '30d' ? 'day' : 'week';
  const { data, error } = await supabase.rpc('get_revenue_chart', {
    p_from: from, p_to: to, p_granularity: granularity,
  });
  if (error) { console.error('[dashboardService] revenue_chart:', error); return []; }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    period_label: String(r.period_label ?? ''),
    revenue: Number(r.revenue ?? 0),
    order_count: Number(r.order_count ?? 0),
    profit: Number(r.profit ?? 0),
  }));
}

export async function fetchCentralhubStatus(): Promise<{
  connected: boolean;
  last_sync: string | null;
  total_synced: number;
  pending_approval: number;
}> {
  const supabase = getSupabase();
  const [syncRes, pendingRes] = await Promise.all([
    supabase.from('products').select('last_sync_at').not('last_sync_at', 'is', null).order('last_sync_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'draft').eq('is_deleted', false),
  ]);

  // Total count includes all products linked to CentralHub, including deleted ones
  // as requested by the user to ensure 400+ products are reflected.
  const totalRes = await supabase.from('products').select('*', { count: 'exact', head: true }).not('centralhub_product_id', 'is', null);

  return {
    connected: !syncRes.error,
    last_sync: syncRes.data?.last_sync_at ?? null,
    total_synced: totalRes.count ?? 0,
    pending_approval: pendingRes.count ?? 0,
  };
}
