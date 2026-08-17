'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import {
  fetchAdminWalletCustomers,
  fetchTransactions,
  fetchCashbackLogs,
  fetchProcessingStats,
  fetchProcessingLogs,
  formatCurrency,
  txTypeLabel,
  txTypeColor,
  TIER_LABELS,
  TIER_COLORS,
  type AdminWalletCustomer,
  type WalletTransaction,
  type WalletCashbackLog,
  type WalletProcessingStats,
  type WalletProcessingLog,
} from '@/lib/services/walletService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Users, Search, ArrowUpRight, ArrowDownLeft, Trophy, RefreshCw, Zap, Clock, CalendarClock, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2, TriangleAlert as AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

type AdminAction = 'credit' | 'debit' | 'adjust_cashback' | 'expire_cashback' | 'extend_expiry';

const ACTION_LABELS: Record<AdminAction, string> = {
  credit:           'Credit Wallet',
  debit:            'Debit Wallet',
  adjust_cashback:  'Adjust Cashback',
  expire_cashback:  'Expire Cashback',
  extend_expiry:    'Extend Expiry',
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${TIER_COLORS[tier] ?? 'text-gray-500'}`}>
      <Trophy className="h-2.5 w-2.5" />
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

function StatusIcon({ status }: { status: WalletProcessingLog['status'] }) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'error')   return <XCircle className="h-4 w-4 text-red-400" />;
  return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

// ── Stats Panel ───────────────────────────────────────────────────────────────

function ProcessingStatsPanel({ onRunNow, running }: {
  onRunNow: () => void;
  running: boolean;
}) {
  const [stats, setStats] = useState<WalletProcessingStats | null>(null);
  const [logs, setLogs] = useState<WalletProcessingLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const [s, l] = await Promise.all([fetchProcessingStats(), fetchProcessingLogs(10)]);
    setStats(s);
    setLogs(l);
    setLoadingStats(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Refresh after a run completes
  useEffect(() => {
    if (!running) loadStats();
  }, [running, loadStats]);

  const lastRun = stats?.lastRun;

  return (
    <Card className="rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-gray-500" />
          <h2 className="font-bold text-sm text-gray-900">Cycle Processing</h2>
        </div>
        <Button
          size="sm"
          onClick={onRunNow}
          disabled={running}
          className="gap-1.5 text-xs bg-[#0B5D3B] hover:bg-green-700 text-white h-8"
        >
          {running
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Running…</>
            : <><RefreshCw className="h-3 w-3" /> Run Now</>
          }
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Customers Due"
          value={loadingStats ? '…' : String(stats?.customersDueToday ?? 0)}
          sub="cycles expired today"
          icon={<Users className="h-3.5 w-3.5 text-amber-600" />}
          highlight={!loadingStats && (stats?.customersDueToday ?? 0) > 0}
        />
        <StatCard
          label="Cashback Pending"
          value={loadingStats ? '…' : `£${(stats?.cashbackPending ?? 0).toFixed(2)}`}
          sub="awaiting processing"
          icon={<Zap className="h-3.5 w-3.5 text-green-600" />}
        />
        <StatCard
          label="Last Run"
          value={loadingStats ? '…' : lastRun ? formatRelative(lastRun.started_at) : '—'}
          sub={lastRun ? (lastRun.triggered_by === 'cron' ? 'automatic' : 'manual') : 'never'}
          icon={lastRun ? <StatusIcon status={lastRun.status} /> : <Clock className="h-3.5 w-3.5 text-gray-400" />}
        />
        <StatCard
          label="Next Scheduled"
          value={loadingStats ? '…' : stats ? formatRelative(stats.nextRunUtc).replace(' ago', '') : '—'}
          sub="daily at 02:00 UTC"
          icon={<CalendarClock className="h-3.5 w-3.5 text-blue-500" />}
        />
      </div>

      {/* Last run summary */}
      {lastRun && (
        <div className={`text-xs rounded-xl px-3 py-2 flex items-center gap-3 mb-3 ${
          lastRun.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
        }`}>
          <StatusIcon status={lastRun.status} />
          <span className="font-semibold">
            {lastRun.status === 'running' ? 'Running now…' :
             lastRun.status === 'error'   ? `Error: ${lastRun.error_message ?? 'unknown'}` :
             `Processed ${lastRun.cycles_processed} cycles · +£${Number(lastRun.cashback_awarded).toFixed(2)} awarded · -£${Number(lastRun.cashback_expired).toFixed(2)} expired`}
          </span>
          <span className="ml-auto text-gray-500">{new Date(lastRun.started_at).toLocaleString('en-GB')}</span>
        </div>
      )}

      {/* Processing log history */}
      <button
        onClick={() => setShowLogs(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showLogs ? 'Hide' : 'Show'} processing history ({logs.length})
      </button>

      {showLogs && (
        <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No runs recorded yet.</p>
          )}
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
              <StatusIcon status={log.status} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-800 capitalize">{log.triggered_by.replace('_', ' ')}</span>
                {log.status === 'success' && (
                  <span className="text-gray-500 ml-2">
                    {log.cycles_processed} processed · +£{Number(log.cashback_awarded).toFixed(2)}
                  </span>
                )}
                {log.status === 'error' && (
                  <span className="text-red-500 ml-2 truncate">{log.error_message}</span>
                )}
              </div>
              <span className="text-gray-400 flex-shrink-0">{formatRelative(log.started_at)}</span>
              {log.finished_at && (
                <span className="text-gray-300 flex-shrink-0">
                  {Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value, sub, icon, highlight }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-transparent'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-extrabold text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminWalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<AdminWalletCustomer[]>([]);
  const [filtered, setFiltered] = useState<AdminWalletCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selected, setSelected] = useState<AdminWalletCustomer | null>(null);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [cashbackLogs, setCashbackLogs] = useState<WalletCashbackLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [action, setAction] = useState<AdminAction>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [cashbackLogId, setCashbackLogId] = useState('');
  const [extendDays, setExtendDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [runningCycles, setRunningCycles] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.app_metadata?.is_admin)) {
      router.replace('/admin/login');
    }
  }, [authLoading, user, router]);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const data = await fetchAdminWalletCustomers();
      setCustomers(data);
      setFiltered(data);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.app_metadata?.is_admin) loadCustomers();
  }, [authLoading, user, loadCustomers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? customers.filter(c => c.email.toLowerCase().includes(q)) : customers);
  }, [search, customers]);

  const selectCustomer = async (c: AdminWalletCustomer) => {
    setSelected(c);
    setLoadingDetail(true);
    try {
      const [txResult, logs] = await Promise.all([
        fetchTransactions(c.user_id, 0, 10),
        fetchCashbackLogs(c.user_id),
      ]);
      setTransactions(txResult.transactions);
      setCashbackLogs(logs);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAction = async () => {
    if (!selected || !reason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }

    const needsAmount = ['credit', 'debit', 'adjust_cashback'].includes(action);
    if (needsAmount && (!amount || isNaN(parseFloat(amount)))) {
      toast({ title: 'Valid amount required', variant: 'destructive' });
      return;
    }

    const needsLogId = ['expire_cashback', 'extend_expiry'].includes(action);
    if (needsLogId && !cashbackLogId.trim()) {
      toast({ title: 'Cashback log ID required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-wallet-action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            target_user_id: selected.user_id,
            action,
            amount:          needsAmount ? parseFloat(amount) : undefined,
            reason,
            cashback_log_id: cashbackLogId || undefined,
            extend_days:     extendDays ? parseInt(extendDays) : undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Action failed');

      toast({ title: 'Action applied successfully' });
      setAmount('');
      setReason('');
      setCashbackLogId('');
      setExtendDays('');

      await loadCustomers();
      if (selected) {
        const updated = (await fetchAdminWalletCustomers()).find(c => c.user_id === selected.user_id);
        if (updated) {
          setSelected(updated);
          const [txResult, logs] = await Promise.all([
            fetchTransactions(updated.user_id, 0, 10),
            fetchCashbackLogs(updated.user_id),
          ]);
          setTransactions(txResult.transactions);
          setCashbackLogs(logs);
        }
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const runCyclesNow = async () => {
    setRunningCycles(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-wallet-cycles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ triggered_by: 'admin_manual' }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Processing failed');

      const s = data.summary ?? {};
      toast({
        title: 'Cycle processing complete',
        description: `${s.cyclesProcessed ?? 0} cycles processed · £${(s.cashbackAwarded ?? 0).toFixed(2)} awarded`,
      });
      loadCustomers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setRunningCycles(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Wallet Management</h1>
            <p className="text-xs text-gray-500">Loyalty cashback & wallet admin</p>
          </div>
        </div>

        {/* Processing stats + schedule panel */}
        <ProcessingStatsPanel onRunNow={runCyclesNow} running={runningCycles} />

        <div className="grid lg:grid-cols-5 gap-5">

          {/* ── Customer List ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-500" />
                <h2 className="font-bold text-sm text-gray-900">Customers</h2>
                <span className="ml-auto text-xs text-gray-400">{customers.length} total</span>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search by email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {loadingCustomers ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No customers found</p>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {filtered.map(c => (
                    <button
                      key={c.user_id}
                      onClick={() => selectCustomer(c)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                        selected?.user_id === c.user_id
                          ? 'border-green-400 bg-green-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-gray-800">{c.email}</span>
                        <span className="font-bold text-green-700 flex-shrink-0 text-xs">{formatCurrency(c.balance)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <TierBadge tier={c.tier} />
                        <span className="text-xs text-gray-400">spend {formatCurrency(c.current_spend)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Customer Detail + Actions ── */}
          <div className="lg:col-span-3 space-y-4">
            {!selected ? (
              <Card className="rounded-2xl p-12 text-center">
                <Wallet className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Select a customer to view their wallet</p>
              </Card>
            ) : (
              <>
                {/* Summary */}
                <Card className="rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 truncate">{selected.email}</p>
                      <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(selected.balance)}</p>
                    </div>
                    <TierBadge tier={selected.tier} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      { label: 'Current Tier',  value: TIER_LABELS[selected.tier] ?? selected.tier },
                      { label: 'Current Spend', value: formatCurrency(selected.current_spend) },
                      { label: 'Cycle Start',   value: selected.cycle_start ? new Date(selected.cycle_start).toLocaleDateString('en-GB') : '—' },
                      { label: 'Cycle End',     value: selected.cycle_end   ? new Date(selected.cycle_end).toLocaleDateString('en-GB')   : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-gray-500 mb-0.5">{label}</p>
                        <p className="font-bold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.projected_cashback > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      <Zap className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-xs text-green-700">
                        Projected cashback at cycle end: <span className="font-bold">{formatCurrency(selected.projected_cashback)}</span>
                      </p>
                    </div>
                  )}
                </Card>

                {/* Admin Actions */}
                <Card className="rounded-2xl p-5">
                  <h3 className="font-bold text-sm text-gray-900 mb-4">Admin Actions</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {(Object.keys(ACTION_LABELS) as AdminAction[]).map(a => (
                      <button
                        key={a}
                        onClick={() => setAction(a)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                          action === a
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {ACTION_LABELS[a]}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {['credit', 'debit', 'adjust_cashback'].includes(action) && (
                      <div>
                        <Label className="text-xs mb-1 block">
                          Amount {action === 'adjust_cashback' ? '(positive or negative)' : ''}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">£</span>
                          <Input
                            type="number" step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="pl-7 h-9 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {['expire_cashback', 'extend_expiry'].includes(action) && (
                      <div>
                        <Label className="text-xs mb-1 block">Cashback Log</Label>
                        <select
                          value={cashbackLogId}
                          onChange={e => setCashbackLogId(e.target.value)}
                          className="w-full h-9 border border-gray-200 rounded-lg px-3 text-xs bg-white"
                        >
                          <option value="">Select a cashback log…</option>
                          {cashbackLogs.filter(l => !l.expired_at).map(l => (
                            <option key={l.id} value={l.id}>
                              {formatCurrency(l.cashback_amount)} — {l.tier} — expires {new Date(l.expiry_date).toLocaleDateString('en-GB')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {action === 'extend_expiry' && (
                      <div>
                        <Label className="text-xs mb-1 block">Extend by (days)</Label>
                        <Input
                          type="number" min="1"
                          value={extendDays}
                          onChange={e => setExtendDays(e.target.value)}
                          placeholder="30"
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs mb-1 block">Reason <span className="text-red-500">*</span></Label>
                      <Input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Required — shown in audit trail"
                        className="h-9 text-sm"
                      />
                    </div>

                    <Button
                      onClick={handleAction}
                      disabled={submitting}
                      className="w-full h-9 bg-[#0B5D3B] hover:bg-green-700 text-white text-sm font-bold"
                    >
                      {submitting ? 'Processing…' : `Apply: ${ACTION_LABELS[action]}`}
                    </Button>
                  </div>
                </Card>

                {/* Recent Transactions */}
                <Card className="rounded-2xl p-5">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">Recent Transactions</h3>
                  {loadingDetail ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                  ) : transactions.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No transactions yet</p>
                  ) : (
                    <div>
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-50'}`}>
                            {tx.amount > 0
                              ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                              : <ArrowDownLeft className="h-3.5 w-3.5 text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{txTypeLabel(tx.type)}</p>
                            <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-bold ${txTypeColor(tx.type)}`}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.created_at).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
