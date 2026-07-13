import { getSupabase } from '@/lib/supabase/client';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'cashback_credit' | 'cashback_expiry' | 'refund_credit' | 'promotion_credit' |
        'referral_credit' | 'manual_credit' | 'manual_debit' | 'wallet_payment';
  source: string | null;
  amount: number;
  description: string | null;
  balance_after: number;
  order_id: string | null;
  expires_at: string | null;
  expired_at: string | null;
  created_at: string;
}

export interface WalletCycle {
  id: string;
  user_id: string;
  cycle_start: string;
  cycle_end: string;
  spend: number;
  tier: 'bronze' | 'silver' | 'gold';
  cashback_amount: number | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface WalletCashbackLog {
  id: string;
  user_id: string;
  cycle_id: string | null;
  cycle_start: string;
  cycle_end: string;
  spend: number;
  tier: string;
  cashback_amount: number;
  used_amount: number;
  expiry_date: string;
  transaction_id: string | null;
  expired_at: string | null;
  created_at: string;
}

export interface WalletSettings {
  bronze_rate: number;
  silver_rate: number;
  gold_rate: number;
  bronze_days: number;
  silver_days: number;
  gold_days: number;
  bronze_min: number;
  bronze_max: number;
  silver_min: number;
  silver_max: number;
  gold_min: number;
  max_wallet_usage_percent: number;
}

export interface WalletSummary {
  wallet: Wallet | null;
  activeCycle: WalletCycle | null;
  settings: WalletSettings | null;
}

export const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-700',
  silver: 'text-slate-500',
  gold: 'text-yellow-600',
};

export const TIER_BG: Record<string, string> = {
  bronze: 'bg-amber-50 border-amber-200',
  silver: 'bg-slate-50 border-slate-200',
  gold: 'bg-yellow-50 border-yellow-200',
};

export function getTier(spend: number, settings: WalletSettings): 'bronze' | 'silver' | 'gold' {
  if (spend >= settings.gold_min) return 'gold';
  if (spend >= settings.silver_min) return 'silver';
  return 'bronze';
}

export function getCashbackRate(tier: string, settings: WalletSettings): number {
  if (tier === 'gold') return settings.gold_rate;
  if (tier === 'silver') return settings.silver_rate;
  return settings.bronze_rate;
}

export function getEstimatedCashback(spend: number, settings: WalletSettings): number {
  const tier = getTier(spend, settings);
  const rate = getCashbackRate(tier, settings);
  return parseFloat((spend * rate).toFixed(2));
}

export function daysRemaining(cycleEnd: string): number {
  const end = new Date(cycleEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function maxWalletUsable(subtotal: number, walletBalance: number, settings: WalletSettings): number {
  // Cap usage at the configured percentage of order subtotal (usually 50%)
  const maxFromSubtotal = parseFloat((subtotal * (settings.max_wallet_usage_percent || 0.5)).toFixed(2));

  // ALSO cap at 50% of current wallet balance as requested to encourage repeat purchases
  const maxFromBalance = parseFloat((walletBalance * 0.5).toFixed(2));

  return Math.min(walletBalance, maxFromSubtotal, maxFromBalance);
}

// ── Supabase queries ──────────────────────────────────────────────────────────

export async function fetchWalletSummary(userId: string): Promise<WalletSummary> {
  const supabase = getSupabase();

  const [walletRes, cycleRes, settingsRes] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('wallet_cycles')
      .select('*')
      .eq('user_id', userId)
      .eq('processed', false)
      .order('cycle_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('wallet_settings').select('*').eq('id', 1).single(),
  ]);

  let activeCycle = cycleRes.data as WalletCycle | null;

  // Compute real-time spend from orders — wallet_cycles.spend is only updated
  // by the nightly cron, so we recalculate here for immediate dashboard accuracy.
  if (activeCycle) {
    const { data: orders } = await supabase
      .from('orders')
      .select('total, wallet_amount')
      .eq('user_id', userId)
      .in('payment_status', ['paid'])
      .in('order_status', ['processing', 'completed', 'delivered'])
      .gte('created_at', `${activeCycle.cycle_start}T00:00:00.000Z`)
      .lt('created_at',  `${activeCycle.cycle_end}T00:00:00.000Z`);

    const realtimeSpend = parseFloat(
      ((orders ?? []).reduce((sum, o) => {
        const paid = parseFloat(String(o.total ?? 0)) - parseFloat(String(o.wallet_amount ?? 0));
        return sum + Math.max(0, paid);
      }, 0)).toFixed(2)
    );
    activeCycle = { ...activeCycle, spend: realtimeSpend };
  }

  return {
    wallet: walletRes.data as Wallet | null,
    activeCycle,
    settings: settingsRes.data as WalletSettings | null,
  };
}

export async function fetchTransactions(
  userId: string,
  page = 0,
  pageSize = 20
): Promise<{ transactions: WalletTransaction[]; total: number }> {
  const supabase = getSupabase();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[walletService] fetchTransactions error:', error.message);
    return { transactions: [], total: 0 };
  }

  return { transactions: (data ?? []) as WalletTransaction[], total: count ?? 0 };
}

export async function fetchCashbackLogs(userId: string): Promise<WalletCashbackLog[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('wallet_cashback_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[walletService] fetchCashbackLogs error:', error.message);
    return [];
  }
  return (data ?? []) as WalletCashbackLog[];
}

export async function fetchWalletSettings(): Promise<WalletSettings | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('wallet_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) return null;
  return data as WalletSettings;
}

// ── Admin queries ─────────────────────────────────────────────────────────────

