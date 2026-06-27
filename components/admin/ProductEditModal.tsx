'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader as Loader2, Check, CircleAlert as AlertCircle, Plus, ExternalLink, Sparkles, RotateCcw, Wand as Wand2, RefreshCw, ArrowRight, TriangleAlert as AlertTriangle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import type { ApprovalProduct, ProductEditPayload } from '@/lib/services/productApprovalService';
import { isMissingRequiredFields } from '@/lib/services/productApprovalService';
import ImageGalleryManager, { type GallerySlot } from '@/components/admin/ImageGalleryManager';
import type { GalleryImage } from '@/lib/types/database';

interface Category { id: string; name: string; slug: string; }

type EnhanceStatus = 'idle' | 'uploading' | 'enhancing' | 'done' | 'failed' | 'ocr_failed' | 'ocr_warning';

interface Props {
  product: ApprovalProduct;
  onClose: () => void;
  onSave: (id: string, payload: ProductEditPayload) => Promise<void>;
}

const TABS = ['Details', 'Pricing', 'SEO', 'Image'] as const;
type Tab = typeof TABS[number];

type AiMode = 'short' | 'full' | 'both';
type AiLoading = AiMode | null;

// Fields that were AI-generated in the current session (not yet saved)
interface AiGenerated {
  shortDescription?: string;
  fullDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

async function callGenerateApi(productId: string, mode: AiMode): Promise<AiGenerated> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-descriptions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, mode }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as AiGenerated;
}

