'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Database, Server, ArrowDown, Clock, Package, Link2, Unlink,
  Copy, AlertCircle, ChevronDown, ChevronUp, Zap, ShoppingCart,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Diagnostics {
  apiConnected: boolean;
  apiError: string | null;
  centralHubTotal: number;
  localTotal: number;
  localDraft: number;
  localApproved: number;
  localRejected: number;
  localLinked: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncImported: number;
  lastSyncUpdated: number;
  lastSyncFailed: number;
  lastSyncLinked: number;
  lastSyncUnmatched: number;
  lastSyncNameUpdates: number;
  lastSyncErrors: string[];
}

interface SyncResult {
  logId: string;
  totalFetched: number;
  importedNew: number;
  updatedExisting: number;
  nameUpdates: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

interface BackfillResult {
  logId: string;
  hubTotal: number;
  localProcessed: number;
  linked: number;
  unmatched: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

interface SyncDiagnosticsResult {
  summary: {
    hubTotal: number;
    localTotal: number;
    linked: number;
    outOfSync: number;
    unmatched: number;
    duplicates: number;
    notLinked: number;
  };
  linked: Array<{
    localId: string;
    localName: string;
    hubId: string;
    hubName: string;
    outOfSyncFields: string[];
    lastSyncAt: string | null;
  }>;
  unmatched: Array<{ hubId: string; hubName: string }>;
  duplicates: Array<{ hubId: string; count: number }>;
  notLinked: Array<{ localId: string; localName: string; approvalStatus: string }>;
}

type ActiveTab = 'overview' | 'diagnostics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getEdgeFn = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-sync`;

async function callEdgeFn(body: object): Promise<{ data: unknown; error: string | null }> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  try {
    const res = await fetch(getEdgeFn(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json?.error ?? `HTTP ${res.status}` };
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{String(value)}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ResultBanner({ result, onDismiss }: { result: SyncResult | BackfillResult; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const isSync = 'importedNew' in result;

  const stats = isSync
    ? [
        { label: 'Fetched', value: (result as SyncResult).totalFetched },
        { label: 'New (draft)', value: (result as SyncResult).importedNew },
        { label: 'Updated', value: (result as SyncResult).updatedExisting },
        { label: 'Names fixed', value: (result as SyncResult).nameUpdates ?? 0 },
        { label: 'Failed', value: result.failed },
      ]
    : [
        { label: 'Hub total', value: (result as BackfillResult).hubTotal },
        { label: 'Processed', value: (result as BackfillResult).localProcessed },
        { label: 'Linked', value: (result as BackfillResult).linked },
        { label: 'Unmatched', value: (result as BackfillResult).unmatched },
        { label: 'Failed', value: result.failed },
      ];

  return (
    <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-green-800">
          {isSync ? 'Sync complete' : 'Backfill complete'}
        </span>
        <span className="text-xs text-green-600 ml-auto">{(result.durationMs / 1000).toFixed(1)}s</span>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 ml-1">
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl px-2 py-2 text-center">
            <p className={`text-base font-bold ${s.label === 'Failed' && s.value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
        >
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
        </button>
      )}
      {open && (
        <ul className="mt-1 text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
          {result.errors.map((e, i) => <li key={i} className="truncate">• {e}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─── Sync Diagnostics Tab ─────────────────────────────────────────────────────

function SyncDiagnosticsTab({ apiOk }: { apiOk: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncDiagnosticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'outOfSync' | 'unmatched' | 'duplicates' | 'notLinked'>('outOfSync');

  const run = async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await callEdgeFn({ action: 'sync_diagnostics' });
    if (e) setError(e);
    else setResult(data as SyncDiagnosticsResult);
    setLoading(false);
  };

  const outOfSync = result?.linked.filter(l => l.outOfSyncFields.length > 0) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600">
            Compare local products against CentralHub to find out-of-sync fields, unlinked records, and duplicates.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading || !apiOk}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
          {loading ? 'Scanning…' : 'Run Diagnostics'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!result && !loading && (
        <div className="py-16 flex flex-col items-center text-gray-400">
          <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Run diagnostics to see a full sync health report</p>
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Linked', value: result.summary.linked, color: 'bg-green-50 text-green-700', icon: Link2 },
              { label: 'Out of Sync', value: result.summary.outOfSync, color: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
              { label: 'Unmatched in Hub', value: result.summary.unmatched, color: 'bg-blue-50 text-blue-700', icon: Unlink },
              { label: 'Duplicates', value: result.summary.duplicates, color: 'bg-red-50 text-red-700', icon: Copy },
              { label: 'Not Linked Locally', value: result.summary.notLinked, color: 'bg-gray-50 text-gray-700', icon: Unlink },
              { label: 'Hub Total', value: result.summary.hubTotal, color: 'bg-gray-50 text-gray-600', icon: Server },
              { label: 'Local Total', value: result.summary.localTotal, color: 'bg-gray-50 text-gray-600', icon: Database },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl px-3 py-3 flex items-center gap-3 ${s.color} border-current/10`}>
                <s.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] mt-0.5 opacity-80">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl w-fit">
            {([
              ['outOfSync', `Out of Sync (${outOfSync.length})`],
              ['unmatched', `Unmatched (${result.unmatched.length})`],
              ['duplicates', `Duplicates (${result.duplicates.length})`],
              ['notLinked', `Not Linked (${result.notLinked.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeSection === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Out of sync table */}
          {activeSection === 'outOfSync' && (
            outOfSync.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">All linked products are in sync with CentralHub</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Local Name</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Hub Name</th>
                      <th className="px-3 py-2 text-left">Out-of-Sync Fields</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outOfSync.slice(0, 100).map(row => (
                      <>
                        <tr
                          key={row.localId}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === row.localId ? null : row.localId)}
                        >
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">{row.localName}</td>
                          <td className="px-3 py-2 text-gray-600 hidden sm:table-cell max-w-[160px] truncate">{row.hubName}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {row.outOfSyncFields.length} field{row.outOfSyncFields.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">
                            {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                        {expandedRow === row.localId && (
                          <tr key={`${row.localId}-detail`} className="bg-amber-50">
                            <td colSpan={4} className="px-3 py-2">
                              <ul className="space-y-0.5">
                                {row.outOfSyncFields.map((f, i) => (
                                  <li key={i} className="text-xs text-amber-800 font-mono">• {f}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Unmatched table */}
          {activeSection === 'unmatched' && (
            result.unmatched.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">All CentralHub products have a local match</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Hub Product Name</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Hub ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.unmatched.slice(0, 100).map(row => (
                      <tr key={row.hubId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{row.hubName}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono hidden sm:table-cell">{row.hubId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.unmatched.length > 100 && (
                  <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                    Showing 100 of {result.unmatched.length}. Run a Sync to import the rest.
                  </p>
                )}
              </div>
            )
          )}

          {/* Duplicates */}
          {activeSection === 'duplicates' && (
            result.duplicates.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No duplicate centralhub_product_id values found</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Hub ID</th>
                      <th className="px-3 py-2 text-left">Local Copies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.duplicates.map(row => (
                      <tr key={row.hubId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-700">{row.hubId}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                            {row.count}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Not linked */}
          {activeSection === 'notLinked' && (
            result.notLinked.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">All local products are linked to CentralHub</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Local Product</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.notLinked.slice(0, 100).map(row => (
                      <tr key={row.localId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{row.localName}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.approvalStatus === 'approved' ? 'bg-green-100 text-green-700'
                            : row.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                            {row.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.notLinked.length > 100 && (
                  <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                    Showing 100 of {result.notLinked.length}. Run Backfill to link existing products.
                  </p>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CentralHubSyncPage() {
  const [tab, setTab] = useState<ActiveTab>('overview');
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const [diagError, setDiagError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [forcing, setForcing] = useState(false);
  const [forceResult, setForceResult] = useState<SyncResult | null>(null);
  const [forceError, setForceError] = useState<string | null>(null);

  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const [syncingOrders, setSyncingOrders] = useState(false);
  const [orderSyncResult, setOrderSyncResult] = useState<any>(null);
  const [orderSyncError, setOrderSyncError] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagError(null);
    const { data, error } = await callEdgeFn({ action: 'diagnostics' });
    if (error) setDiagError(error);
    else setDiag(data as Diagnostics);
    setDiagLoading(false);
  }, []);

  useEffect(() => { loadDiagnostics(); }, [loadDiagnostics]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    const { data, error } = await callEdgeFn({ action: 'sync', triggered_by: 'manual' });
    if (error) setSyncError(error);
    else setSyncResult(data as SyncResult);
    setSyncing(false);
    loadDiagnostics();
  };

  const handleForceResync = async () => {
    setForcing(true);
    setForceResult(null);
    setForceError(null);
    const { data, error } = await callEdgeFn({ action: 'force_resync', triggered_by: 'manual' });
    if (error) setForceError(error);
    else setForceResult(data as SyncResult);
    setForcing(false);
    loadDiagnostics();
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);
    const { data, error } = await callEdgeFn({ action: 'backfill' });
    if (error) setBackfillError(error);
    else setBackfillResult(data as BackfillResult);
    setBackfilling(false);
    loadDiagnostics();
  };

  const handleSyncOrders = async () => {
    setSyncingOrders(true);
    setOrderSyncResult(null);
    setOrderSyncError(null);
    const { data, error } = await callEdgeFn({ action: 'sync_orders' });
    if (error) setOrderSyncError(error);
    else setOrderSyncResult(data);
    setSyncingOrders(false);
  };

  const apiOk = diag?.apiConnected === true;
  const notConfigured = diag?.apiError?.includes('not configured');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">CentralHub Sync</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Import and manage products from CentralHub using <code className="bg-gray-100 px-1 rounded text-[10px]">centralhub_product_id</code> as the stable sync key
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadDiagnostics}
            disabled={diagLoading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            title="Refresh diagnostics"
          >
            <RefreshCw className={`w-4 h-4 ${diagLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Backfill */}
          <button
            onClick={handleBackfill}
            disabled={backfilling || !apiOk}
            title="Link existing products to CentralHub records by name/ID matching"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {backfilling ? 'Backfilling…' : 'Backfill Links'}
          </button>

          {/* Sync Orders */}
          <button
            onClick={handleSyncOrders}
            disabled={syncingOrders || !apiOk}
            title="Push all existing local orders to CentralHub"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncingOrders ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {syncingOrders ? 'Syncing Orders…' : 'Sync Old Orders'}
          </button>
        </div>
      </div>

      {/* Result banners */}
      {orderSyncResult && (
        <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-blue-800">Order Sync Complete</span>
            <button onClick={() => setOrderSyncResult(null)} className="text-gray-400 hover:text-gray-600 ml-auto">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-gray-900">{orderSyncResult.total}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Processed</p>
            </div>
            <div className="bg-white rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-green-600">{orderSyncResult.success}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Succeeded</p>
            </div>
            <div className="bg-white rounded-xl px-2 py-2 text-center">
              <p className={`text-base font-bold ${orderSyncResult.failed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{orderSyncResult.failed}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Failed</p>
            </div>
          </div>
        </div>
      )}
      {syncResult && !syncError && (
        <ResultBanner result={syncResult} onDismiss={() => setSyncResult(null)} />
      )}
      {forceResult && !forceError && (
        <ResultBanner result={forceResult} onDismiss={() => setForceResult(null)} />
      )}
      {backfillResult && !backfillError && (
        <ResultBanner result={backfillResult} onDismiss={() => setBackfillResult(null)} />
      )}

      {[syncError, forceError, backfillError].filter(Boolean).map((e, i) => (
        <div key={i} className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{e}</p>
        </div>
      ))}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {([['overview', 'Overview'], ['diagnostics', 'Sync Diagnostics']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          {/* API connection */}
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">API Connection</h2>
            {diagLoading ? (
              <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            ) : diagError ? (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{diagError}</span>
              </div>
            ) : notConfigured ? (
              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">Environment variables not configured</span>
                </div>
                <p className="text-xs text-amber-700 mt-1.5">
                  Add <code className="bg-amber-100 px-1 rounded font-mono">CENTRALHUB_API_URL</code> and{' '}
                  <code className="bg-amber-100 px-1 rounded font-mono">CENTRALHUB_API_KEY</code> to your
                  Supabase Edge Function secrets to enable syncing.
                </p>
              </div>
            ) : (
              <div className={`px-4 py-3 border rounded-2xl flex items-center gap-3 ${apiOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apiOk ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${apiOk ? 'text-green-800' : 'text-red-800'}`}>
                    {apiOk ? 'Connected to CentralHub' : 'Connection failed'}
                  </p>
                  {!apiOk && diag?.apiError && (
                    <p className="text-xs text-red-600 mt-0.5 truncate">{diag.apiError}</p>
                  )}
                </div>
                {apiOk && (
                  <span className="text-xs text-green-600 font-medium flex-shrink-0">
                    {diag?.centralHubTotal.toLocaleString()} products in CentralHub
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Local Database</h2>
          {diagLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[0,1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <StatCard label="Total Products" value={diag?.localTotal ?? 0} icon={Package} color="bg-gray-100 text-gray-600" />
              <StatCard label="Linked to Hub" value={diag?.localLinked ?? 0} sub="Have centralhub_product_id" icon={Link2} color="bg-blue-50 text-blue-600" />
              <StatCard label="Draft" value={diag?.localDraft ?? 0} sub="Awaiting review" icon={Clock} color="bg-amber-50 text-amber-600" />
              <StatCard label="Approved" value={diag?.localApproved ?? 0} sub="Live on storefront" icon={CheckCircle2} color="bg-green-50 text-green-600" />
              <StatCard label="Rejected" value={diag?.localRejected ?? 0} sub="Not published" icon={XCircle} color="bg-red-50 text-red-600" />
            </div>
          )}

          {/* Architecture */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sync Architecture</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
              {[
                { icon: Server, label: 'CentralHub', sub: `${diag?.centralHubTotal ?? '—'} products`, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { arrow: true },
                { icon: Database, label: 'Edge Function', sub: 'centralhub-sync', color: 'bg-gray-50 border-gray-200 text-gray-700' },
                { arrow: true },
                { icon: Database, label: 'Local DB', sub: 'matched by UUID', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { arrow: true },
                { icon: CheckCircle2, label: 'Admin Approval', sub: 'enrichment + review', color: 'bg-green-50 border-green-200 text-green-700' },
                { arrow: true },
                { icon: Package, label: 'Storefront', sub: 'approved only', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              ].map((item, i) => {
                if ('arrow' in item) {
                  return (
                    <div key={i} className="flex items-center justify-center sm:mx-1">
                      <ArrowDown className="w-4 h-4 text-gray-300 sm:rotate-[-90deg]" />
                    </div>
                  );
                }
                const Icon = item.icon!;
                return (
                  <div key={i} className={`flex flex-col items-center text-center border rounded-xl px-3 py-2 min-w-[100px] ${item.color}`}>
                    <Icon className="w-5 h-5 mb-1" />
                    <p className="text-xs font-semibold leading-tight">{item.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{item.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-800 mb-1">Sync identifier</p>
                <ul className="space-y-0.5 text-gray-500">
                  <li>• Products matched by <code className="bg-gray-100 px-0.5 rounded">centralhub_product_id</code> (UUID)</li>
                  <li>• Never matched by name, slug, or SKU</li>
                  <li>• Stable across renames on CentralHub</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">Fields updated on sync</p>
                <ul className="space-y-0.5 text-gray-500">
                  <li>• name, brand, weight, stock, unit</li>
                  <li>• supplier_price → recalculates selling price</li>
                  <li>• product_type, last_sync_at</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">Protected (never overwritten)</p>
                <ul className="space-y-0.5 text-gray-500">
                  <li>• category, images, descriptions</li>
                  <li>• SEO fields, price overrides</li>
                  <li>• approval_status, visibility_status</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Last sync log */}
          {diag && (diag.lastSyncAt || diag.lastSyncStatus) && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Sync</h2>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    diag.lastSyncStatus === 'success' ? 'bg-green-100 text-green-700'
                    : diag.lastSyncStatus === 'error' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                  }`}>
                    {diag.lastSyncStatus === 'success' ? <CheckCircle2 className="w-3 h-3" />
                      : diag.lastSyncStatus === 'error' ? <XCircle className="w-3 h-3" />
                      : <Loader2 className="w-3 h-3 animate-spin" />}
                    {diag.lastSyncStatus ?? 'unknown'}
                  </span>
                  {diag.lastSyncAt && (
                    <span className="text-xs text-gray-500">{new Date(diag.lastSyncAt).toLocaleString()}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto flex-wrap gap-x-3 flex">
                    <span>{diag.lastSyncImported} new</span>
                    <span>{diag.lastSyncUpdated} updated</span>
                    <span>{diag.lastSyncNameUpdates} names fixed</span>
                    <span className={diag.lastSyncFailed > 0 ? 'text-red-500 font-semibold' : ''}>{diag.lastSyncFailed} failed</span>
                  </span>
                </div>
                {diag.lastSyncErrors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-amber-600 cursor-pointer">{diag.lastSyncErrors.length} errors from last sync</summary>
                    <ul className="mt-1 text-xs text-amber-700 space-y-0.5 max-h-28 overflow-y-auto">
                      {diag.lastSyncErrors.map((e, i) => <li key={i} className="truncate">• {e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Diagnostics tab ──────────────────────────────────────────────────── */}
      {tab === 'diagnostics' && <SyncDiagnosticsTab apiOk={apiOk} />}
    </div>
  );
}
