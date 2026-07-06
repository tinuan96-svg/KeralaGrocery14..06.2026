'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { RefreshCw, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, Circle as XCircle, RotateCcw, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });

interface DiagRow {
  order_number:       string;
  created_at:         string;
  payment_status:     string;
  order_status:       string;
  payment_method:     string;
  payment_reference:  string | null;
  total:              number;
  customer_name:      string;
  customer_email:     string;
  // joined
  errors:             PaymentError[];
  webhooks:           WebhookLog[];
  session:            PaymentSession | null;
}

interface PaymentError {
  id:            string;
  source:        string;
  error_message: string;
  raw_payload:   string | null;
  created_at:    string;
}

interface WebhookLog {
  id:            string;
  event_type:    string;
  status:        string;
  error_message: string | null;
  processed_at:  string | null;
  created_at:    string;
}

interface PaymentSession {
  status:       string;
  amount_pence: number;
  created_at:   string;
  payment_url:  string;
}

const PAYMENT_BADGE: Record<string, string> = {
  paid:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-100 text-amber-700 border-amber-200',
  failed:   'bg-red-100 text-red-700 border-red-200',
  refunded: 'bg-gray-100 text-gray-700 border-gray-200',
};

const ORDER_BADGE: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700 border-amber-200',
  confirmed:  'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-sky-100 text-sky-700 border-sky-200',
  shipped:    'bg-violet-100 text-violet-700 border-violet-200',
  delivered:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};

const WEBHOOK_BADGE: Record<string, string> = {
  success:    'bg-emerald-100 text-emerald-700',
  processing: 'bg-blue-100 text-blue-700',
  failed:     'bg-red-100 text-red-700',
  error:      'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-700',
  chargeback: 'bg-orange-100 text-orange-700',
  expired:    'bg-gray-100 text-gray-700',
  unhandled:  'bg-yellow-100 text-yellow-700',
};

