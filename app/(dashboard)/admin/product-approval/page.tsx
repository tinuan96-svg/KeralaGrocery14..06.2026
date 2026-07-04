'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Search, CircleCheck as CheckCircle, Circle as XCircle, RotateCcw,
  CreditCard as Edit2, Eye, EyeOff, RefreshCw, CircleAlert as AlertCircle,
  Loader as Loader2, ChevronUp, ChevronDown, ChevronsUpDown,
  Info, X,
} from 'lucide-react';
import {
  fetchApprovalStats,
  fetchProductsByStatus,
  approveProduct,
  rejectProduct,
  moveToDraft,
  toggleVisibility,
  updateProduct,
  syncProductsFromKeralagroceries,
  bulkApproveDraftProducts,
  type ApprovalProduct,
  type ApprovalStats,
  type ApprovalStatus,
  type ProductEditPayload,
  type ApprovalError,
} from '@/lib/services/productApprovalService';
import ProductEditModal from '@/components/admin/ProductEditModal';

type TabKey = ApprovalStatus | 'missing';
type SortField = 'created_at' | 'name' | 'brand' | 'price';

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'draft',    label: 'Draft',         color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'approved', label: 'Approved',       color: 'text-green-700 bg-green-50 border-green-200' },
  { key: 'rejected', label: 'Rejected',       color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'missing',  label: 'Missing Fields', color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

const PAGE_SIZE = 1000;

function isMissingRequiredFields(p: ApprovalProduct): string[] {
  const missing: string[] = [];
  if (!p.category_id) missing.push('category');
  if (!p.image_url && !p.image_main) missing.push('image');
  if (!p.short_description?.trim()) missing.push('short description');
  if (!p.description?.trim()) missing.push('description');
  const price = p.selling_price ?? p.price ?? 0;
  if (price <= 0) missing.push('selling price');
  return missing;
}

function SortIcon({ field, current, asc }: { field: SortField; current: SortField; asc: boolean }) {
  if (field !== current) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return asc ? <ChevronUp className="w-3 h-3 text-emerald-600" /> : <ChevronDown className="w-3 h-3 text-emerald-600" />;
}

// Diagnostics modal shown when an approval error occurs
function DiagnosticsModal({
  productName,
  approvalError,
  onClose,
}: {
  productName: string;
  approvalError: ApprovalError;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <h2 className="text-base font-semibold text-gray-900">Approval Failed — {productName}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Error Stage</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              approvalError.stage === 'validation'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {approvalError.stage}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Error Message</p>
            <p className="text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 font-mono text-xs whitespace-pre-wrap break-words">
              {approvalError.message}
            </p>
          </div>

          {approvalError.missingFields && approvalError.missingFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Missing Fields</p>
              <div className="flex flex-wrap gap-1.5">
                {approvalError.missingFields.map(f => (
                  <span key={f} className="inline-flex px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {approvalError.dbCode && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Database Error Code</p>
              <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">{approvalError.dbCode}</code>
            </div>
          )}

          {approvalError.dbDetails && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Database Details</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100 font-mono whitespace-pre-wrap break-words">
                {approvalError.dbDetails}
              </p>
            </div>
          )}

          {approvalError.dbHint && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Database Hint</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                {approvalError.dbHint}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductApprovalPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('draft');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [products, setProducts] = useState<ApprovalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ApprovalProduct | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ productName: string; approvalError: ApprovalError } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const s = await fetchApprovalStats();
    setStats(s);
    setStatsLoading(false);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { products: p, total: t } = await fetchProductsByStatus(
      tab, 1, PAGE_SIZE, search, sortField, sortAsc, brandFilter
    );
    setProducts(p);
    setTotal(t);
    setLoading(false);
  }, [tab, search, sortField, sortAsc, brandFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const brandOptions = useMemo(() => {
    const seen = new Set<string>();
    products.forEach(p => {
      const b = p.brand ?? p.source_brand;
      if (b) seen.add(b);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'brand');
    }
  };

  const handleApprove = async (product: ApprovalProduct) => {
    if (!user) return;

    // Client-side guard — should never reach server with missing fields
    const missing = isMissingRequiredFields(product);
    if (missing.length > 0) {
      showToast(`Cannot approve. Missing: ${missing.join(', ')}`, 'err');
      return;
    }

    setActionLoading(product.id);
    const result = await approveProduct(product.id, user.id);

    if (result.error) {
      const displayMsg = result.approvalError?.message ?? result.error;
      showToast(displayMsg, 'err');
      if (result.approvalError) {
        setDiagnostics({ productName: product.name, approvalError: result.approvalError });
      }
    } else {
      showToast('Product approved and set visible');
      await Promise.all([loadProducts(), loadStats()]);
    }
    setActionLoading(null);
  };

  const handleReject = async (product: ApprovalProduct) => {
    setActionLoading(product.id);
    const { error } = await rejectProduct(product.id, user?.id);
    if (error) showToast(error, 'err');
    else { showToast('Product rejected'); await Promise.all([loadProducts(), loadStats()]); }
    setActionLoading(null);
  };

  const handleMoveToDraft = async (product: ApprovalProduct) => {
    setActionLoading(product.id);
    const { error } = await moveToDraft(product.id, user?.id);
    if (error) showToast(error, 'err');
    else { showToast('Moved to draft'); await Promise.all([loadProducts(), loadStats()]); }
    setActionLoading(null);
  };

  const handleToggleVisibility = async (product: ApprovalProduct) => {
    setActionLoading(product.id + '-vis');
    const { error } = await toggleVisibility(product.id, !product.visibility_status);
    if (error) showToast(error, 'err');
    else {
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, visibility_status: !p.visibility_status } : p)
      );
    }
    setActionLoading(null);
  };

  const handleSaveEdit = async (id: string, payload: ProductEditPayload) => {
    const { error } = await updateProduct(id, payload);
    if (error) throw new Error(error);
    showToast('Product saved');
    await Promise.all([loadProducts(), loadStats()]);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    const result = await syncProductsFromKeralagroceries();
    setSyncResult(result);
    setSyncing(false);
    await Promise.all([loadProducts(), loadStats()]);
  };

  const handleBulkApprove = async () => {
    if (!user) return;
    const draftCount = stats?.draft ?? 0;
    if (draftCount === 0) { showToast('No draft products to approve', 'err'); return; }
    if (!window.confirm(`Approve all ${draftCount} draft products and make them visible on the storefront?`)) return;
    setBulkApproving(true);
    const { approved, error } = await bulkApproveDraftProducts(user.id);
    if (error) showToast(error, 'err');
    else showToast(`${approved} products approved and set visible`);
    setBulkApproving(false);
    await Promise.all([loadProducts(), loadStats()]);
  };

  const statCards = [
    { label: 'Total Products', value: stats?.total ?? '—',        bg: 'bg-gray-50',   text: 'text-gray-900' },
    { label: 'Draft',          value: stats?.draft ?? '—',        bg: 'bg-amber-50',  text: 'text-amber-700' },
    { label: 'Approved',       value: stats?.approved ?? '—',     bg: 'bg-green-50',  text: 'text-green-700' },
    { label: 'Rejected',       value: stats?.rejected ?? '—',     bg: 'bg-red-50',    text: 'text-red-700' },
    { label: 'Missing Fields', value: stats?.missingFields ?? '—', bg: 'bg-orange-50', text: 'text-orange-700' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Diagnostics modal */}
      {diagnostics && (
        <DiagnosticsModal
          productName={diagnostics.productName}
          approvalError={diagnostics.approvalError}
          onClose={() => setDiagnostics(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Product Approval</h1>
          <p className="text-xs text-gray-500 mt-0.5">Review and approve products before they appear on the storefront</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && stats.draft > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {bulkApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve All Drafts ({stats.draft})
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Products
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className={`mb-4 px-3 py-2 rounded-xl text-sm border ${
          syncResult.errors.length
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          Sync complete: {syncResult.imported} product{syncResult.imported !== 1 ? 's' : ''} updated.
          {syncResult.errors.length > 0 && (
            <span className="ml-1">{syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}.</span>
          )}
          {stats?.lastSyncAt && (
            <span className="ml-1 text-xs opacity-70">
              Last sync: {new Date(stats.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {statCards.map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl px-3 py-3`}>
            {statsLoading ? (
              <div className="h-6 w-10 bg-gray-200 animate-pulse rounded mb-1" />
            ) : (
              <p className={`text-xl font-bold ${c.text}`}>{String(c.value)}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setBrandFilter(''); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              tab === t.key ? t.color + ' font-semibold' : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
            {stats && (
              <span className="ml-1.5 opacity-70 text-xs">
                ({t.key === 'draft' ? stats.draft
                  : t.key === 'approved' ? stats.approved
                  : t.key === 'rejected' ? stats.rejected
                  : stats.missingFields})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Brand filter row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <form
          onSubmit={e => { e.preventDefault(); setSearch(searchInput); }}
          className="relative flex-1 min-w-[180px] max-w-sm"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); if (!e.target.value) setSearch(''); }}
            placeholder="Search by name or brand…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
          />
        </form>

        <div className="relative">
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-500 cursor-pointer text-gray-700 min-w-[140px]"
          >
            <option value="">All Brands</option>
            {brandOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {(search || brandFilter) && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setBrandFilter(''); }}
            className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-12">Img</th>

                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                  <button
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Product <SortIcon field="name" current={sortField} asc={sortAsc} />
                  </button>
                </th>

                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">
                  <button
                    onClick={() => handleSort('brand')}
                    className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Brand <SortIcon field="brand" current={sortField} asc={sortAsc} />
                  </button>
                </th>

                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">
                  Category
                </th>

                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">
                  <button
                    onClick={() => handleSort('price')}
                    className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors ml-auto"
                  >
                    Price <SortIcon field="price" current={sortField} asc={sortAsc} />
                  </button>
                </th>

                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden xl:table-cell">Fields</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3"><div className="w-9 h-9 bg-gray-100 rounded-lg animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-40 animate-pulse" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 bg-gray-100 rounded w-24 animate-pulse" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 bg-gray-100 rounded w-20 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-12 ml-auto animate-pulse" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell" />
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 text-sm">
                    {search || brandFilter ? 'No products match the current filters' : 'No products in this category'}
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const missing = isMissingRequiredFields(product);
                  const isActioning = actionLoading === product.id;
                  const effectiveImage = product.image_main ?? product.image_url;
                  const brandName = product.brand ?? product.source_brand ?? null;
                  const categoryName = (product.categories as any)?.name ?? null;
                  const canApprove = missing.length === 0;
                  const approveTooltip = canApprove
                    ? 'Approve'
                    : `Cannot approve — missing: ${missing.join(', ')}`;

                  return (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {/* Image */}
                      <td className="px-4 py-2.5">
                        <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${
                          effectiveImage ? 'bg-gray-100' : 'bg-amber-50 border border-amber-200'
                        }`}>
                          {effectiveImage ? (
                            <img
                              src={effectiveImage}
                              alt=""
                              className="w-full h-full object-contain p-0.5"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Product name + status badges + mobile brand/category */}
                      <td className="px-4 py-2.5 max-w-[220px]">
                        <p className="font-semibold text-gray-900 leading-snug line-clamp-1">{product.name}</p>

                        {/* Mobile: brand + category inline */}
                        <div className="md:hidden mt-0.5 space-y-0.5">
                          {brandName && (
                            <p className="text-[11px] text-gray-500">
                              <span className="font-medium text-gray-600">Brand:</span>{' '}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {brandName}
                              </span>
                            </p>
                          )}
                          {categoryName && (
                            <p className="text-[11px] text-gray-400">{categoryName}</p>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            product.approval_status === 'approved' ? 'bg-green-100 text-green-700'
                            : product.approval_status === 'rejected' ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                            {product.approval_status}
                          </span>
                          {product.approval_status === 'approved' && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              product.visibility_status ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {product.visibility_status ? 'visible' : 'hidden'}
                            </span>
                          )}
                          {/* Missing fields warning badge */}
                          {missing.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600">
                              <AlertCircle className="w-2.5 h-2.5" />
                              incomplete
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Brand — desktop */}
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {brandName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {brandName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">No Brand</span>
                        )}
                      </td>

                      {/* Category — desktop only */}
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{categoryName ?? '—'}</span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-sm font-medium ${product.price > 0 ? 'text-gray-900' : 'text-red-400'}`}>
                          {product.price > 0 ? `£${product.price.toFixed(2)}` : 'No price'}
                        </span>
                      </td>

                      {/* Missing fields */}
                      <td className="px-4 py-2.5 hidden xl:table-cell">
                        {missing.length === 0 ? (
                          <span className="text-xs text-green-600 font-medium">Complete</span>
                        ) : (
                          <span className="text-xs text-amber-600">{missing.join(', ')}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditProduct(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {product.approval_status !== 'approved' && (
                            <div className="relative group">
                              <button
                                onClick={() => handleApprove(product)}
                                disabled={isActioning || !canApprove}
                                title={approveTooltip}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  canApprove
                                    ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    : 'text-gray-200 cursor-not-allowed bg-gray-50'
                                } disabled:opacity-50`}
                              >
                                {isActioning
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              {/* Tooltip for missing fields */}
                              {!canApprove && (
                                <div className="absolute bottom-full right-0 mb-1.5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-gray-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap max-w-[220px] shadow-lg">
                                    <p className="font-semibold mb-0.5">Cannot approve</p>
                                    <p className="opacity-80">Missing: {missing.join(', ')}</p>
                                  </div>
                                  <div className="w-2 h-2 bg-gray-900 rotate-45 ml-auto mr-2 -mt-1" />
                                </div>
                              )}
                            </div>
                          )}

                          {product.approval_status !== 'rejected' && (
                            <button
                              onClick={() => handleReject(product)}
                              disabled={isActioning}
                              title="Reject"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {product.approval_status !== 'draft' && (
                            <button
                              onClick={() => handleMoveToDraft(product)}
                              disabled={isActioning}
                              title="Move to draft"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {product.approval_status === 'approved' && (
                            <button
                              onClick={() => handleToggleVisibility(product)}
                              disabled={actionLoading === product.id + '-vis'}
                              title={product.visibility_status ? 'Hide from storefront' : 'Show on storefront'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                product.visibility_status
                                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {actionLoading === product.id + '-vis'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : product.visibility_status
                                  ? <Eye className="w-3.5 h-3.5" />
                                  : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Diagnostics button — shown when last action on this product failed */}
                          {diagnostics?.productName === product.name && (
                            <button
                              onClick={() => setDiagnostics(diagnostics)}
                              title="View error details"
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && total > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {total.toLocaleString()} product{total !== 1 ? 's' : ''}
              {brandFilter && <span className="ml-1 text-gray-400">· filtered by brand: <span className="font-medium text-gray-600">{brandFilter}</span></span>}
            </p>
            {(search || brandFilter) && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); setBrandFilter(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editProduct && (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