export interface AdminWalletCustomer {
  user_id: string;
  email: string;
  balance: number;
  tier: string;
  highest_tier: string;
  cycle_start: string | null;
  cycle_end: string | null;
  current_spend: number;
  projected_cashback: number;
}

export async function fetchAdminWalletCustomers(): Promise<AdminWalletCustomer[]> {
  const supabase = getSupabase();

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('user_id, balance')
    .order('balance', { ascending: false })
    .limit(100);

  if (error || !wallets?.length) return [];

  const userIds = wallets.map(w => w.user_id);

  const [cyclesRes, profilesRes, settingsRes] = await Promise.all([
    supabase
      .from('wallet_cycles')
      .select('*')
      .in('user_id', userIds)
      .eq('processed', false)
      .order('cycle_start', { ascending: false }),
    // Use user_profiles (has email col) — avoids requiring service_role for auth.admin.listUsers
    supabase
      .from('user_profiles')
      .select('id, email, name')
      .in('id', userIds),
    supabase.from('wallet_settings').select('*').eq('id', 1).single(),
  ]);

  const cycleMap = new Map<string, WalletCycle>();
  for (const c of cyclesRes.data ?? []) {
    if (!cycleMap.has(c.user_id)) cycleMap.set(c.user_id, c as WalletCycle);
  }

  const userMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    userMap.set(p.id, p.email ?? p.name ?? p.id);
  }

  const settings = settingsRes.data as WalletSettings | null;

  return wallets.map(w => {
    const cycle = cycleMap.get(w.user_id);
    const spend = cycle?.spend ?? 0;
    const tier = settings ? getTier(spend, settings) : 'bronze';
    const projected = settings ? getEstimatedCashback(spend, settings) : 0;

    return {
      user_id: w.user_id,
      email: userMap.get(w.user_id) ?? w.user_id,
      balance: parseFloat(w.balance ?? 0),
      tier,
      highest_tier: tier,
      cycle_start: cycle?.cycle_start ?? null,
      cycle_end: cycle?.cycle_end ?? null,
      current_spend: spend,
      projected_cashback: projected,
    };
  });
}

// ── Processing logs ───────────────────────────────────────────────────────────

export interface WalletProcessingLog {
  id: string;
  triggered_by: 'cron' | 'admin_manual';
  triggered_by_user_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  cycles_created: number;
  cycles_processed: number;
  cashback_awarded: number;
  cashback_expired: number;
  error_message: string | null;
  summary: Record<string, unknown> | null;
}

export interface WalletProcessingStats {
  lastRun: WalletProcessingLog | null;
  nextRunUtc: string; // ISO string of next 02:00 UTC
  customersDueToday: number;
  cashbackPending: number; // sum of projected cashback for cycles expiring today/already expired + unprocessed
}

export async function fetchProcessingLogs(limit = 20): Promise<WalletProcessingLog[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('wallet_processing_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[walletService] fetchProcessingLogs error:', error.message);
    return [];
  }
  return (data ?? []) as WalletProcessingLog[];
}

export async function fetchProcessingStats(): Promise<WalletProcessingStats> {
  const supabase = getSupabase();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];

  // Next 02:00 UTC
  const next = new Date();
  next.setUTCHours(2, 0, 0, 0);
  if (next <= new Date()) next.setUTCDate(next.getUTCDate() + 1);
  const nextRunUtc = next.toISOString();

  const [lastRunRes, dueRes, pendingRes] = await Promise.all([
    supabase
      .from('wallet_processing_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Cycles that have expired and haven't been processed yet
    supabase
      .from('wallet_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('processed', false)
      .lte('cycle_end', todayIso),
    // Sum of projected cashback for unprocessed expired cycles
    supabase
      .from('wallet_cycles')
      .select('spend, tier')
      .eq('processed', false)
      .lte('cycle_end', todayIso),
  ]);

  // Estimate pending cashback using saved spend + tier columns
  let cashbackPending = 0;
  if (pendingRes.data) {
    const settingsRes = await supabase.from('wallet_settings').select('*').eq('id', 1).single();
    const s = settingsRes.data;
    if (s) {
      for (const c of pendingRes.data) {
        const rate = c.tier === 'gold' ? s.gold_rate : c.tier === 'silver' ? s.silver_rate : s.bronze_rate;
        cashbackPending += parseFloat(c.spend ?? '0') * rate;
      }
      cashbackPending = parseFloat(cashbackPending.toFixed(2));
    }
  }

  return {
    lastRun: (lastRunRes.data as WalletProcessingLog | null),
    nextRunUtc,
    customersDueToday: dueRes.count ?? 0,
    cashbackPending,
  };
}

export function formatCurrency(amount: number): string {
  return `£${Math.abs(amount).toFixed(2)}`;
}

export function txTypeLabel(type: WalletTransaction['type']): string {
  const labels: Record<string, string> = {
    cashback_credit:   'Cashback Earned',
    cashback_expiry:   'Cashback Expired',
    refund_credit:     'Refund Credit',
    promotion_credit:  'Promotion Credit',
    referral_credit:   'Referral Bonus',
    manual_credit:     'Manual Credit',
    manual_debit:      'Manual Debit',
    wallet_payment:    'Wallet Payment',
  };
  return labels[type] ?? type;
}

export function txTypeColor(type: WalletTransaction['type']): string {
  const credits = ['cashback_credit', 'refund_credit', 'promotion_credit', 'referral_credit', 'manual_credit'];
  if (credits.includes(type)) return 'text-green-600';
  return 'text-red-500';
}
