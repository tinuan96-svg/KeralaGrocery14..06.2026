'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import {
  Zap, RefreshCw, CircleCheck as CheckCircle2, Clock, RotateCcw,
  SquareSplitHorizontal as SplitSquareHorizontal, Play, Layers,
  ChartBar as BarChart2, ChevronLeft, ChevronRight, Sparkles,
  ShieldAlert, Star, Upload, X, Search, ImagePlus,
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PAGE_SIZE = 20;
const POLL_MAX = 30; // 30 × 2s = 60s timeout

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

type QualityDetails = {
  sharpness:            number;
  exposure:             number;
  background:           number;
  centering?:           number;
  readability?:         number;
  packaging_visibility?: number;
  resolution:           number;
  overall:              number;
};

type ProcessingJob = {
  id: string;
  product_id: string | null;
  triggered_by: string | null;
  processing_method: string;
  status: JobStatus;
  quality_score_before: number | null;
  quality_score_after: number | null;
  quality_details: QualityDetails | null;
  input_image_url: string | null;
  output_image_url: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
};

type Product = {
  id: string;
  display_title: string;
  image_url: string | null;
  image_quality_score: number | null;
  processing_method: string | null;
  slug: string | null;
};

type Stats = { total: number; completed: number; failed: number; pending: number; processing: number };

