'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Cpu, CircleCheck as CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Play, Eye, Trash2, CircleAlert as AlertCircle, Zap } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PAGE_SIZE = 20;

type Job = {
  id: string;
  image_path: string;
  image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate' | 'skipped';
  product_id: string | null;
  extracted_data: Record<string, string | null> | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

type ReviewProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  brand: string | null;
  category_id: string | null;
  is_active: boolean | null;
  review_required: boolean;
  admin_notes: string | null;
  ingestion_job_id: string | null;
};

type Stats = {
  total: number;
  completed: number;
  failed: number;
  duplicate: number;
  skipped: number;
  pending: number;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  duplicate: { label: 'Duplicate', cls: 'bg-amber-100 text-amber-700' },
  skipped: { label: 'Skipped', cls: 'bg-gray-100 text-gray-600' },
  processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-500' },
};

export default function IngestionPage() {
  const [tab, setTab] = useState<'review' | 'jobs' | 'run'>('review');

  // --- Review Queue ---
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productLoading, setProductLoading] = useState(true);
  const [editing, setEditing] = useState<ReviewProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Jobs ---
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobPage, setJobPage] = useState(1);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobLoading, setJobLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // --- Run ---
  const [running, setRunning] = useState(false);
  const [runLimit, setRunLimit] = useState(10);
  const [runFolder, setRunFolder] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);

  const fetchProducts = useCallback(async () => {
    setProductLoading(true);
    const supabase = getSupabase();
    const from = (productPage - 1) * PAGE_SIZE;
    const { data, count } = await supabase
      .from('products')
      .select('id, name, slug, description, image_url, brand, category_id, is_active, review_required, admin_notes, ingestion_job_id', { count: 'exact' })
      .eq('review_required', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    setProducts((data as ReviewProduct[]) ?? []);
    setProductTotal(count ?? 0);
    setProductLoading(false);
  }, [productPage]);

  const fetchJobs = useCallback(async () => {
    setJobLoading(true);
    const supabase = getSupabase();
    const from = (jobPage - 1) * PAGE_SIZE;
    let q = supabase
      .from('ingestion_jobs')
      .select('id, image_path, image_url, status, product_id, extracted_data, error_message, created_at, processed_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, count } = await q;
    setJobs((data as Job[]) ?? []);
    setJobTotal(count ?? 0);

    // Fetch stats
    const { data: allJobs } = await supabase
      .from('ingestion_jobs')
      .select('status');
    if (allJobs) {
      const s: Stats = { total: allJobs.length, completed: 0, failed: 0, duplicate: 0, skipped: 0, pending: 0 };
      for (const j of allJobs as { status: string }[]) {
        if (j.status in s) (s as Record<string, number>)[j.status]++;
      }
      setStats(s);
    }
    setJobLoading(false);
  }, [jobPage, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (tab === 'jobs') fetchJobs(); }, [tab, fetchJobs]);

  const handlePublish = async (product: ReviewProduct) => {
    setPublishingId(product.id);
    const supabase = getSupabase();
    await supabase
      .from('products')
      .update({ is_active: true, review_required: false })
      .eq('id', product.id);
    await fetchProducts();
    setPublishingId(null);
  };

  const handleDelete = async (product: ReviewProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product.id);
    const supabase = getSupabase();
    await supabase.from('products').update({ is_deleted: true, review_required: false }).eq('id', product.id);
    await fetchProducts();
    setDeletingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = getSupabase();
    await supabase.from('products').update({
      name: editing.name,
      description: editing.description,
      brand: editing.brand,
    }).eq('id', editing.id);
    setEditing(null);
    await fetchProducts();
    setSaving(false);
  };

  const handleRunIngestion = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const session = await getSupabase().auth.getSession();
      const token = session.data.session?.access_token ?? ANON_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-ingest-images`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: runLimit,
          folder: runFolder || undefined,
          dry_run: dryRun,
        }),
      });
      const data = await res.json();
      setRunResult(data);
      if (!dryRun) { await fetchProducts(); if (tab === 'jobs') await fetchJobs(); }
    } catch (err) {
      setRunResult({ error: err instanceof Error ? err.message : String(err) });
    }
    setRunning(false);
  };

  const productPages = Math.ceil(productTotal / PAGE_SIZE);
  const jobPages = Math.ceil(jobTotal / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Product Ingestion</h1>
            <p className="text-sm text-gray-500">Scan images, generate products, review before publishing</p>
          </div>
        </div>
        <button
          onClick={() => { fetchProducts(); if (tab === 'jobs') fetchJobs(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'review', label: `Review Queue (${productTotal})` },
          { key: 'jobs', label: 'Job History' },
          { key: 'run', label: 'Run Ingestion' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── REVIEW QUEUE ── */}
      {tab === 'review' && (
        <div>
          {productLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Review queue is empty</p>
              <p className="text-sm text-gray-400 mt-1">Run ingestion to scan bucket images</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {editing?.id === p.id ? (
                    /* Edit mode */
                    <div className="p-4 space-y-3">
                      <div className="flex gap-3">
                        {p.image_url && (
                          <img src={p.image_url} alt="" className="w-20 h-20 object-cover rounded-lg border flex-shrink-0" />
                        )}
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Product Name</label>
                            <input
                              value={editing.name}
                              onChange={e => setEditing({ ...editing, name: e.target.value })}
                              className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Brand</label>
                            <input
                              value={editing.brand ?? ''}
                              onChange={e => setEditing({ ...editing, brand: e.target.value })}
                              className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Description</label>
                            <textarea
                              value={editing.description ?? ''}
                              onChange={e => setEditing({ ...editing, description: e.target.value })}
                              rows={2}
                              className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                            {p.brand && <p className="text-xs text-gray-500 mt-0.5">{p.brand}</p>}
                            {p.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.description}</p>}
                          </div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Needs Review</span>
                        </div>
                        {p.admin_notes && (
                          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">{p.admin_notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => setEditing(p)}
                            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handlePublish(p)}
                            disabled={publishingId === p.id}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-1"
                          >
                            {publishingId === p.id ? 'Publishing…' : <><Eye className="w-3 h-3" /> Publish</>}
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors font-medium flex items-center gap-1"
                          >
                            {deletingId === p.id ? 'Deleting…' : <><Trash2 className="w-3 h-3" /> Delete</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {productPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">
                    {(productPage - 1) * PAGE_SIZE + 1}–{Math.min(productPage * PAGE_SIZE, productTotal)} of {productTotal}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setProductPage(p => Math.min(productPages, p + 1))} disabled={productPage === productPages} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── JOB HISTORY ── */}
      {tab === 'jobs' && (
        <div>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
              {[
                { label: 'Total', value: stats.total, cls: 'bg-gray-50 text-gray-700' },
                { label: 'Completed', value: stats.completed, cls: 'bg-green-50 text-green-700' },
                { label: 'Failed', value: stats.failed, cls: 'bg-red-50 text-red-700' },
                { label: 'Duplicate', value: stats.duplicate, cls: 'bg-amber-50 text-amber-700' },
                { label: 'Skipped', value: stats.skipped, cls: 'bg-gray-50 text-gray-600' },
                { label: 'Pending', value: stats.pending, cls: 'bg-blue-50 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'completed', 'failed', 'duplicate', 'skipped', 'pending'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setJobPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                  statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {jobLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No jobs yet. Run ingestion to start.</div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => {
                const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                const extracted = job.extracted_data;
                return (
                  <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                      <img src={job.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                        <span className="text-xs text-gray-500 truncate max-w-xs">{job.image_path}</span>
                      </div>
                      {extracted && (
                        <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                          {extracted.full_name ?? extracted.product_name ?? '—'}
                        </p>
                      )}
                      {job.error_message && (
                        <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{job.error_message}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {job.processed_at && (
                        <p className="text-xs text-gray-400">{new Date(job.processed_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {jobPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">
                    {(jobPage - 1) * PAGE_SIZE + 1}–{Math.min(jobPage * PAGE_SIZE, jobTotal)} of {jobTotal}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setJobPage(p => Math.max(1, p - 1))} disabled={jobPage === 1} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setJobPage(p => Math.min(jobPages, p + 1))} disabled={jobPage === jobPages} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RUN INGESTION ── */}
      {tab === 'run' && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Run Bulk Ingestion</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Batch size</label>
                <p className="text-xs text-gray-400 mb-1.5">Number of images to process (max 50)</p>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={runLimit}
                  onChange={e => setRunLimit(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Folder (optional)</label>
                <p className="text-xs text-gray-400 mb-1.5">Leave blank to scan all folders, or enter &quot;uploads&quot;</p>
                <input
                  type="text"
                  placeholder="e.g. uploads"
                  value={runFolder}
                  onChange={e => setRunFolder(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="dryrun"
                  checked={dryRun}
                  onChange={e => setDryRun(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <label htmlFor="dryrun" className="text-sm font-medium text-amber-800 cursor-pointer">Dry run (preview only)</label>
                  <p className="text-xs text-amber-600">Shows what would be processed without calling OpenAI or creating products</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Each real image costs ~1 OpenAI Vision API call. Images already processed are skipped automatically.
                    Products are created as inactive with <strong>review_required = true</strong> — review them in the queue before publishing.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleRunIngestion}
              disabled={running}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {running ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Play className="w-4 h-4" /> {dryRun ? 'Preview' : 'Run Ingestion'}</>
              )}
            </button>
          </div>

          {/* Results */}
          {runResult && (
            <div className="mt-4 bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono overflow-auto max-h-96">
              <pre>{JSON.stringify(runResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
