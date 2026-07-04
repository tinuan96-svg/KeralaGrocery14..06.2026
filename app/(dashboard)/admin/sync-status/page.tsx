'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import {
  Wifi, WifiOff, RefreshCw, Zap,
  CircleCheck as CheckCircle2, Circle as XCircle,
  Clock, Package, CircleAlert as AlertCircle,
  Loader as Loader2, Activity, ArrowDown, Tag,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SyncEvent {
  id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  processed_at: string;
  centralhub_product_id: string | null;
  payload: Record<string, unknown> | null;
}

interface StatusData {
  syncedToday: number;
  failedToday: number;
  recentEvents: SyncEvent[];
}

interface BrandDiagnostics {
  hubWithBrand: number;
  hubBrandSample: string[];
  localWithBrand: number;
  localMissingBrand: number;
  localDistinctBrands: number;
}

type ConnState = 'connecting' | 'connected' | 'disconnected' | 'error';

const CONN_LABEL: Record<ConnState, string> = {
  connecting:   'Connecting…',
  connected:    'Connected',
  disconnected: 'Disconnected',
  error:        'Connection Error',
};

const CONN_COLOR: Record<ConnState, string> = {
  connecting:   'text-amber-600 bg-amber-50 border-amber-200',
  connected:    'text-green-700 bg-green-50 border-green-200',
  disconnected: 'text-gray-500 bg-gray-50 border-gray-200',
  error:        'text-red-600 bg-red-50 border-red-200',
};