export default function PaymentDiagnosticsPage() {
  const [rows, setRows]             = useState<DiagRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [retrying, setRetrying]     = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'failed' | 'pending'>('failed');
  const [toastMsg, setToastMsg]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    // Fetch orders with payment/order status filter
    let q = supabase
      .from('orders')
      .select('order_number, created_at, payment_status, order_status, payment_method, payment_reference, total, customer_name, customer_email')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filter === 'failed')  q = q.eq('payment_status', 'failed');
    if (filter === 'pending') q = q.eq('payment_status', 'pending');

    const { data: orders } = await q;
    if (!orders?.length) { setRows([]); setLoading(false); return; }

    const orderNumbers = orders.map(o => o.order_number);

    // Parallel fetch errors, webhook logs, payment sessions
    const [errRes, whlRes, sesRes] = await Promise.all([
      supabase.from('payment_errors')
        .select('id, order_number, source, error_message, raw_payload, created_at')
        .in('order_number', orderNumbers)
        .order('created_at', { ascending: false }),
      supabase.from('webhook_logs')
        .select('id, order_number, event_type, status, error_message, processed_at, created_at')
        .in('order_number', orderNumbers)
        .order('created_at', { ascending: false }),
      supabase.from('payment_sessions')
        .select('order_number, status, amount_pence, created_at, payment_url')
        .in('order_number', orderNumbers),
    ]);

    const errorsByOrder   = groupBy(errRes.data ?? [], 'order_number');
    const webhooksByOrder = groupBy(whlRes.data ?? [], 'order_number');
    const sessionByOrder  = Object.fromEntries(
      (sesRes.data ?? []).map(s => [s.order_number, s])
    );

    setRows(orders.map(o => ({
      ...o,
      errors:   errorsByOrder[o.order_number]   ?? [],
      webhooks: webhooksByOrder[o.order_number] ?? [],
      session:  sessionByOrder[o.order_number]  ?? null,
    })));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const retryWebhook = async (orderNumber: string) => {
    setRetrying(orderNumber);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/worldpay-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          eventDetails: {
            type:                 'authorized',
            transactionReference: orderNumber,
            downstreamReference:  `manual-retry-${Date.now()}`,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.received) {
        showToast(`Webhook replayed for ${orderNumber}`);
        await load();
      } else {
        showToast(`Retry failed: ${json.error ?? 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Retry error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setRetrying(null);
    }
  };

  const retryPayment = async (row: DiagRow) => {
    setRetrying(row.order_number);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/worldpay-payment`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount:               row.total,
          transactionReference: row.order_number,
          narrative:            'Kerala Groceries UK',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        showToast(`Payment link opened for ${row.order_number}`);
      } else {
        showToast(`Failed to create payment link: ${data.error ?? 'Unknown'}`);
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setRetrying(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const failedCount  = rows.filter(r => r.payment_status === 'failed').length;
  const pendingCount = rows.filter(r => r.payment_status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Diagnostics</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor payment failures, webhook events and retry failed transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="border-gray-700 text-gray-300 hover:bg-gray-800">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Failed Payments" value={failedCount} color="red" />
        <StatCard label="Pending Payments" value={pendingCount} color="amber" />
        <StatCard label="Total Shown" value={rows.length} color="blue" />
        <StatCard label="With Errors" value={rows.filter(r => r.errors.length > 0).length} color="orange" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['failed', 'pending', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <CheckCircle className="w-12 h-12 mb-3 text-emerald-500" />
          <p className="font-medium">No {filter === 'all' ? '' : filter} payments found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.order_number} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

              {/* Row header */}
              <button
                className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpanded(expanded === row.order_number ? null : row.order_number)}>

                <span className="font-mono text-sm font-bold text-white w-36">{row.order_number}</span>

                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PAYMENT_BADGE[row.payment_status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {row.payment_status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ORDER_BADGE[row.order_status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {row.order_status}
                </span>

                <span className="text-sm text-white font-semibold ml-auto">{fmt(row.total)}</span>
                <span className="text-xs text-gray-400 hidden sm:block">{fmtDate(row.created_at)}</span>
                <span className="text-xs text-gray-500 hidden md:block">{row.customer_name}</span>

                {row.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" /> {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                  </span>
                )}
                {row.webhooks.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-blue-400">
                    <Webhook className="w-3.5 h-3.5" /> {row.webhooks.length} webhook{row.webhooks.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>

              {/* Expanded detail */}
              {expanded === row.order_number && (
                <div className="border-t border-gray-800 px-5 pb-5 pt-4 space-y-5">

                  {/* Order info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <InfoItem label="Order Number"    value={row.order_number} />
                    <InfoItem label="Payment Method"  value={row.payment_method} />
                    <InfoItem label="Transaction ID"  value={row.payment_reference ?? '—'} />
                    <InfoItem label="Customer Email"  value={row.customer_email} />
                  </div>

                  {/* Payment session */}
                  {row.session && (
                    <div className="bg-gray-800 rounded-lg p-3 text-xs">
                      <p className="text-gray-400 font-medium mb-2 uppercase tracking-wide text-[10px]">Payment Session</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <InfoItem label="Status"   value={row.session.status} />
                        <InfoItem label="Amount"   value={fmt(row.session.amount_pence / 100)} />
                        <InfoItem label="Created"  value={fmtDate(row.session.created_at)} />
                      </div>
                    </div>
                  )}

                  {/* Webhook logs */}
                  {row.webhooks.length > 0 && (
                    <div>
                      <p className="text-gray-400 font-medium mb-2 uppercase tracking-wide text-[10px]">Webhook Events</p>
                      <div className="space-y-1.5">
                        {row.webhooks.map(wh => (
                          <div key={wh.id} className="bg-gray-800 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${WEBHOOK_BADGE[wh.status] ?? 'bg-gray-200 text-gray-700'}`}>
                              {wh.status}
                            </span>
                            <span className="text-gray-300 font-mono">{wh.event_type}</span>
                            {wh.error_message && <span className="text-red-400">{wh.error_message}</span>}
                            <span className="text-gray-500 ml-auto">{fmtDate(wh.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment errors */}
                  {row.errors.length > 0 && (
                    <div>
                      <p className="text-gray-400 font-medium mb-2 uppercase tracking-wide text-[10px]">Error Log</p>
                      <div className="space-y-1.5">
                        {row.errors.map(err => (
                          <div key={err.id} className="bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2 text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-red-400 font-medium">{err.source}</span>
                              <span className="text-gray-500">{fmtDate(err.created_at)}</span>
                            </div>
                            <p className="text-red-300">{err.error_message}</p>
                            {err.raw_payload && (
                              <details className="mt-1">
                                <summary className="text-gray-500 cursor-pointer hover:text-gray-400">Raw payload</summary>
                                <pre className="mt-1 text-gray-400 whitespace-pre-wrap break-all text-[10px]">
                                  {err.raw_payload}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(row.payment_status === 'failed' || row.payment_status === 'pending') && (
                      <Button size="sm" variant="outline"
                        className="border-amber-700 text-amber-400 hover:bg-amber-900/30 text-xs"
                        disabled={retrying === row.order_number}
                        onClick={() => retryWebhook(row.order_number)}>
                        <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${retrying === row.order_number ? 'animate-spin' : ''}`} />
                        Retry Webhook
                      </Button>
                    )}
                    {(row.payment_status === 'failed' || row.payment_status === 'pending') && (
                      <Button size="sm" variant="outline"
                        className="border-blue-700 text-blue-400 hover:bg-blue-900/30 text-xs"
                        disabled={retrying === row.order_number}
                        onClick={() => retryPayment(row)}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${retrying === row.order_number ? 'animate-spin' : ''}`} />
                        Retry Payment
                      </Button>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80 mt-0.5">{label}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-200 font-mono truncate">{value}</p>
    </div>
  );
}

function groupBy<T extends Record<string, unknown>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
