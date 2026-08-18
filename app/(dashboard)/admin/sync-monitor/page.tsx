'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { RefreshCw, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Loader as Loader2, Package, Clock, TrendingUp, Zap, Database, Activity, ArrowUpToLine, Stethoscope, ChevronRight } from 'lucide-react';

const CENTRALHUB_PUSH_URL = 'https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/centralhub-product-sync';

interface ProductStats {
  total: number;
  visible: number;
  hidden: number;
  approved: number;
  draft: number;
  rejected: number;
  zeroPrice: number;
  inactiveButVisible: number;
  draftButVisible: number;
  lastProductUpdate: string | null;
}

interface RecentUpdate {
  id: string;
  name: string;
  price: number;
  stock: number;
  brand: string | null;
  updated_at: string;
  visibility_status: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);
}

export default function SyncMonitorPage() {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [recent, setRecent] = useState<RecentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();

    try {
      const [statsRes, recentRes] = await Promise.all([
        supabase.rpc('get_sync_monitor_stats'),
        supabase
          .from('products')
          .select('id, name, price, stock, brand, updated_at, visibility_status')
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(50),
      ]);

      if (statsRes.error) throw new Error(statsRes.error.message);
      if (recentRes.error) throw new Error(recentRes.error.message);

      const s = statsRes.data;
      setStats({
        total: s.total ?? 0,
        visible: s.visible ?? 0,
        hidden: s.hidden ?? 0,
        approved: s.approved ?? 0,
        draft: s.draft ?? 0,
        rejected: s.rejected ?? 0,
        zeroPrice: s.zero_price ?? 0,
        inactiveButVisible: s.inactive_but_visible ?? 0,
        draftButVisible: s.draft_but_visible ?? 0,
        lastProductUpdate: s.last_product_update ?? null,
      });
      setRecent((recentRes.data ?? []) as RecentUpdate[]);
    } catch (err) {
      console.error('[sync-monitor] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setStats(null);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(CENTRALHUB_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
        },
        body: JSON.stringify({ action: 'poll' }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setSyncResult({ ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` });
      } else {
        const json = await res.json().catch(() => ({}));
        setSyncResult({ ok: true, message: json.message ?? 'Sync requested successfully' });
      }
    } catch (err) {
      console.error('[sync-monitor] sync-now error:', err);
      setSyncResult({ ok: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(CENTRALHUB_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
        },
        body: JSON.stringify({ action: 'diagnose' }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setTestResult({ ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` });
      } else {
        const json = await res.json().catch(() => ({}));
        setTestResult({ ok: true, message: json.message ?? JSON.stringify(json).slice(0, 300) });
      }
    } catch (err) {
      console.error('[sync-monitor] test-connection error:', err);
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setTesting(false);
    }
  };

  const issues: { label: string; count: number; severity: 'error' | 'warn' }[] = [
    { label: 'Inactive but visible', count: stats?.inactiveButVisible ?? 0, severity: 'error' as const },
    { label: 'Draft but visible', count: stats?.draftButVisible ?? 0, severity: 'warn' as const },
    { label: 'Zero price', count: stats?.zeroPrice ?? 0, severity: 'warn' as const },
  ].filter(i => i.count > 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sync Monitor</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            CentralHub pushes products directly into this database every 5 minutes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-40"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-40"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {syncing ? 'Requesting...' : 'Request Sync Now'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action results */}
      {syncResult && (
        <div className={`mb-4 px-4 py-3 border rounded-2xl flex items-center gap-2 ${
          syncResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {syncResult.ok
            ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <p className={`text-sm flex-1 ${syncResult.ok ? 'text-green-800' : 'text-red-700'}`}>
            {syncResult.message}
          </p>
          <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {testResult && (
        <div className={`mb-4 px-4 py-3 border rounded-2xl flex items-start gap-2 ${
          testResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {testResult.ok
            ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${testResult.ok ? 'text-green-800' : 'text-red-700'}`}>
              {testResult.ok ? 'Connection Successful' : 'Connection Failed'}
            </p>
            <p className={`text-xs mt-1 break-all ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.message}
            </p>
          </div>
          <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Sync status banner */}
      <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
        <ArrowUpToLine className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800">Push-Based Sync</p>
          <p className="text-xs text-blue-600 mt-0.5">
            CentralHub pushes product data here every 5 minutes. Last product update: {timeAgo(stats?.lastProductUpdate ?? null)}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Products" value={stats.total} icon={Package} color="bg-gray-100 text-gray-600" />
            <StatCard label="Visible" value={stats.visible} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Hidden" value={stats.hidden} icon={XCircle} color="bg-gray-50 text-gray-500" />
            <StatCard label="Last Update" value={timeAgo(stats.lastProductUpdate)} icon={Clock} color="bg-blue-50 text-blue-600" />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Draft" value={stats.draft} icon={Clock} color="bg-amber-50 text-amber-600" />
            <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="bg-red-50 text-red-600" />
            <StatCard label="Zero Price" value={stats.zeroPrice} icon={AlertTriangle} color="bg-red-50 text-red-600" />
          </div>

          {/* Data quality issues */}
          {issues.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Quality Issues</h2>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    issue.severity === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium flex-1">{issue.label}: {issue.count} product(s)</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent updates table */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Product Updates</h2>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">No products found</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Product Name</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-left hidden sm:table-cell">Brand</th>
                <th className="px-3 py-2 text-left">Visibility</th>
                <th className="px-3 py-2 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[200px] truncate">{row.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{fmtPrice(row.price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{row.stock ?? 0}</td>
                  <td className="px-3 py-2 text-gray-600 hidden sm:table-cell max-w-[120px] truncate">{row.brand ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.visibility_status === 'visible'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.visibility_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400">{timeAgo(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{String(value)}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
    </div>
  );
}