const EVENT_COLOR: Record<string, string> = {
  INSERT:      'bg-green-100 text-green-700',
  UPDATE:      'bg-blue-100 text-blue-700',
  DELETE:      'bg-red-100 text-red-600',
  FULL_RESYNC: 'bg-amber-100 text-amber-700',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtAgo(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

async function callSync(token: string, body: Record<string, unknown>) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function SyncStatusPage() {
  const [connState, setConnState]           = useState<ConnState>('connecting');
  const [lastEventAt, setLastEventAt]       = useState<string | null>(null);
  const [liveEvents, setLiveEvents]         = useState<SyncEvent[]>([]);
  const [statusData, setStatusData]         = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading]   = useState(true);
  const [forceLoading, setForceLoading]     = useState(false);
  const [pollLoading, setPollLoading]       = useState(false);
  const [brandLoading, setBrandLoading]     = useState(false);
  const [diagLoading, setDiagLoading]       = useState(false);
  const [forceResult, setForceResult]       = useState<string | null>(null);
  const [brandDiag, setBrandDiag]           = useState<BrandDiagnostics | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const getToken = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }, []);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-realtime`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'status' }),
      });
      if (res.ok) {
        const data = await res.json() as StatusData;
        setStatusData(data);
        if (data.recentEvents?.length) setLastEventAt(data.recentEvents[0].processed_at);
      }
    } finally {
      setStatusLoading(false);
    }
  }, [getToken]);

  const loadBrandDiag = useCallback(async () => {
    setDiagLoading(true);
    try {
      const token = await getToken();
      const json = await callSync(token, { action: 'diagnostics' });
      if (json.brandDiagnostics) setBrandDiag(json.brandDiagnostics as BrandDiagnostics);
    } finally {
      setDiagLoading(false);
    }
  }, [getToken]);

  const handleForcePoll = useCallback(async () => {
    setPollLoading(true);
    setForceResult(null);
    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-realtime`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'poll' }),
      });
      const json = await res.json();
      setForceResult(`Poll complete: ${json.updated ?? 0} updated, ${json.inserted ?? 0} inserted, ${json.failed ?? 0} failed`);
      loadStatus();
    } catch (e) {
      setForceResult(`Poll error: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setPollLoading(false);
    }
  }, [getToken, loadStatus]);

  const handleForceResync = useCallback(async () => {
    setForceLoading(true);
    setForceResult(null);
    try {
      const token = await getToken();
      const json = await callSync(token, { action: 'sync' });
      setForceResult(
        `Full resync complete: ${json.updatedExisting ?? 0} updated, ${json.importedNew ?? 0} imported, ${json.failed ?? 0} failed`
      );
      loadStatus();
      loadBrandDiag();
    } catch (e) {
      setForceResult(`Resync error: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setForceLoading(false);
    }
  }, [getToken, loadStatus, loadBrandDiag]);

  const handleBrandBackfill = useCallback(async () => {
    setBrandLoading(true);
    setForceResult(null);
    try {
      const token = await getToken();
      const json = await callSync(token, { action: 'brand_backfill' });
      setForceResult(
        `Brand backfill complete: ${json.updated ?? 0} updated, ${json.skipped ?? 0} already correct, ${json.failed ?? 0} failed` +
        (json.diagnostics ? ` · ${json.diagnostics.localWithBrand} products now have a brand` : '')
      );
      if (json.diagnostics) {
        setBrandDiag({
          hubWithBrand: json.hubProductsFetched ?? 0,
          hubBrandSample: [],
          localWithBrand: json.diagnostics.hasBrand ?? 0,
          localMissingBrand: json.diagnostics.missingBrand ?? 0,
          localDistinctBrands: json.diagnostics.distinctBrands ?? 0,
        });
      }
    } catch (e) {
      setForceResult(`Brand backfill error: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBrandLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadStatus();
    loadBrandDiag();
    const supabase = getSupabase();

    const channel = supabase
      .channel('sync-status-watcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        const ev: SyncEvent = {
          id: crypto.randomUUID(),
          event_type: payload.eventType.toUpperCase(),
          status: 'success',
          error_message: null,
          processed_at: new Date().toISOString(),
          centralhub_product_id: (payload.new as Record<string, unknown>)?.centralhub_product_id as string ?? null,
          payload: { name: (payload.new as Record<string, unknown>)?.name },
        };
        setLiveEvents(prev => [ev, ...prev].slice(0, 50));
        setLastEventAt(ev.processed_at);
        setConnState('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnState('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnState('error');
        else if (status === 'CLOSED') setConnState('disconnected');
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [loadStatus, loadBrandDiag]);

  const allEvents = [...liveEvents, ...(statusData?.recentEvents ?? [])].reduce<SyncEvent[]>((acc, ev) => {
    if (!acc.find(e => e.id === ev.id)) acc.push(ev);
    return acc;
  }, []).slice(0, 50);

  const isError = (s: string) => s.toLowerCase().includes('error');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sync Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time CentralHub synchronisation monitor</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadStatus}
            disabled={statusLoading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleForcePoll}
            disabled={pollLoading}
            className="flex items-center gap-2 px-3 py-2 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            {pollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
            Poll CentralHub
          </button>
          <button
            onClick={handleForceResync}
            disabled={forceLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B5D3B] hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
          >
            {forceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Force Full Resync
          </button>
        </div>
      </div>

      {/* Result banner */}
      {forceResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
          isError(forceResult)
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {isError(forceResult)
            ? <XCircle className="w-4 h-4 flex-shrink-0" />
            : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {forceResult}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`border rounded-xl px-4 py-3 ${CONN_COLOR[connState]}`}>
          <div className="flex items-center gap-2 mb-1">
            {connState === 'connected' ? <Wifi className="w-4 h-4" />
              : connState === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" />
              : <WifiOff className="w-4 h-4" />}
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Realtime</span>
          </div>
          <p className="text-lg font-bold">{CONN_LABEL[connState]}</p>
          <p className="text-[11px] opacity-60 mt-0.5">Local DB subscription</p>
        </div>

        <div className="border border-gray-200 bg-gray-50 text-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Last Event</span>
          </div>
          <p className="text-lg font-bold">{lastEventAt ? fmtAgo(lastEventAt) : '—'}</p>
          <p className="text-[11px] opacity-60 mt-0.5 truncate">
            {lastEventAt ? fmtDate(lastEventAt) : 'No events yet'}
          </p>
        </div>

        <div className="border border-blue-200 bg-blue-50 text-blue-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Synced Today</span>
          </div>
          <p className="text-2xl font-extrabold">
            {statusLoading ? '…' : (statusData?.syncedToday ?? 0) + liveEvents.length}
          </p>
          <p className="text-[11px] opacity-60 mt-0.5">product changes</p>
        </div>

        <div className={`border rounded-xl px-4 py-3 ${
          (statusData?.failedToday ?? 0) > 0
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Failed Today</span>
          </div>
          <p className="text-2xl font-extrabold">{statusLoading ? '…' : statusData?.failedToday ?? 0}</p>
          <p className="text-[11px] opacity-60 mt-0.5">sync errors</p>
        </div>
      </div>

      {/* Brand Diagnostics */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">Brand Sync Diagnostics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadBrandDiag}
              disabled={diagLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${diagLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleBrandBackfill}
              disabled={brandLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
            >
              {brandLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
              Run Brand Backfill
            </button>
          </div>
        </div>
        <div className="p-4">
          {diagLoading && !brandDiag ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading diagnostics…
            </div>
          ) : brandDiag ? (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-2xl font-extrabold text-green-700">{brandDiag.localDistinctBrands}</p>
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">Distinct Brands</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-2xl font-extrabold text-blue-700">{brandDiag.localWithBrand}</p>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Products with Brand</p>
                </div>
                <div className={`border rounded-lg px-3 py-2.5 text-center ${
                  brandDiag.localMissingBrand > 0
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <p className={`text-2xl font-extrabold ${brandDiag.localMissingBrand > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                    {brandDiag.localMissingBrand}
                  </p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${brandDiag.localMissingBrand > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    Missing Brand
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-2xl font-extrabold text-gray-700">{brandDiag.hubWithBrand}</p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5">CentralHub w/ Brand</p>
                </div>
              </div>

              {/* Missing brand warning */}
              {brandDiag.localMissingBrand > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{brandDiag.localMissingBrand} products</strong> are missing a brand value.
                    {brandDiag.hubWithBrand === 0
                      ? ' CentralHub does not currently provide brand data — brands must be set manually in product records.'
                      : ' Run Brand Backfill to pull brand values from CentralHub into all matched products.'}
                  </span>
                </div>
              )}

              {brandDiag.localMissingBrand === 0 && brandDiag.localDistinctBrands > 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  All products have a brand value. Brands page will show {brandDiag.localDistinctBrands} brand{brandDiag.localDistinctBrands !== 1 ? 's' : ''}.
                </div>
              )}

              {/* Sample brands from CentralHub */}
              {brandDiag.hubBrandSample.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Sample brands available in CentralHub:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brandDiag.hubBrandSample.map(b => (
                      <span key={b} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700">{b}</span>
                    ))}
                  </div>
                </div>
              )}

              {brandDiag.hubWithBrand === 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    CentralHub is returning <strong>brand = null</strong> for all products.
                    Brands must be set in CentralHub first, then a full resync or backfill will propagate them here.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4">Click Refresh to load brand diagnostics.</p>
          )}
        </div>
      </div>

      {/* Webhook URL info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">CentralHub Webhook Endpoint</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Configure this URL as a webhook in CentralHub to receive real-time product changes:
            </p>
            <div className="mt-2 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Primary (API Route)</span>
                <code className="block mt-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-gray-800 break-all select-all">
                  {window.location.origin}/api/webhooks/centralhub
                </code>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Fallback (Edge Function)</span>
                <code className="block mt-1 text-xs bg-white/50 border border-amber-100 rounded-lg px-3 py-1.5 text-gray-600 break-all select-all">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-realtime
                </code>
              </div>
            </div>
            <p className="text-[11px] text-amber-600 mt-2">
              Send POST with body: {`{ "type": "INSERT"|"UPDATE"|"DELETE", "record": {...} }`}
              {' — '}Ensure <strong>x-webhook-secret</strong> header matches your configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Event log */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-bold text-gray-900">Live Event Feed</h2>
          {connState === 'connected' && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>

        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <Activity className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Waiting for sync events…</p>
            <p className="text-xs mt-1 opacity-60">Events will appear here as products are synced from CentralHub</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Event</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Product</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((ev, i) => (
                  <tr key={ev.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${EVENT_COLOR[ev.event_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-700 max-w-[220px] truncate">
                      {(ev.payload?.name as string) ?? ev.centralhub_product_id?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {ev.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> success
                        </span>
                      ) : ev.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-red-600" title={ev.error_message ?? ''}>
                          <XCircle className="w-3 h-3" /> failed
                        </span>
                      ) : (
                        <span className="text-gray-400">{ev.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(ev.processed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
