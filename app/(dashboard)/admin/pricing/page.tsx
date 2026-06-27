'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { RefreshCw, DollarSign, TrendingUp, Package, Loader as Loader2, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface RecalcResult {
  processed: number;
  updated: number;
  errors: string[];
  changes: Array<{
    product_id: string;
    product_name: string;
    old_selling_price: number;
    new_selling_price: number;
    cost_price: number;
    markup_pct: number;
  }>;
}

interface PriceHistoryEntry {
  id: string;
  product_id: string;
  product_name: string | null;
  product_slug: string | null;
  old_cost_price: number | null;
  new_cost_price: number | null;
  old_selling_price: number | null;
  new_selling_price: number | null;
  markup_percentage: number | null;
  changed_by: string | null;
  changed_at: string;
}

interface PriceSummary {
  totalWithCostPrice: number;
  totalWithSellingPrice: number;
  avgMarkup: number | null;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'gray' | 'green' | 'amber' | 'blue';
}) {
  const colorMap = {
    gray:  'bg-gray-50 border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`border rounded-xl px-4 py-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminPricingPage() {
  const [summary, setSummary] = useState<PriceSummary | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [expandedChanges, setExpandedChanges] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    setHistoryLoading(true);

    const [summaryRes, histRes] = await Promise.all([
      supabase
        .from('products')
        .select('cost_price, selling_price, markup_percentage, is_deleted')
        .eq('is_deleted', false),
      supabase
        .from('price_history')
        .select('id, product_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price, markup_percentage, changed_by, changed_at, products(name, slug)')
        .order('changed_at', { ascending: false })
        .limit(100),
    ]);

    if (summaryRes.data) {
      const rows = summaryRes.data as { cost_price: number | null; selling_price: number | null; markup_percentage: number | null }[];
      const withCost = rows.filter(r => r.cost_price != null && r.cost_price > 0).length;
      const withSelling = rows.filter(r => r.selling_price != null && r.selling_price > 0).length;
      const markups = rows.map(r => r.markup_percentage).filter((m): m is number => m != null && m > 0);
      const avgMarkup = markups.length ? Math.round(markups.reduce((a, b) => a + b, 0) / markups.length * 10) / 10 : null;
      setSummary({ totalWithCostPrice: withCost, totalWithSellingPrice: withSelling, avgMarkup });
    }

    if (histRes.data) {
      const rows = histRes.data as unknown as Array<{
        id: string; product_id: string;
        old_cost_price: number | null; new_cost_price: number | null;
        old_selling_price: number | null; new_selling_price: number | null;
        markup_percentage: number | null; changed_by: string | null; changed_at: string;
        products: { name: string; slug: string } | null;
      }>;
      setHistory(rows.map(r => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.products?.name ?? null,
        product_slug: r.products?.slug ?? null,
        old_cost_price: r.old_cost_price,
        new_cost_price: r.new_cost_price,
        old_selling_price: r.old_selling_price,
        new_selling_price: r.new_selling_price,
        markup_percentage: r.markup_percentage,
        changed_by: r.changed_by,
        changed_at: r.changed_at,
      })));
    }

    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    setRecalcResult(null);
    setRecalcError(null);
    setExpandedChanges(false);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/centralhub-sync`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'recalculate_prices' }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRecalcResult(json as RecalcResult);
      loadData();
    } catch (err) {
      setRecalcError(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setRecalcLoading(false);
    }
  };

  const fmt = (v: number | null) => v != null ? `£${v.toFixed(2)}` : '—';
  const fmtDate = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recalculate selling prices from cost price and markup settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={historyLoading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalcLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B5D3B] hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
          >
            {recalcLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <TrendingUp className="w-4 h-4" />}
            Recalculate Prices
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Products with Cost Price"
            value={summary.totalWithCostPrice}
            sub="synced from CentralHub"
            icon={<DollarSign className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Products with Selling Price"
            value={summary.totalWithSellingPrice}
            sub="shown to customers"
            icon={<Package className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="Average Markup"
            value={summary.avgMarkup != null ? `${summary.avgMarkup}%` : '—'}
            sub="across all products"
            icon={<TrendingUp className="w-4 h-4" />}
            color="amber"
          />
        </div>
      )}

      {/* Recalculate result */}
      {recalcError && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{recalcError}</span>
        </div>
      )}

      {recalcResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Recalculation Complete</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-green-700">
              <span><strong>{recalcResult.processed}</strong> processed</span>
              <span><strong>{recalcResult.updated}</strong> updated</span>
              {recalcResult.errors.length > 0 && (
                <span className="text-red-600"><strong>{recalcResult.errors.length}</strong> errors</span>
              )}
            </div>
          </div>

          {recalcResult.changes.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedChanges(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
              >
                <span>View {recalcResult.changes.length} price changes</span>
                {expandedChanges ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedChanges && (
                <div className="overflow-x-auto border-t border-green-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-green-100 text-green-700">
                        <th className="px-4 py-2 text-left font-semibold">Product</th>
                        <th className="px-4 py-2 text-right font-semibold">Cost Price</th>
                        <th className="px-4 py-2 text-right font-semibold">Markup</th>
                        <th className="px-4 py-2 text-right font-semibold">Old Selling</th>
                        <th className="px-4 py-2 text-right font-semibold">New Selling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalcResult.changes.map((c, i) => (
                        <tr key={c.product_id} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50/50'}>
                          <td className="px-4 py-2 font-medium text-gray-800 max-w-[200px] truncate">{c.product_name}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{fmt(c.cost_price)}</td>
                          <td className="px-4 py-2 text-right text-amber-700">{c.markup_pct}%</td>
                          <td className="px-4 py-2 text-right text-gray-400 line-through">{fmt(c.old_selling_price)}</td>
                          <td className="px-4 py-2 text-right font-bold text-green-700">{fmt(c.new_selling_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Price history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-bold text-gray-900">Price Change History</h2>
          <span className="text-xs text-gray-400 ml-1">(last 100 changes)</span>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading history…</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No price changes recorded yet.</p>
            <p className="text-xs mt-1 opacity-70">Price changes are recorded when syncing from CentralHub or recalculating.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Product</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Old Cost</th>
                  <th className="px-4 py-2.5 text-right font-semibold">New Cost</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Old Selling</th>
                  <th className="px-4 py-2.5 text-right font-semibold">New Selling</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Markup</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Source</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const costChanged = h.old_cost_price !== h.new_cost_price;
                  const sellingChanged = h.old_selling_price !== h.new_selling_price;
                  return (
                    <tr key={h.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">
                        {h.product_name ?? h.product_id.slice(0, 8)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${costChanged ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                        {fmt(h.old_cost_price)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${costChanged ? 'text-blue-700' : 'text-gray-600'}`}>
                        {fmt(h.new_cost_price)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${sellingChanged ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                        {fmt(h.old_selling_price)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${sellingChanged ? 'text-green-700' : 'text-gray-600'}`}>
                        {fmt(h.new_selling_price)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-700">
                        {h.markup_percentage != null ? `${h.markup_percentage}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {h.changed_by ?? 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                        {fmtDate(h.changed_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
