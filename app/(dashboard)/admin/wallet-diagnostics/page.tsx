'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { formatCurrency, getTier, getCashbackRate, TIER_LABELS } from '@/lib/services/walletService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, RefreshCw, Wallet, ShoppingCart, TrendingUp, Zap, Clock, Trophy } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagnosticCheck {
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
}

interface WalletDiagnostic {
  userId: string;
  email: string;

  // Wallet
  walletExists: boolean;
  walletBalance: number;
  walletUpdatedAt: string | null;

  // Active cycle
  cycleExists: boolean;
  cycleStart: string | null;
  cycleEnd: string | null;
  cycleTier: string;
  cycleStoredSpend: number;

  // Real-time spend (from orders)
  realtimeSpend: number;
  ordersInCycle: Array<{ id: string; order_number: string; total: number; wallet_amount: number; created_at: string; order_status: string; payment_status: string }>;

  // Tier & cashback calculation
  calculatedTier: string;
  cashbackRate: number;
  estimatedCashback: number;

  // Cashback history
  lastCashbackCredit: { amount: number; created_at: string; description: string } | null;

  // Last transaction
  lastTransaction: { type: string; amount: number; balance_after: number; created_at: string; description: string | null } | null;

  // Wallet settings
  settings: { bronze_min: number; silver_min: number; gold_min: number; bronze_rate: number; silver_rate: number; gold_rate: number } | null;

  // Health checks
  checks: DiagnosticCheck[];
}

// ── Health check helpers ──────────────────────────────────────────────────────