// ── Quality helpers ───────────────────────────────────────────────────────────
function getQualityTier(score: number | null): { label: string; icon: string; cls: string; bar: string } {
  if (score === null) return { label: 'Not scored', icon: '—', cls: 'bg-gray-100 text-gray-400', bar: 'bg-gray-200' };
  if (score >= 80) return { label: 'Premium Ready',          icon: '✓', cls: 'bg-green-100 text-green-700',  bar: 'bg-green-500' };
  if (score >= 70) return { label: 'Needs Improvement',       icon: '⚠', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' };
  return              { label: 'Recommend AI Enhancement', icon: '⚠', cls: 'bg-red-100 text-red-700',     bar: 'bg-red-400' };
}

function QualityBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const tier = getQualityTier(score);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.cls}`}>
      <Star className="w-2.5 h-2.5" />{score} — {tier.label}
    </span>
  );
}

function QualityBar({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return null;
  const tier = getQualityTier(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className={`text-[10px] font-bold ${tier.cls.split(' ')[1]}`}>{value}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed:  { label: 'Completed',  cls: 'bg-green-100 text-green-700' },
  failed:     { label: 'Failed',     cls: 'bg-red-100 text-red-700' },
  processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  pending:    { label: 'Pending',    cls: 'bg-gray-100 text-gray-500' },
};

const METHOD_BADGE: Record<string, { label: string; cls: string }> = {
  standard_pipeline: { label: 'Standard Pipeline', cls: 'bg-teal-50 text-teal-700' },
  ai_enhanced:       { label: 'AI Enhanced',       cls: 'bg-amber-50 text-amber-700' },
};

type TabKey = 'upload' | 'products' | 'jobs' | 'status';

type UploadResult = {
  originalUrl: string;
  processedUrl: string | null;
  qualityScore: number | null;
  jobId: string | null;
  done: boolean;
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImageProcessingPage() {
  const [tab, setTab] = useState<TabKey>('upload');

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [productStats, setProductStats] = useState<{ total: number; unprocessed: number; low_quality: number } | null>(null);

  // ── Jobs tab ──────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewJob, setPreviewJob] = useState<ProcessingJob | null>(null);

  // ── Products tab ──────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productFilter, setProductFilter] = useState<'all' | 'low_quality' | 'unprocessed'>('all');
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<string | null>(null);
  const [normalizeProgress, setNormalizeProgress] = useState<{ processed: number; normalized: number; failed: number } | null>(null);

  // ── Upload tab ────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [uploadProduct, setUploadProduct] = useState<Product | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: jobData }, { count: total }, { count: unprocessed }, { count: lowCount }] = await Promise.all([
      supabase.from('image_processing_jobs').select('status'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).is('processing_method', null),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).not('image_quality_score', 'is', null).lt('image_quality_score', 80),
    ]);
    if (jobData) {
      const s: Stats = { total: jobData.length, completed: 0, failed: 0, pending: 0, processing: 0 };
      for (const j of jobData as { status: string }[]) {
        const k = j.status as keyof Stats;
        if (k in s) (s as Record<string, number>)[k]++;
      }
      setStats(s);
    }
    setProductStats({ total: total ?? 0, unprocessed: unprocessed ?? 0, low_quality: lowCount ?? 0 });
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    const supabase = getSupabase();
    const from = (jobsPage - 1) * PAGE_SIZE;
    let q = supabase.from('image_processing_jobs').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, count } = await q;
    setJobs((data as ProcessingJob[]) ?? []);
    setJobsTotal(count ?? 0);
    setJobsLoading(false);
  }, [jobsPage, statusFilter]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    const supabase = getSupabase();
    const from = (productsPage - 1) * PAGE_SIZE;
    let q = supabase.from('products')
      .select('id, display_title, image_url, image_quality_score, processing_method, slug', { count: 'exact' })
      .eq('is_active', true).order('image_quality_score', { ascending: true, nullsFirst: true })
      .range(from, from + PAGE_SIZE - 1);
    if (productFilter === 'unprocessed') q = q.is('processing_method', null);
    if (productFilter === 'low_quality') q = q.not('image_quality_score', 'is', null).lt('image_quality_score', 80);
    const { data, count } = await q;
    setProducts((data as Product[]) ?? []);
    setProductsTotal(count ?? 0);
    setProductsLoading(false);
  }, [productsPage, productFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'jobs') fetchJobs(); }, [tab, fetchJobs]);
  useEffect(() => { if (tab === 'products') fetchProducts(); }, [tab, fetchProducts]);

  // ── Product search (Upload tab) ───────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim() || uploadProduct) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const supabase = getSupabase();
      const { data } = await supabase.from('products')
        .select('id, display_title, image_url, image_quality_score, processing_method, slug')
        .eq('is_active', true)
        .ilike('display_title', `%${productSearch.trim()}%`)
        .limit(8);
      setSearchResults((data as Product[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, uploadProduct]);

  // ── File picker helpers ───────────────────────────────────────────────────
  const setFile = (f: File) => {
    setUploadFile(f);
    setUploadResult(null);
    const objectUrl = URL.createObjectURL(f);
    setUploadPreviewUrl(objectUrl);
  };

  const clearUploadFile = () => {
    setUploadFile(null);
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadPreviewUrl(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Poll job until done ───────────────────────────────────────────────────
  const pollJob = useCallback(async (jobId: string, originalUrl: string, attempt = 0) => {
    if (attempt >= POLL_MAX) {
      setUploadResult(r => r ? { ...r, done: true } : null);
      return;
    }
    const supabase = getSupabase();
    const { data } = await supabase.from('image_processing_jobs')
      .select('status, output_image_url, quality_score_after')
      .eq('id', jobId)
      .maybeSingle();
    if (data?.status === 'completed' || data?.status === 'failed') {
      setUploadResult({
        originalUrl,
        processedUrl: data.output_image_url ?? null,
        qualityScore: data.quality_score_after ?? null,
        jobId,
        done: true,
      });
      fetchStats();
    } else {
      pollRef.current = setTimeout(() => pollJob(jobId, originalUrl, attempt + 1), 2000);
    }
  }, [fetchStats]);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // ── Upload & Process ──────────────────────────────────────────────────────
  const handleUploadAndProcess = async () => {
    if (!uploadProduct || !uploadFile) return;
    setUploadProcessing(true);
    setUploadResult(null);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload raw file to Supabase storage
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const storagePath = `raw/${uploadProduct.id}/upload_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(storagePath, uploadFile, { contentType: uploadFile.type, upsert: true });
      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
      const rawUrl = urlData.publicUrl;

      // Update product original_image_url (if column exists)
      await supabase.from('products').update({ image_url: rawUrl }).eq('id', uploadProduct.id);

      // Start standardization job
      const res = await fetch(`${SUPABASE_URL}/functions/v1/standardize-product-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: uploadProduct.id, image_url: rawUrl, triggered_by: session.user.id }),
      });
      const data = await res.json();
      if (!data.job_id) throw new Error(data.error ?? 'No job_id returned');

      // Show "processing" state and start polling
      setUploadResult({ originalUrl: rawUrl, processedUrl: null, qualityScore: null, jobId: data.job_id, done: false });
      pollJob(data.job_id, rawUrl);
      setUploadProduct(prev => prev ? { ...prev, image_url: rawUrl } : null);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadProcessing(false);
    }
  };

  const handleStandardize = async (product: Product) => {
    if (!product.image_url) return;
    setReprocessing(product.id);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/standardize-product-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, image_url: product.image_url, triggered_by: session?.user?.id }),
      });
      setTimeout(() => { fetchProducts(); fetchStats(); }, 2000);
    } finally { setReprocessing(null); }
  };

  const handleEnhanceWithAI = async (product: Product) => {
    if (!product.image_url) return;
    setEnhancing(product.id);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/enhance-product-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, image_url: product.image_url }),
      });
      setTimeout(() => { fetchProducts(); fetchStats(); }, 3000);
    } finally { setEnhancing(null); }
  };

  const handleReprocessJob = async (job: ProcessingJob) => {
    if (!job.product_id || !job.input_image_url) return;
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${SUPABASE_URL}/functions/v1/standardize-product-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: job.product_id, image_url: job.input_image_url, triggered_by: session?.user?.id }),
    });
    setTimeout(() => { fetchJobs(); fetchStats(); }, 2000);
  };

  const handleRunBackfill = async () => {
    setRunning(true); setRunResult(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-process-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      setRunResult(`Queued ${data.processed ?? data.count ?? 0} images.`);
      await fetchStats();
    } catch (err) {
      setRunResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunning(false);
  };

  const handleNormalizeAll = async (force = false) => {
    setNormalizing(true); setNormalizeResult(null); setNormalizeProgress(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/normalize-all-products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20, force }),
      });
      const data = await res.json();
      if (data.success) {
        setNormalizeProgress({ processed: data.processed, normalized: data.normalized, failed: data.failed });
        setNormalizeResult(
          data.processed === 0
            ? 'All products are already normalized.'
            : `Done: ${data.normalized} normalized, ${data.failed} failed out of ${data.processed} processed.`
        );
      } else { setNormalizeResult(`Error: ${data.error}`); }
      await fetchStats();
    } catch (err) {
      setNormalizeResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setNormalizing(false);
  };

  const jobsTotalPages = Math.ceil(jobsTotal / PAGE_SIZE);
  const productsTotalPages = Math.ceil(productsTotal / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Product Photography</h1>
            <p className="text-sm text-gray-500">Premium studio quality — white background, shadow, consistent scale</p>
          </div>
        </div>
        <button
          onClick={() => { fetchStats(); if (tab === 'jobs') fetchJobs(); if (tab === 'products') fetchProducts(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-5">
          {[
            { label: 'Total Jobs',  value: stats.total,      cls: 'bg-gray-50 text-gray-700' },
            { label: 'Completed',  value: stats.completed,  cls: 'bg-green-50 text-green-700' },
            { label: 'Processing', value: stats.processing, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Failed',     value: stats.failed,     cls: 'bg-red-50 text-red-700' },
            { label: 'Pending',    value: stats.pending,    cls: 'bg-gray-50 text-gray-500' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.cls}`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Product coverage + bulk actions ── */}
      {productStats && (
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Catalog Coverage</p>
              <p className="text-xs text-gray-500 mt-0.5">{productStats.total} active products</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{productStats.unprocessed}</p>
                <p className="text-[10px] text-gray-500">Unprocessed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{productStats.low_quality}</p>
                <p className="text-[10px] text-gray-500">Score &lt;80</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  {Math.max(0, productStats.total - productStats.unprocessed - productStats.low_quality)}
                </p>
                <p className="text-[10px] text-gray-500">Premium Ready</p>
              </div>
            </div>
          </div>

          {normalizeProgress && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Processed',  value: normalizeProgress.processed,  cls: 'bg-gray-50 text-gray-700' },
                { label: 'Normalized', value: normalizeProgress.normalized, cls: 'bg-green-50 text-green-700' },
                { label: 'Failed',     value: normalizeProgress.failed,     cls: normalizeProgress.failed > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg px-3 py-2 text-center ${s.cls}`}>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] font-medium opacity-70">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {normalizeResult && <p className="mb-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{normalizeResult}</p>}
          {runResult && <p className="mb-3 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">{runResult}</p>}

          <div className="flex gap-2 flex-wrap">
            {productStats.unprocessed > 0 && (
              <button onClick={handleRunBackfill} disabled={running}
                className="flex items-center gap-1.5 text-sm px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {running ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running…</> : <><Play className="w-3.5 h-3.5" /> Process next 10</>}
              </button>
            )}
            <button onClick={() => handleNormalizeAll(false)} disabled={normalizing}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {normalizing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Normalizing…</> : <><Layers className="w-3.5 h-3.5" /> Normalize Pending (×20)</>}
            </button>
            <button onClick={() => handleNormalizeAll(true)} disabled={normalizing}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Force Reprocess All (×20)
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {([
          { key: 'upload',   label: 'Upload & Process' },
          { key: 'products', label: 'Product Quality' },
          { key: 'jobs',     label: `Jobs (${stats?.total ?? 0})` },
          { key: 'status',   label: 'How It Works' },
        ] as { key: TabKey; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ UPLOAD TAB ══════════════════ */}
      {tab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: input controls */}
          <div className="space-y-4">
            {/* Step 1: Select product */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Select Product</p>
              {uploadProduct ? (
                <div className="flex items-center gap-3 p-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border flex-shrink-0">
                    {uploadProduct.image_url
                      ? <img src={uploadProduct.image_url} alt="" className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-gray-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{uploadProduct.display_title}</p>
                    {uploadProduct.image_quality_score !== null && (
                      <QualityBadge score={uploadProduct.image_quality_score} />
                    )}
                  </div>
                  <button onClick={() => { setUploadProduct(null); setProductSearch(''); clearUploadFile(); }}
                    className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" placeholder="Search by product name…"
                    value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none" />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => { setUploadProduct(p); setProductSearch(p.display_title); setSearchResults([]); }}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                            {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-contain" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.display_title}</p>
                            {p.image_quality_score !== null && (
                              <span className={`text-[9px] font-bold ${getQualityTier(p.image_quality_score).cls} px-1.5 py-px rounded-full`}>
                                {p.image_quality_score} — {getQualityTier(p.image_quality_score).label}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Upload image */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Upload Image</p>
              <div
                className={[
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden',
                  uploadPreviewUrl ? 'border-green-300 bg-green-50 h-48' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 h-36',
                  dragOver ? 'border-green-400 bg-green-50 scale-[1.01]' : '',
                ].join(' ')}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              >
                {uploadPreviewUrl ? (
                  <>
                    <img src={uploadPreviewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-3" />
                    <button
                      onClick={e => { e.stopPropagation(); clearUploadFile(); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center hover:bg-red-50 transition-colors z-10"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <span className="text-[10px] bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded text-gray-500">{uploadFile?.name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 font-medium">Click or drag to upload</span>
                    <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 10MB</span>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              </div>
            </div>

            {/* Step 3: Process */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 3 — Process</p>
              <button
                onClick={handleUploadAndProcess}
                disabled={!uploadProduct || !uploadFile || uploadProcessing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {uploadProcessing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading &amp; Processing…</>
                  : <><Zap className="w-4 h-4" /> Upload &amp; Standardize</>
                }
              </button>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Removes background · Adds studio lighting · Generates 4 WebP sizes
              </p>
            </div>
          </div>

          {/* Right: result */}
          <div className="space-y-4">
            {!uploadResult && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center h-64 text-center p-6">
                <ImagePlus className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">Processed result will appear here</p>
                <p className="text-xs text-gray-300 mt-1">Select a product, upload an image, and click Process</p>
              </div>
            )}

            {uploadResult && (
              <>
                {/* Before / After */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Before / After</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold mb-1.5 text-center">ORIGINAL</p>
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border">
                        <img src={uploadResult.originalUrl} alt="Original" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold mb-1.5 text-center">PROCESSED</p>
                      <div className="aspect-square bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center">
                        {uploadResult.processedUrl ? (
                          <img src={uploadResult.processedUrl} alt="Processed" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-green-400 animate-spin" />
                            <span className="text-[10px] text-gray-400">Processing…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality score */}
                {uploadResult.qualityScore !== null && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quality Score</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-extrabold text-gray-900">{uploadResult.qualityScore}</span>
                        <span className="text-sm text-gray-400">/100</span>
                      </div>
                    </div>
                    <QualityBadge score={uploadResult.qualityScore} />
                    {uploadResult.qualityScore < 80 && uploadProduct && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs text-amber-700 font-medium mb-2">
                          Score below 80 — AI enhancement recommended
                        </p>
                        <button
                          onClick={() => handleEnhanceWithAI(uploadProduct)}
                          disabled={enhancing === uploadProduct.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {enhancing === uploadProduct.id
                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Enhancing…</>
                            : <><Sparkles className="w-3 h-3" /> Enhance With AI</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reprocess */}
                {uploadResult.done && uploadProduct && (
                  <button
                    onClick={() => { clearUploadFile(); setUploadProduct(null); setProductSearch(''); }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
                  >
                    Process another image
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ PRODUCTS TAB ══════════════════ */}
      {tab === 'products' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {([
              { key: 'all',         label: 'All Products' },
              { key: 'unprocessed', label: 'Not Yet Processed' },
              { key: 'low_quality', label: 'Score < 80' },
            ] as { key: typeof productFilter; label: string }[]).map(f => (
              <button key={f.key} onClick={() => { setProductFilter(f.key); setProductsPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  productFilter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {productsLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No products in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(product => {
                const score = product.image_quality_score;
                const tier = getQualityTier(score);
                const needsAI = score !== null && score < 80;
                const methodBadge = product.processing_method
                  ? (METHOD_BADGE[product.processing_method] ?? METHOD_BADGE.standard_pipeline) : null;

                return (
                  <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 hover:border-gray-300 transition-colors">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border flex-shrink-0">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.display_title} className="w-full h-full object-contain" loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <div className="w-full h-full flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-gray-300" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.display_title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {methodBadge
                          ? <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${methodBadge.cls}`}>{methodBadge.label}</span>
                          : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Not processed</span>
                        }
                        {score !== null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tier.cls}`}>
                            {score} — {tier.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleStandardize(product)}
                        disabled={reprocessing === product.id || !product.image_url}
                        className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors font-medium">
                        {reprocessing === product.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Standardize
                      </button>
                      <button onClick={() => handleEnhanceWithAI(product)}
                        disabled={enhancing === product.id || !product.image_url || (!needsAI && score !== null)}
                        title={!needsAI && score !== null ? `Score ${score} already ≥80` : 'OpenAI enhancement (uses API credits)'}
                        className={[
                          'text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40',
                          needsAI || score === null ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border border-gray-200 text-gray-400 cursor-not-allowed',
                        ].join(' ')}>
                        {enhancing === product.id
                          ? <><RefreshCw className="w-3 h-3 animate-spin" /> Enhancing…</>
                          : <><Sparkles className="w-3 h-3" /> Enhance With AI</>
                        }
                      </button>
                    </div>
                  </div>
                );
              })}

              {productsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">
                    {(productsPage - 1) * PAGE_SIZE + 1}–{Math.min(productsPage * PAGE_SIZE, productsTotal)} of {productsTotal}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setProductsPage(p => Math.min(productsTotalPages, p + 1))} disabled={productsPage === productsTotalPages} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ JOBS TAB ══════════════════ */}
      {tab === 'jobs' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'completed', 'processing', 'failed', 'pending'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setJobsPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                  statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {jobsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No jobs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => {
                const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                const methodBadge = METHOD_BADGE[job.processing_method] ?? METHOD_BADGE.standard_pipeline;
                return (
                  <div key={job.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-4 p-4">
                      <div className="flex-shrink-0 flex gap-2">
                        {job.input_image_url && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border">
                            <img src={job.input_image_url} alt="In" className="w-full h-full object-cover" loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        {job.output_image_url && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border">
                            <img src={job.output_image_url} alt="Out" className="w-full h-full object-contain" loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodBadge.cls}`}>{methodBadge.label}</span>
                          {job.quality_score_after !== null && <QualityBadge score={job.quality_score_after} />}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono truncate">{job.product_id ?? 'No product'}</p>
                        {job.error_message && <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{job.error_message}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {job.output_image_url && (
                            <button onClick={() => setPreviewJob(job)}
                              className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                              <SplitSquareHorizontal className="w-3 h-3" /> Before / After
                            </button>
                          )}
                          {job.product_id && job.input_image_url && (
                            <button onClick={() => handleReprocessJob(job)}
                              className="text-xs flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                              <RotateCcw className="w-3 h-3" /> Reprocess
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 text-xs text-gray-400 space-y-0.5">
                        {job.duration_ms && <p>{(job.duration_ms / 1000).toFixed(1)}s</p>}
                        <p>{new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {jobsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">{(jobsPage - 1) * PAGE_SIZE + 1}–{Math.min(jobsPage * PAGE_SIZE, jobsTotal)} of {jobsTotal}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setJobsPage(p => Math.max(1, p - 1))} disabled={jobsPage === 1} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setJobsPage(p => Math.min(jobsTotalPages, p + 1))} disabled={jobsPage === jobsTotalPages} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ HOW IT WORKS TAB ══════════════════ */}
      {tab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Zap className="w-5 h-5 text-green-600" />, title: 'Storage Webhook', desc: 'Auto-triggers on any upload to the product-images bucket.', status: 'Active', cls: 'text-green-600 bg-green-50' },
              { icon: <Clock className="w-5 h-5 text-blue-600" />, title: 'Backfill Cron', desc: 'Runs every 15 minutes — processes up to 10 unprocessed products per cycle.', status: 'Scheduled', cls: 'text-blue-600 bg-blue-50' },
              { icon: <Sparkles className="w-5 h-5 text-amber-600" />, title: 'AI Enhancement', desc: 'OpenAI gpt-image-1. Only triggered for quality score < 80 or manually by admin.', status: 'On-demand', cls: 'text-amber-600 bg-amber-50' },
            ].map(card => (
              <div key={card.title} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">{card.icon}</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.cls}`}>{card.status}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{card.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Standard Pipeline Steps</p>
            <ol className="space-y-2 text-xs text-gray-600">
              {[
                ['1.', 'Download source image from URL'],
                ['2.', 'Trim near-white / transparent background borders (Sharp trim)'],
                ['3.', 'Scale product to 80% of 1200×1200 canvas height — small products scale up, large scale down'],
                ['4.', 'Apply mild sharpening + 2% brightness + 6% saturation boost'],
                ['5.', 'Composite: white canvas → soft drop shadow → product → studio lighting gradient → watermark'],
                ['6.', 'Generate 4 WebP output sizes: 1200px (master), 600px (catalog), 400px (mobile), 200px (thumbnail)'],
                ['7.', 'Compute 6-metric quality score: Sharpness, Exposure, Background, Centering, Readability, Packaging Visibility'],
                ['8.', 'Update product record with processed URL + quality score'],
              ].map(([n, t]) => (
                <li key={n} className="flex gap-2">
                  <span className="font-bold text-green-600 w-4 flex-shrink-0">{n}</span> {t}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quality Score Thresholds</p>
            <div className="space-y-2">
              {[
                { range: '80–100', label: 'Premium Ready',            cls: 'bg-green-100 text-green-700', desc: 'Meets Waitrose/Ocado standard. No action needed.' },
                { range: '70–79', label: 'Needs Improvement',          cls: 'bg-amber-100 text-amber-700', desc: 'Acceptable but benefits from standardization.' },
                { range: '0–69',  label: 'Recommend AI Enhancement', cls: 'bg-red-100 text-red-700',    desc: 'Quality below threshold. Use "Enhance With AI".' },
              ].map(t => (
                <div key={t.range} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${t.cls}`}>{t.range}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ BEFORE / AFTER MODAL ══════════════════ */}
      {previewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setPreviewJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Before / After</h2>
              <button onClick={() => setPreviewJob(null)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">Original</p>
                  <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border">
                    {previewJob.input_image_url
                      ? <img src={previewJob.input_image_url} alt="Original" className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No input</div>
                    }
                  </div>
                  {previewJob.quality_score_before !== null && (
                    <p className="text-xs text-center mt-1.5"><QualityBadge score={previewJob.quality_score_before} /></p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">Processed</p>
                  <div className="aspect-square bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-200">
                    {previewJob.output_image_url
                      ? <img src={previewJob.output_image_url} alt="Processed" className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No output yet</div>
                    }
                  </div>
                  {previewJob.quality_score_after !== null && (
                    <p className="text-xs text-center mt-1.5"><QualityBadge score={previewJob.quality_score_after} /></p>
                  )}
                </div>
              </div>

              {previewJob.quality_details && (
                <div className="mb-4 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quality Breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    <QualityBar label="Sharpness"            value={previewJob.quality_details.sharpness} />
                    <QualityBar label="Exposure"             value={previewJob.quality_details.exposure} />
                    <QualityBar label="Background Quality"   value={previewJob.quality_details.background} />
                    <QualityBar label="Centering"            value={previewJob.quality_details.centering} />
                    <QualityBar label="Readability"          value={previewJob.quality_details.readability} />
                    <QualityBar label="Packaging Visibility" value={previewJob.quality_details.packaging_visibility} />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs space-y-1 text-gray-600">
                <p><span className="font-medium">Method:</span> {previewJob.processing_method}</p>
                <p><span className="font-medium">Status:</span> {previewJob.status}</p>
                {previewJob.duration_ms && <p><span className="font-medium">Duration:</span> {(previewJob.duration_ms / 1000).toFixed(2)}s</p>}
                {previewJob.error_message && <p className="text-red-500"><span className="font-medium">Error:</span> {previewJob.error_message}</p>}
              </div>

              <div className="flex gap-3 justify-end">
                {previewJob.product_id && previewJob.input_image_url && (
                  <button onClick={() => { handleReprocessJob(previewJob); setPreviewJob(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Reprocess
                  </button>
                )}
                <button onClick={() => setPreviewJob(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
