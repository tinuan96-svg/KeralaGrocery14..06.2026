'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Copy, Package, ChevronDown, ChevronUp, Zap, Scale, Tag, FileWarning } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditStats {
  missing_weight_count: number;
  missing_unit_count: number;
  invalid_weight_count: number;
  variant_groups_total: number;
  products_in_groups: number;
  sample_missing_weight: SampleProduct[] | null;
  sample_missing_unit: SampleProduct[] | null;
  sample_invalid_weight: (SampleProduct & { unit: string })[] | null;
}

interface SampleProduct {
  id: string;
  name: string;
  brand: string | null;
  unit?: string;
}

interface VariantGroup {
  id: string;
  base_name: string;
  brand: string | null;
  product_count: number;
  variants: VariantRow[];
}

interface VariantRow {
  id: string;
  name: string;
  slug: string;
  variant_size: string | null;
  variant_weight_g: number | null;
  price: number;
  approval_status: string;
}

interface DuplicateGroup {
  base_name: string;
  brand: string | null;
  variant_size: string;
  count: number;
  products: { id: string; name: string; price: number; slug: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

function StatCard({
  label, value, icon: Icon, color = 'slate', sub,
}: {
  label: string; value: string | number; icon: React.ElementType;
  color?: 'green' | 'amber' | 'red' | 'slate' | 'blue';
  sub?: string;
}) {
  const palette: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red:   'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-gray-50 text-gray-700 border-gray-100',
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${palette[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Variant Group Card ─────────────────────────────────────────────────────

function VariantGroupCard({ group }: { group: VariantGroup }) {
  const [open, setOpen] = useState(false);
  const hasTrueSizes = new Set(group.variants.map(v => v.variant_size)).size > 1;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${
      hasTrueSizes ? 'border-emerald-200' : 'border-amber-200'
    }`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasTrueSizes ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{group.base_name}</p>
          <p className="text-xs text-gray-500">
            {group.brand ?? 'No brand'} · {group.product_count} variant{group.product_count !== 1 ? 's' : ''}
            {!hasTrueSizes && <span className="ml-2 text-amber-600 font-semibold">· Duplicates detected</span>}
          </p>
        </div>
        {/* Size pills */}
        <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-xs">
          {Array.from(new Set(group.variants.map(v => v.variant_size).filter(Boolean))).map(s => (
            <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">{s}</span>
          ))}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Product name</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Size</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Price</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.variants.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/products/${v.slug}`} target="_blank" className="text-blue-600 hover:underline font-medium truncate max-w-[200px] inline-block">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      v.variant_size ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {v.variant_size ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(v.price)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      v.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                      v.approval_status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>{v.approval_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Duplicate Group ────────────────────────────────────────────────────────

function DuplicateCard({ group }: { group: DuplicateGroup }) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3 bg-red-50">
        <Copy className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-900">
            {group.base_name}
            {group.brand && <span className="text-gray-500 font-normal ml-1">by {group.brand}</span>}
          </p>
          <p className="text-xs text-red-600 font-semibold">{group.count} identical records — size: {group.variant_size}</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {group.products.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 text-xs text-gray-400 font-bold">{i + 1}</span>
              <Link href={`/products/${p.slug}`} target="_blank" className="text-xs text-blue-600 hover:underline">{p.name}</Link>
            </div>
            <span className="text-xs font-bold text-gray-700">{fmt(p.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function VariantAuditPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [groups, setGroups] = useState<VariantGroup[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [missingTab, setMissingTab] = useState<'weight' | 'unit' | 'invalid'>('weight');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    const [auditRes, groupsRes, prodRows] = await Promise.all([
      supabase.rpc('get_variant_audit'),
      supabase
        .from('variant_groups')
        .select('id, base_name, brand, product_count')
        .order('product_count', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, slug, variant_size, variant_weight_g, price, approval_status, variant_group_id')
        .not('variant_group_id', 'is', null)
        .eq('is_deleted', false)
        .order('variant_weight_g', { ascending: true }),
    ]);

    if (auditRes.data) {
      const row = Array.isArray(auditRes.data) ? auditRes.data[0] : auditRes.data;
      if (row) setStats({
        missing_weight_count: Number(row.missing_weight_count ?? 0),
        missing_unit_count: Number(row.missing_unit_count ?? 0),
        invalid_weight_count: Number(row.invalid_weight_count ?? 0),
        variant_groups_total: Number(row.variant_groups_total ?? 0),
        products_in_groups: Number(row.products_in_groups ?? 0),
        sample_missing_weight: row.sample_missing_weight ?? null,
        sample_missing_unit: row.sample_missing_unit ?? null,
        sample_invalid_weight: row.sample_invalid_weight ?? null,
      });
    }

    if (groupsRes.data && prodRows.data) {
      const variantsByGroup: Record<string, VariantRow[]> = {};
      for (const p of prodRows.data) {
        if (!p.variant_group_id) continue;
        if (!variantsByGroup[p.variant_group_id]) variantsByGroup[p.variant_group_id] = [];
        variantsByGroup[p.variant_group_id].push(p as VariantRow);
      }
      setGroups(
        groupsRes.data.map(g => ({
          ...g,
          variants: variantsByGroup[g.id] ?? [],
        }))
      );

      // Detect duplicates: same group + same variant_size, multiple products
      const dupMap: Record<string, DuplicateGroup> = {};
      for (const p of prodRows.data) {
        if (!p.variant_group_id || !p.variant_size) continue;
        const key = `${p.variant_group_id}__${p.variant_size}`;
        if (!dupMap[key]) {
          const grp = groupsRes.data.find(g => g.id === p.variant_group_id);
          dupMap[key] = {
            base_name: grp?.base_name ?? '',
            brand: grp?.brand ?? null,
            variant_size: p.variant_size,
            count: 0,
            products: [],
          };
        }
        dupMap[key].count++;
        dupMap[key].products.push({
          id: p.id, name: p.name, price: p.price, slug: p.slug ?? p.id,
        });
      }
      setDuplicates(Object.values(dupMap).filter(d => d.count > 1));
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRunGrouping = async () => {
    setRunning(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('auto_group_product_variants');
    if (error) {
      showToast(`Error: ${error.message}`, false);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      showToast(`Done — ${row?.groups_created ?? 0} groups created, ${row?.products_tagged ?? 0} products tagged`);
      await loadData();
    }
    setRunning(false);
  };

  const missingProducts =
    missingTab === 'weight' ? stats?.sample_missing_weight :
    missingTab === 'unit'   ? stats?.sample_missing_unit :
    stats?.sample_invalid_weight;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-lg font-black text-gray-900">Variant Audit Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Size grouping, weight normalisation, duplicate detection</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunGrouping}
            disabled={running || loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
          >
            <Zap className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Running…' : 'Re-run Auto Grouping'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Variant Groups" value={stats?.variant_groups_total ?? '—'} icon={Tag} color="green" sub="Auto-detected" />
        <StatCard label="Products Grouped" value={stats?.products_in_groups ?? '—'} icon={Package} color="blue" sub="In a size group" />
        <StatCard label="Missing Weight" value={stats?.missing_weight_count ?? '—'} icon={Scale} color={stats?.missing_weight_count ? 'amber' : 'slate'} />
        <StatCard label="Missing Unit" value={stats?.missing_unit_count ?? '—'} icon={FileWarning} color={stats?.missing_unit_count ? 'amber' : 'slate'} />
        <StatCard label="Invalid Weights" value={stats?.invalid_weight_count ?? '—'} icon={AlertTriangle} color={stats?.invalid_weight_count ? 'red' : 'slate'} sub="Unrecognised unit" />
      </div>

      {/* Duplicate variants */}
      {duplicates.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            title={`Duplicate Variants (${duplicates.length})`}
            sub="Same product, same size — multiple records. Review and merge or keep only one."
          />
          <div className="space-y-3">
            {duplicates.map((d, i) => <DuplicateCard key={i} group={d} />)}
          </div>
        </section>
      )}

      {/* Variant groups */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Variant Groups ({groups.length})</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Green = true size variants (different weights) · Amber = same-size duplicates
            </p>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No variant groups yet. Click "Re-run Auto Grouping" to detect them.
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map(g => <VariantGroupCard key={g.id} group={g} />)}
          </div>
        )}
      </section>

      {/* Missing data report */}
      <section className="mb-8">
        <SectionHeader title="Products with Missing Data" sub="Showing first 10 in each category" />
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {([
              { key: 'weight', label: 'Missing Weight', count: stats?.missing_weight_count },
              { key: 'unit',   label: 'Missing Unit',   count: stats?.missing_unit_count },
              { key: 'invalid',label: 'Invalid Weight', count: stats?.invalid_weight_count },
            ] as { key: 'weight' | 'unit' | 'invalid'; label: string; count?: number }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setMissingTab(t.key)}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${
                  missingTab === t.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    t.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : !missingProducts?.length ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              No products with this issue
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {missingProducts.map((p: SampleProduct & { unit?: string }) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.brand ?? 'No brand'}{p.unit ? ` · unit: "${p.unit}"` : ''}</p>
                  </div>
                  <Link
                    href={`/admin/product-approval`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Weight normalisation examples */}
      <section className="mb-8">
        <SectionHeader title="Weight Normalisation Reference" sub="How raw values are converted to canonical labels" />
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Raw input</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Normalised label</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Weight (g)</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Valid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { raw: '500 Gram', label: '500g', grams: 500, valid: true },
                { raw: '1000 Gram', label: '1kg', grams: 1000, valid: true },
                { raw: '1 Kg', label: '1kg', grams: 1000, valid: true },
                { raw: '0.5 Kg', label: '500g', grams: 500, valid: true },
                { raw: '5 Kg', label: '5kg', grams: 5000, valid: true },
                { raw: '10000 Gram', label: '10kg', grams: 10000, valid: true },
                { raw: '500 ML', label: '500ml', grams: 500, valid: true },
                { raw: '1 Litre', label: '1L', grams: 1000, valid: true },
                { raw: '6 Pcs', label: '6 pcs', grams: 6, valid: true },
                { raw: 'Bottle', label: 'Bottle', grams: null, valid: false },
              ].map(r => (
                <tr key={r.raw} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-gray-600">{r.raw}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{r.label}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.grams ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.valid
                      ? <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Valid</span>
                      : <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Invalid</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