function runHealthChecks(d: Omit<WalletDiagnostic, 'checks'>): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  checks.push(
    d.ordersInCycle.length > 0
      ? { label: 'Order linked to cycle', status: 'pass', detail: `${d.ordersInCycle.length} paid order(s) in current cycle window` }
      : { label: 'Order linked to cycle', status: 'warn', detail: 'No paid orders found in current cycle window (may be outside cycle dates)' }
  );

  const spendDrift = Math.abs(d.realtimeSpend - d.cycleStoredSpend);
  checks.push(
    d.cycleExists
      ? spendDrift < 0.01
        ? { label: 'Spend recorded (DB)', status: 'pass', detail: `wallet_cycles.spend = £${d.cycleStoredSpend.toFixed(2)} matches realtime` }
        : { label: 'Spend recorded (DB)', status: 'warn', detail: `wallet_cycles.spend = £${d.cycleStoredSpend.toFixed(2)} — differs from realtime £${d.realtimeSpend.toFixed(2)} (updates on cron)` }
      : { label: 'Spend recorded (DB)', status: 'fail', detail: 'No active loyalty cycle row found — ensure_loyalty_cycle may not have run yet' }
  );

  const expectedTier = d.settings ? getTier(d.realtimeSpend, d.settings as any) : 'bronze';
  checks.push(
    expectedTier === d.calculatedTier
      ? { label: 'Tier calculated', status: 'pass', detail: `${TIER_LABELS[d.calculatedTier]} (spend £${d.realtimeSpend.toFixed(2)})` }
      : { label: 'Tier calculated', status: 'warn', detail: `Expected ${TIER_LABELS[expectedTier]}, got ${TIER_LABELS[d.calculatedTier]}` }
  );

  checks.push(
    d.estimatedCashback > 0
      ? { label: 'Cashback calculated', status: 'pass', detail: `£${d.estimatedCashback.toFixed(2)} at ${(d.cashbackRate * 100).toFixed(0)}% (${TIER_LABELS[d.calculatedTier]})` }
      : { label: 'Cashback calculated', status: d.realtimeSpend > 0 ? 'warn' : 'skip', detail: d.realtimeSpend > 0 ? 'Spend > 0 but cashback = 0 — check cashback rate in wallet_settings' : 'No eligible spend yet' }
  );

  checks.push(
    d.lastCashbackCredit
      ? { label: 'Wallet credited', status: 'pass', detail: `Last cashback: £${d.lastCashbackCredit.amount.toFixed(2)} on ${new Date(d.lastCashbackCredit.created_at).toLocaleDateString('en-GB')}` }
      : { label: 'Wallet credited', status: 'skip', detail: 'No cashback credits yet — runs at cycle end' }
  );

  checks.push(
    d.walletExists
      ? { label: 'Wallet balance', status: 'pass', detail: `Balance: £${d.walletBalance.toFixed(2)} · last updated ${d.walletUpdatedAt ? new Date(d.walletUpdatedAt).toLocaleString('en-GB') : 'n/a'}` }
      : { label: 'Wallet balance', status: 'fail', detail: 'Wallet row missing — ensure_loyalty_cycle has not run yet' }
  );

  return checks;
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: DiagnosticCheck['status'] }) {
  if (status === 'pass') return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  return <AlertCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WalletDiagnosticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [emailSearch, setEmailSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WalletDiagnostic | null>(null);

  if (!authLoading && (!user || !user.app_metadata?.is_admin)) {
    router.replace('/admin/login');
    return null;
  }

  const runDiagnostic = useCallback(async () => {
    if (!emailSearch.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = getSupabase();

      // 1. Find user by email in user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .ilike('email', emailSearch.trim())
        .maybeSingle();

      if (!profile) {
        setError(`No user_profiles row found for "${emailSearch.trim()}". The user may not have completed their profile.`);
        setLoading(false);
        return;
      }

      const uid = profile.id;

      // 2. Parallel fetch everything
      const [walletRes, cycleRes, settingsRes, txRes, cbRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('wallet_cycles').select('*').eq('user_id', uid).eq('processed', false).order('cycle_start', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('wallet_settings').select('*').eq('id', 1).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('wallet_transactions').select('*').eq('user_id', uid).eq('type', 'cashback_credit').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const wallet = walletRes.data;
      const cycle = cycleRes.data;
      const settings = settingsRes.data;

      // 3. Realtime spend from orders in cycle window
      let ordersInCycle: WalletDiagnostic['ordersInCycle'] = [];
      let realtimeSpend = 0;

      if (cycle) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_number, total, wallet_amount, created_at, order_status, payment_status')
          .eq('user_id', uid)
          .in('payment_status', ['paid'])
          .in('order_status', ['processing', 'completed', 'delivered'])
          .gte('created_at', `${cycle.cycle_start}T00:00:00.000Z`)
          .lt('created_at',  `${cycle.cycle_end}T00:00:00.000Z`)
          .order('created_at', { ascending: false });

        ordersInCycle = (orders ?? []) as WalletDiagnostic['ordersInCycle'];
        realtimeSpend = parseFloat(
          ordersInCycle.reduce((sum, o) => sum + Math.max(0, o.total - (o.wallet_amount ?? 0)), 0).toFixed(2)
        );
      }

      const calculatedTier = settings ? getTier(realtimeSpend, settings as any) : 'bronze';
      const cashbackRate = settings ? getCashbackRate(calculatedTier, settings as any) : 0;
      const estimatedCashback = parseFloat((realtimeSpend * cashbackRate).toFixed(2));

      const base: Omit<WalletDiagnostic, 'checks'> = {
        userId: uid,
        email: profile.email ?? profile.name ?? uid,
        walletExists: !!wallet,
        walletBalance: parseFloat(wallet?.balance ?? 0),
        walletUpdatedAt: wallet?.updated_at ?? null,
        cycleExists: !!cycle,
        cycleStart: cycle?.cycle_start ?? null,
        cycleEnd: cycle?.cycle_end ?? null,
        cycleTier: cycle?.tier ?? 'bronze',
        cycleStoredSpend: parseFloat(cycle?.spend ?? 0),
        realtimeSpend,
        ordersInCycle,
        calculatedTier,
        cashbackRate,
        estimatedCashback,
        lastCashbackCredit: cbRes.data ? {
          amount: parseFloat(cbRes.data.amount),
          created_at: cbRes.data.created_at,
          description: cbRes.data.description ?? '',
        } : null,
        lastTransaction: txRes.data ? {
          type: txRes.data.type,
          amount: parseFloat(txRes.data.amount),
          balance_after: parseFloat(txRes.data.balance_after),
          created_at: txRes.data.created_at,
          description: txRes.data.description,
        } : null,
        settings: settings ? {
          bronze_min: settings.bronze_min,
          silver_min: settings.silver_min,
          gold_min: settings.gold_min,
          bronze_rate: settings.bronze_rate,
          silver_rate: settings.silver_rate,
          gold_rate: settings.gold_rate,
        } : null,
      };

      setResult({ ...base, checks: runHealthChecks(base) });
    } catch (e: any) {
      setError(e.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [emailSearch]);

  const tierColor = (tier: string) =>
    tier === 'gold' ? 'text-yellow-500' : tier === 'silver' ? 'text-slate-400' : 'text-amber-600';

  return (
    <div className="min-h-screen bg-gray-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Wallet Diagnostics</h1>
            <p className="text-xs text-gray-500">End-to-end loyalty health check for any customer</p>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-3">Enter the customer's email address to run a full diagnostic.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="customer@example.com"
                value={emailSearch}
                onChange={e => setEmailSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runDiagnostic()}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-10"
              />
            </div>
            <Button
              onClick={runDiagnostic}
              disabled={loading || !emailSearch.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Running…' : 'Run Diagnostic'}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </Card>

        {result && (
          <>
            {/* Identity row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Wallet,      label: 'Wallet Balance',   value: formatCurrency(result.walletBalance),          color: 'text-emerald-400' },
                { icon: Trophy,      label: 'Current Tier',     value: TIER_LABELS[result.calculatedTier] ?? result.calculatedTier, color: tierColor(result.calculatedTier) },
                { icon: TrendingUp,  label: 'Cycle Spend',      value: formatCurrency(result.realtimeSpend),           color: 'text-white' },
                { icon: Zap,         label: 'Est. Cashback',    value: formatCurrency(result.estimatedCashback),       color: 'text-amber-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <Card key={label} className="bg-gray-900 border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                  </div>
                  <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                </Card>
              ))}
            </div>

            {/* Health checks */}
            <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Wallet Health Check
              </h2>
              <div className="space-y-3">
                {result.checks.map(check => (
                  <div
                    key={check.label}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                      check.status === 'pass' ? 'bg-green-950/30 border border-green-900/40' :
                      check.status === 'fail' ? 'bg-red-950/30 border border-red-900/40' :
                      check.status === 'warn' ? 'bg-amber-950/30 border border-amber-900/40' :
                      'bg-gray-800/40 border border-gray-700/40'
                    }`}
                  >
                    <StatusIcon status={check.status} />
                    <div>
                      <p className="text-xs font-semibold text-white">{check.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cycle info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Loyalty Cycle</h2>
                {result.cycleExists ? (
                  <dl className="space-y-2.5">
                    {[
                      { label: 'User ID',        value: result.userId },
                      { label: 'Cycle Start',    value: result.cycleStart ? new Date(result.cycleStart).toLocaleDateString('en-GB') : '—' },
                      { label: 'Cycle End',      value: result.cycleEnd   ? new Date(result.cycleEnd).toLocaleDateString('en-GB')   : '—' },
                      { label: 'Stored Spend',   value: formatCurrency(result.cycleStoredSpend) + ' (cron)' },
                      { label: 'Realtime Spend', value: formatCurrency(result.realtimeSpend) + ' (live)' },
                      { label: 'Tier (live)',    value: TIER_LABELS[result.calculatedTier] },
                      { label: 'Cashback Rate',  value: `${(result.cashbackRate * 100).toFixed(0)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-[11px] text-gray-500">{label}</dt>
                        <dd className="text-[11px] text-white font-semibold truncate max-w-[55%] text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs text-red-400">No active cycle. Will be created on next order or cycle run.</p>
                )}
              </Card>

              <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Last Activity</h2>
                <dl className="space-y-2.5">
                  <div>
                    <dt className="text-[11px] text-gray-500 mb-1">Last Transaction</dt>
                    {result.lastTransaction ? (
                      <dd className="text-[11px] text-white">
                        <span className={result.lastTransaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {result.lastTransaction.amount >= 0 ? '+' : ''}{formatCurrency(result.lastTransaction.amount)}
                        </span>
                        {' — '}{result.lastTransaction.type.replace(/_/g, ' ')}
                        <br />
                        <span className="text-gray-500">{new Date(result.lastTransaction.created_at).toLocaleString('en-GB')}</span>
                      </dd>
                    ) : <dd className="text-[11px] text-gray-500">None yet</dd>}
                  </div>
                  <div>
                    <dt className="text-[11px] text-gray-500 mb-1">Last Cashback Credit</dt>
                    {result.lastCashbackCredit ? (
                      <dd className="text-[11px] text-white">
                        <span className="text-green-400">+{formatCurrency(result.lastCashbackCredit.amount)}</span>
                        <br />
                        <span className="text-gray-500">{new Date(result.lastCashbackCredit.created_at).toLocaleString('en-GB')}</span>
                      </dd>
                    ) : <dd className="text-[11px] text-gray-500">None yet — credited at cycle end</dd>}
                  </div>
                  {result.settings && (
                    <div>
                      <dt className="text-[11px] text-gray-500 mb-1">Tier Thresholds</dt>
                      <dd className="text-[11px] text-gray-300 space-y-0.5">
                        <div>Bronze: £{result.settings.bronze_min}+ → {(result.settings.bronze_rate * 100).toFixed(0)}% cashback</div>
                        <div>Silver: £{result.settings.silver_min}+ → {(result.settings.silver_rate * 100).toFixed(0)}% cashback</div>
                        <div>Gold:   £{result.settings.gold_min}+ → {(result.settings.gold_rate * 100).toFixed(0)}% cashback</div>
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>

            {/* Orders in cycle */}
            <Card className="bg-gray-900 border-gray-800 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                Orders Included in Current Cycle
                <span className="ml-auto font-normal text-gray-600">{result.ordersInCycle.length} order(s)</span>
              </h2>
              {result.ordersInCycle.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  {result.cycleExists
                    ? `No paid orders between ${result.cycleStart} and ${result.cycleEnd}`
                    : 'No active cycle — place a paid order to start earning'}
                </p>
              ) : (
                <div className="space-y-0">
                  <div className="grid grid-cols-5 gap-2 px-3 pb-2 text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
                    <span className="col-span-2">Order</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Wallet Used</span>
                    <span className="text-right">Eligible</span>
                  </div>
                  {result.ordersInCycle.map(o => {
                    const eligible = Math.max(0, o.total - (o.wallet_amount ?? 0));
                    return (
                      <div key={o.id} className="grid grid-cols-5 gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="col-span-2 min-w-0">
                          <p className="text-[11px] text-white font-semibold truncate">#{o.order_number}</p>
                          <p className="text-[10px] text-gray-600">{new Date(o.created_at).toLocaleDateString('en-GB')}</p>
                        </div>
                        <p className="text-[11px] text-white text-right">{formatCurrency(o.total)}</p>
                        <p className="text-[11px] text-amber-500 text-right">{o.wallet_amount > 0 ? formatCurrency(o.wallet_amount) : '—'}</p>
                        <p className="text-[11px] text-emerald-400 font-bold text-right">{formatCurrency(eligible)}</p>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-5 gap-2 px-3 pt-2 border-t border-gray-800">
                    <span className="col-span-4 text-[11px] text-gray-400 font-bold text-right">Total eligible spend</span>
                    <span className="text-[11px] text-emerald-400 font-extrabold text-right">{formatCurrency(result.realtimeSpend)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Timeline note */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-gray-500">
                  <span className="text-gray-300 font-semibold">Note:</span> Realtime spend is calculated live from orders. The <code className="bg-gray-800 px-1 rounded text-[10px]">wallet_cycles.spend</code> column is a denormalised cache updated by the nightly cron — a discrepancy between the two is expected and normal. Cashback is credited when the cycle expires.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