export default function ProductEditModal({ product, onClose, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('Details');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form fields
  const [name, setName] = useState(product.name);
  const [shortDesc, setShortDesc] = useState(product.short_description ?? '');
  const [desc, setDesc] = useState(product.description ?? '');
  const [supplierPrice, setSupplierPrice] = useState(String(product.cost_price ?? product.supplier_price ?? ''));
  const [markup, setMarkup] = useState(String(product.markup_percentage ?? 5));
  const [price, setPrice] = useState(String(product.selling_price ?? product.price ?? ''));
  const [comparePrice, setComparePrice] = useState(String(product.compare_price ?? ''));
  const [categoryId, setCategoryId] = useState(product.category_id ?? '');
  const [isFeatured, setIsFeatured] = useState(product.is_featured ?? false);
  const [isDeal, setIsDeal] = useState(product.is_deal ?? false);
  const [isNewArrival, setIsNewArrival] = useState(product.is_new_arrival ?? false);
  const [isBestseller, setIsBestseller] = useState(product.is_bestseller ?? false);
  const [seoTitle, setSeoTitle] = useState(product.seo_title ?? '');
  const [seoDesc, setSeoDesc] = useState(product.seo_description ?? '');
  const [seoKeywords, setSeoKeywords] = useState(product.seo_keywords ?? '');
  const [tags, setTags] = useState((product.tags ?? []).join(', '));
  const [imageUrl, setImageUrl] = useState(product.image_url ?? product.image_main ?? '');

  // AI generation state
  const [aiLoading, setAiLoading] = useState<AiLoading>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // Pending AI results — shown with confirm/discard UI before overwriting manual content
  const [aiPending, setAiPending] = useState<AiGenerated | null>(null);

  // Image upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [heicConverting, setHeicConverting] = useState(false);
  const [heicReady, setHeicReady] = useState(false);
  const [heicError, setHeicError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

  // AI image enhancement
  const [enhanceStatus, setEnhanceStatus] = useState<EnhanceStatus>('idle');
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(product.enhanced_image_url ?? null);
  const [originalStoredUrl, setOriginalStoredUrl] = useState<string | null>(product.original_image_url ?? null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [ocrMismatch, setOcrMismatch] = useState<number | null>(null);
  // Which image is currently "active" (will be saved as image_url)
  const [activeImageChoice, setActiveImageChoice] = useState<'original' | 'enhanced'>(
    product.enhanced_image_url ? 'enhanced' : 'original'
  );

  // Gallery multi-image state
  const [galleryInitial, setGalleryInitial] = useState<GalleryImage[]>([]);
  const [gallerySlots, setGallerySlots] = useState<GallerySlot[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  // Auto-calculate selling price from supplier price + markup
  const calcSellingPrice = (sp: string, mk: string) => {
    const s = parseFloat(sp);
    const m = parseFloat(mk);
    if (!isNaN(s) && !isNaN(m) && s > 0) {
      return (Math.round(s * (1 + m / 100) * 100) / 100).toFixed(2);
    }
    return '';
  };

  const handleSupplierPriceChange = (val: string) => {
    setSupplierPrice(val);
    const calc = calcSellingPrice(val, markup);
    if (calc) setPrice(calc);
  };

  const handleMarkupChange = (val: string) => {
    setMarkup(val);
    const calc = calcSellingPrice(supplierPrice, val);
    if (calc) setPrice(calc);
  };

  const brandDisplay = product.brand ?? product.source_brand ?? null;
  const effectiveImage = uploadPreview ?? (imageUrl || null);
  const missing = isMissingRequiredFields({
    ...product,
    category_id: categoryId || null,
    image_url: imageUrl || null,
    image_main: null,
    short_description: shortDesc,
    description: desc,
    price: parseFloat(price) || 0,
  });

  const loadCategories = () => {
    setCategoriesLoading(true);
    const supabase = getSupabase();
    supabase.from('categories').select('id, name, slug').order('name').then(({ data }) => {
      setCategories((data ?? []) as Category[]);
      setCategoriesLoading(false);
    });
  };

  useEffect(() => { loadCategories(); }, []);

  // Load gallery images from DB when Image tab is opened
  useEffect(() => {
    if (tab !== 'Image' || galleryLoaded) return;
    const supabase = getSupabase();
    supabase
      .from('product_gallery_images')
      .select('*')
      .eq('product_id', product.id)
      .order('position')
      .then(({ data }) => {
        const rows = (data ?? []) as GalleryImage[];
        setGalleryInitial(rows);
        setGalleryLoaded(true);
      });
  }, [tab, galleryLoaded, product.id]);

  // ── AI generation ─────────────────────────────────────────────────────────

  const handleGenerate = async (mode: AiMode) => {
    setAiLoading(mode);
    setAiError(null);
    setAiPending(null);
    try {
      const result = await callGenerateApi(product.id, mode);

      // If fields are already filled, stage results for confirmation
      const shortFilled = shortDesc.trim().length > 0;
      const fullFilled = desc.trim().length > 0;
      const seoFilled = seoTitle.trim().length > 0 || seoDesc.trim().length > 0;

      const wouldOverwrite =
        (result.shortDescription && shortFilled) ||
        (result.fullDescription && fullFilled) ||
        ((result.seoTitle || result.seoDescription || result.seoKeywords) && seoFilled);

      if (wouldOverwrite) {
        // Stage for admin confirmation
        setAiPending(result);
      } else {
        applyAiResult(result);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiLoading(null);
    }
  };

  const applyAiResult = (result: AiGenerated) => {
    if (result.shortDescription !== undefined) setShortDesc(result.shortDescription);
    if (result.fullDescription !== undefined) setDesc(result.fullDescription);
    if (result.seoTitle !== undefined) setSeoTitle(result.seoTitle);
    if (result.seoDescription !== undefined) setSeoDesc(result.seoDescription);
    if (result.seoKeywords !== undefined) setSeoKeywords(result.seoKeywords);
    setAiPending(null);
  };

  // ── Image upload ──────────────────────────────────────────────────────────

  const isHeic = (file: File) =>
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.type === 'application/octet-stream' ||
    file.type === '' ||
    /\.(heic|heif)$/i.test(file.name);

  const handleFileSelect = async (file: File) => {
    setHeicError(null);
    setHeicReady(false);

    if (file.size > MAX_FILE_BYTES) {
      setHeicError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 20 MB.`);
      return;
    }

    if (isHeic(file)) {
      // Clear any previous selection but keep existing stored preview visible
      setUploadFile(null);
      if (uploadPreview) { URL.revokeObjectURL(uploadPreview); setUploadPreview(null); }
      setHeicConverting(true);
      try {
        const heic2any = (await import('heic2any')).default;
        const result = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95,
        });
        const jpegBlob = Array.isArray(result) ? result[0] : result;
        const jpegFile = new File(
          [jpegBlob],
          file.name.replace(/\.(heic|heif)$/i, '.jpg'),
          { type: 'image/jpeg' }
        );
        // Generate preview from the converted JPEG blob — immediately available
        const previewUrl = URL.createObjectURL(jpegFile);
        setUploadFile(jpegFile);
        setUploadPreview(previewUrl);
        setHeicReady(true);
      } catch (err) {
        setHeicError(
          `HEIC conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}. Try exporting the image as JPEG from your device.`
        );
      } finally {
        setHeicConverting(false);
      }
      return;
    }

    // Standard image — generate preview immediately from the File object
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    const previewUrl = URL.createObjectURL(file);
    setUploadFile(file);
    setUploadPreview(previewUrl);
  };

  const handleUploadImage = async (): Promise<string | null> => {
    if (!uploadFile) return imageUrl || null;
    setUploading(true);
    try {
      const supabase = getSupabase();
      const ext = uploadFile.name.split('.').pop() ?? 'jpg';
      const path = `products/${product.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, uploadFile, { contentType: uploadFile.type || 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  // ── AI Image Enhancement ──────────────────────────────────────────────────

  const isLocalUrl = (url: string) =>
    /localhost|127\.0\.0\.1|0\.0\.0\.0|webcontainer|local-credentialless|\.local\b/i.test(url) ||
    url.startsWith('/') ||
    url.startsWith('data:');

  const handleEnhanceImage = async () => {
    setEnhanceError(null);
    setOcrMismatch(null);

    // If there's a pending upload file, upload it first as the "original"
    let sourceUrl = originalStoredUrl ?? imageUrl;
    if (uploadFile) {
      setEnhanceStatus('uploading');
      try {
        const uploaded = await handleUploadImage();
        if (!uploaded) throw new Error('Upload failed');
        sourceUrl = uploaded;
        setOriginalStoredUrl(uploaded);
        setImageUrl(uploaded);
        // Persist original_image_url immediately
        const supabase = getSupabase();
        await supabase.from('products').update({ original_image_url: uploaded }).eq('id', product.id);
        setUploadFile(null);
        if (uploadPreview) { URL.revokeObjectURL(uploadPreview); setUploadPreview(null); }
      } catch (err) {
        setEnhanceStatus('failed');
        setEnhanceError(err instanceof Error ? err.message : 'Upload failed');
        return;
      }
    }

    if (!sourceUrl) {
      setEnhanceError('Please upload or provide an image first.');
      return;
    }

    // Pre-flight: detect local/sandbox URLs that the edge function cannot reach
    if (isLocalUrl(sourceUrl)) {
      setEnhanceStatus('failed');
      setEnhanceError('This image is stored at a local or sandbox URL that is not publicly accessible. Please re-upload the image file using the upload button above, then try enhancing again.');
      return;
    }

    setEnhanceStatus('enhancing');
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enhance-product-image`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id, imageUrl: sourceUrl }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      if (json.unreachableUrl) {
        setEnhanceStatus('failed');
        setEnhanceError(json.error);
        return;
      }

      if (json.ocrFailed) {
        setEnhanceStatus('ocr_failed');
        setOcrMismatch(json.mismatchPct ?? null);
        setEnhanceError(json.message ?? 'Text integrity check failed.');
        return;
      }

      if (!json.success) throw new Error(json.error ?? 'Enhancement failed');

      setEnhancedUrl(json.enhancedUrl);
      setOcrMismatch(json.mismatchPct ?? null);
      setActiveImageChoice(json.ocrWarning ? 'original' : 'enhanced');
      setEnhanceStatus(json.ocrWarning ? 'ocr_warning' : 'done');
    } catch (err) {
      setEnhanceStatus('failed');
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed');
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Derive primary image from gallery (position 0) if available
      const primarySlot = gallerySlots.find(s => s.position === 0) ?? gallerySlots[0] ?? null;
      let finalImageUrl: string | null = null;
      if (primarySlot) {
        finalImageUrl = primarySlot.previewUrl ?? primarySlot.dbRow?.image_url ?? null;
      } else {
        // Fall back to legacy single-image flow
        finalImageUrl = imageUrl || null;
        if (uploadFile) {
          const uploaded = await handleUploadImage();
          if (uploaded) finalImageUrl = uploaded;
        }
        if (activeImageChoice === 'enhanced' && enhancedUrl) {
          finalImageUrl = enhancedUrl;
        } else if (activeImageChoice === 'original' && (originalStoredUrl || finalImageUrl)) {
          finalImageUrl = originalStoredUrl ?? finalImageUrl;
        }
      }

      const costPrice = parseFloat(supplierPrice) || null;
      const sellingPrice = parseFloat(price) || 0;
      const payload: ProductEditPayload = {
        name: name.trim(),
        short_description: shortDesc.trim() || null,
        description: desc.trim() || null,
        supplier_price: costPrice,
        cost_price: costPrice,
        selling_price: sellingPrice,
        markup_percentage: parseFloat(markup) || 5,
        price: sellingPrice,
        compare_price: comparePrice ? parseFloat(comparePrice) : null,
        category_id: categoryId || null,
        image_url: finalImageUrl,
        image_main: finalImageUrl,
        is_featured: isFeatured,
        is_deal: isDeal,
        is_new_arrival: isNewArrival,
        is_bestseller: isBestseller,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDesc.trim() || null,
        seo_keywords: seoKeywords.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      await onSave(product.id, payload);
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── AI button bar component ───────────────────────────────────────────────

  const AiBar = () => (
    <div className="flex items-center gap-2 flex-wrap p-3 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mr-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        Generate with AI
      </div>
      {([
        { mode: 'short' as AiMode, label: 'Short Description' },
        { mode: 'full' as AiMode, label: 'Full Description' },
        { mode: 'both' as AiMode, label: 'Everything', highlight: true },
      ]).map(({ mode, label, highlight }) => (
        <button
          key={mode}
          type="button"
          onClick={() => handleGenerate(mode)}
          disabled={!!aiLoading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            highlight
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {aiLoading === mode
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Sparkles className="w-3 h-3" />}
          {label}
        </button>
      ))}
      {aiLoading && (
        <span className="text-xs text-gray-400 animate-pulse ml-1">Generating…</span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 text-base truncate">{product.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {brandDisplay && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {brandDisplay}
                </span>
              )}
              <span className="text-xs text-gray-400">Edit product details</span>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="ml-3 text-gray-400 hover:text-gray-700 disabled:opacity-40 flex-shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missing fields warning */}
        {missing.length > 0 && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Required before approval:</span>{' '}
              {missing.join(', ')}
            </p>
          </div>
        )}

        {/* AI error */}
        {aiError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{aiError}</p>
            </div>
            <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* AI pending confirmation */}
        {aiPending && (
          <div className="mx-5 mt-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-semibold text-amber-800">AI generated content ready</p>
              </div>
              <p className="text-[11px] text-amber-600">This will overwrite existing content</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyAiResult(aiPending)}
                className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
              >
                Apply AI Content
              </button>
              <button
                onClick={() => setAiPending(null)}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 mt-3">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Details tab ── */}
          {tab === 'Details' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Brand — read-only */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Brand
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">auto-synced from CentralHub</span>
                </label>
                <div className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500 select-none">
                  {brandDisplay ?? <span className="text-gray-300 italic">No brand in CentralHub</span>}
                </div>
              </div>

              {/* AI bar — above description fields */}
              <AiBar />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Short Description * <span className="text-gray-400 font-normal">(shown on product cards)</span>
                  </label>
                  {shortDesc && (
                    <button
                      type="button"
                      onClick={() => handleGenerate('short')}
                      disabled={!!aiLoading}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Regenerate
                    </button>
                  )}
                </div>
                <textarea
                  value={shortDesc}
                  onChange={e => setShortDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                  placeholder="Click 'Generate with AI' above to auto-generate…"
                />
                <p className="text-[11px] text-gray-400 mt-0.5 text-right">{shortDesc.length} chars</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">Full Description *</label>
                  {desc && (
                    <button
                      type="button"
                      onClick={() => handleGenerate('full')}
                      disabled={!!aiLoading}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Regenerate
                    </button>
                  )}
                </div>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none font-mono"
                  placeholder="HTML content — click 'Generate with AI' above to auto-generate…"
                />
                <p className="text-[11px] text-gray-400 mt-0.5 text-right">{desc.length} chars</p>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Category *</label>
                  <a
                    href="/admin/categories"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 hover:text-green-700"
                  >
                    <Plus className="w-3 h-3" />
                    New Category
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
                    disabled={categoriesLoading}
                  >
                    <option value="">{categoriesLoading ? 'Loading…' : '— Select category —'}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadCategories}
                    disabled={categoriesLoading}
                    title="Refresh categories"
                    className="px-2.5 py-2 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 text-xs"
                  >
                    {categoriesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↻'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Flags</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Featured', value: isFeatured, set: setIsFeatured },
                    { label: 'Deal', value: isDeal, set: setIsDeal },
                    { label: 'New Arrival', value: isNewArrival, set: setIsNewArrival },
                    { label: 'Bestseller', value: isBestseller, set: setIsBestseller },
                  ].map(({ label, value, set }) => (
                    <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={e => set(e.target.checked)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tags <span className="text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="spice, rice, organic"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </>
          )}

          {/* ── Pricing tab ── */}
          {tab === 'Pricing' && (
            <>
              {/* Pricing summary card */}
              {parseFloat(supplierPrice) > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cost Price</p>
                    <p className="text-lg font-bold text-gray-700">£{parseFloat(supplierPrice).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">from CentralHub</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Markup</p>
                    <p className="text-lg font-bold text-amber-700">{parseFloat(markup) || 5}%</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">Applied</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Selling Price</p>
                    <p className="text-lg font-bold text-green-700">£{parseFloat(price) > 0 ? parseFloat(price).toFixed(2) : '—'}</p>
                    <p className="text-[10px] text-green-500 mt-0.5">Shown to customers</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Cost Price (£)
                    <span className="ml-1 text-[10px] font-normal text-gray-400">from CentralHub — never shown to customers</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={supplierPrice}
                    onChange={e => handleSupplierPriceChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Markup %</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={markup}
                      onChange={e => handleMarkupChange(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleMarkupChange('5')}
                      className="px-2.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      title="Reset to default 5%"
                    >
                      5%
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Selling Price (£)
                  <span className="ml-1 text-[10px] font-normal text-gray-400">shown to customers — auto-calculated</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-green-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Compare Price (£) <span className="text-gray-400 font-normal">(was price, shown as crossed-out)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={comparePrice}
                  onChange={e => setComparePrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {parseFloat(comparePrice) > 0 && parseFloat(price) > 0 && parseFloat(comparePrice) > parseFloat(price) && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700">
                  Discount: {Math.round((1 - parseFloat(price) / parseFloat(comparePrice)) * 100)}% off
                </div>
              )}

              <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                Cost price is never shown to customers. Only the selling price appears on the storefront, cart, and checkout.
              </p>
            </>
          )}

          {/* ── SEO tab ── */}
          {tab === 'SEO' && (
            <>
              {/* AI bar on SEO tab too */}
              <AiBar />

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Title</label>
                <input
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder={name}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">{seoTitle.length}/60 chars recommended</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Description</label>
                <textarea
                  value={seoDesc}
                  onChange={e => setSeoDesc(e.target.value)}
                  rows={3}
                  placeholder={shortDesc || 'Click Generate with AI above…'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{seoDesc.length}/160 chars recommended</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  SEO Keywords <span className="text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input
                  value={seoKeywords}
                  onChange={e => setSeoKeywords(e.target.value)}
                  placeholder="kerala spices, buy online uk"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              {(seoTitle || seoDesc) && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">Preview</p>
                  <p className="text-sm text-blue-700 font-medium">{seoTitle || name}</p>
                  <p className="text-xs text-green-700">keralagrocery.com › products › {product.slug}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{seoDesc || shortDesc}</p>
                </div>
              )}
            </>
          )}

          {/* ── Image tab ── */}
          {tab === 'Image' && (
            <>
              {!galleryLoaded ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading images…</span>
                </div>
              ) : (
                <ImageGalleryManager
                  productId={product.id}
                  initial={galleryInitial}
                  onChange={setGallerySlots}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {saveError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{saveError}
            </p>
          )}
          {!saveError && <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-40 inline-flex items-center gap-2"
            >
              {(saving || uploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
