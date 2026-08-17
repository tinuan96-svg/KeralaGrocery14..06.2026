'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { replaceProductImage } from '@/lib/utils/image';
import {
  Search, Image as ImageIcon, X, Check,
  ChevronLeft, ChevronRight, Loader as Loader2, Upload, FolderOpen,
} from 'lucide-react';

const STORE_ID = 'a2e4d9f9-6b51-4071-97eb-decf72485b5a';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PAGE_SIZE = 20;
const BUCKET_BATCH = 100;

const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/api_keralagroceries`;

function rpcHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface Product {
  product_id: string;
  row_id: number;
  product_title: string;
  brand: string | null;
  price: number;
  stock: number;
  category: string | null;
  image_url: string | null;
  slug: string | null;
}

interface BucketImage {
  name: string;
  url: string;
}

function bucketUrl(path: string) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${encoded}`;
}

async function listFolder(
  supabase: ReturnType<typeof getSupabase>,
  prefix: string
): Promise<BucketImage[]> {
  const all: BucketImage[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(prefix, { limit: BUCKET_BATCH, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data || data.length === 0) break;
    all.push(
      ...data
        .filter(f => f.name !== '.emptyFolderPlaceholder' && f.metadata != null)
        .map(f => {
          const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
          return { name: fullPath, url: bucketUrl(fullPath) };
        })
    );
    if (data.length < BUCKET_BATCH) break;
    offset += BUCKET_BATCH;
  }
  return all;
}

async function listAllBucketImages(): Promise<BucketImage[]> {
  const supabase = getSupabase();
  const [root, uploads, products] = await Promise.all([
    listFolder(supabase, ''),
    listFolder(supabase, 'uploads'),
    listFolder(supabase, 'products'),
  ]);
  return [...products, ...root, ...uploads];
}

/** Fetch image_url + slug for a list of product UUIDs */
async function enrichWithImages(
  productIds: string[]
): Promise<Record<string, { image_url: string | null; slug: string | null }>> {
  if (!productIds.length) return {};
  const supabase = getSupabase();
  const { data } = await supabase
    .from('products')
    .select('id, slug, image_main, image_url')
    .in('id', productIds);
  const map: Record<string, { image_url: string | null; slug: string | null }> = {};
  for (const row of (data ?? []) as {
    id: string; slug: string | null; image_main: string | null; image_url: string | null;
  }[]) {
    const img =
      (row.image_main?.startsWith('http') ? row.image_main : null) ??
      (row.image_url?.startsWith('http')  ? row.image_url  : null) ??
      null;
    map[row.id] = { image_url: img, slug: row.slug };
  }
  return map;
}

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage]             = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [filterNoImage, setFilterNoImage] = useState(false);
  const [loading, setLoading]       = useState(true);

  // Image picker
  const [pickerProduct, setPickerProduct]   = useState<Product | null>(null);
  const [bucketImages, setBucketImages]     = useState<BucketImage[]>([]);
  const [bucketSearch, setBucketSearch]     = useState('');
  const [bucketLoading, setBucketLoading]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());

  // Upload tab
  const [pickerTab, setPickerTab]           = useState<'browse' | 'upload'>('browse');
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploadPreview, setUploadPreview]   = useState<string | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: rpcHeaders(),
        body: JSON.stringify({
          p_mode: 'list',
          p_page: page,
          p_limit: PAGE_SIZE,
          p_search: search.trim(),
          p_category: null,
          p_brand: null,
          p_status: 'active',
          p_sort_by: 'name',
          p_sort_order: 'asc',
        }),
      });
      const json = await res.json();
      const rows: Record<string, unknown>[] = Array.isArray(json?.items) ? json.items : [];
      const t: number = typeof json?.total === 'number' ? json.total : rows.length;
      const tp: number = typeof json?.total_pages === 'number' ? json.total_pages : Math.ceil(t / PAGE_SIZE);

      // Enrich with images from products table
      const ids = rows.map(r => String(r.product_id ?? '')).filter(Boolean);
      const enriched = await enrichWithImages(ids);

      const mapped: Product[] = rows.map(r => {
        const pid = String(r.product_id ?? '');
        const e = enriched[pid] ?? { image_url: null, slug: null };
        // filter out products with no image if filterNoImage is on
        return {
          product_id: pid,
          row_id: Number(r.id ?? 0),
          product_title: String(r.product_title ?? r.product_code ?? ''),
          brand: (r.brand as string | null) ?? null,
          price: Number(r.price ?? 0),
          stock: Number(r.qnty ?? (r as Record<string, unknown>)['Stock Qnty'] ?? 0),
          category: (r.category as string | null) ?? null,
          image_url: e.image_url,
          slug: e.slug,
        };
      });

      const filtered = filterNoImage ? mapped.filter(p => !p.image_url) : mapped;
      setProducts(filtered);
      setTotal(filterNoImage ? filtered.length : t);
      setTotalPages(filterNoImage ? 1 : tp);
    } catch (err) {
      console.error('[AdminProducts] fetch error:', err);
    }
    setLoading(false);
  }, [page, search, filterNoImage]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const openPicker = async (product: Product) => {
    setPickerProduct(product);
    setPickerTab('browse');
    setBucketSearch('');
    setUploadFile(null);
    setUploadPreview(null);
    setBucketLoading(true);
    const images = await listAllBucketImages();
    setBucketImages(images);
    setBucketLoading(false);
  };

  const closePicker = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setPickerProduct(null);
    setBucketSearch('');
    setUploadFile(null);
    setUploadPreview(null);
  };

  const applyImageToProduct = (productId: string, url: string) => {
    setSavedIds(prev => new Set(prev).add(productId));
    setProducts(prev =>
      prev.map(p => p.product_id === productId ? { ...p, image_url: url } : p)
    );
    setTimeout(() => {
      setSavedIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
    }, 2000);
  };

  const selectImage = async (imageUrl: string) => {
    if (!pickerProduct || saving) return;
    setSaving(true);
    const supabase = getSupabase();
    const { error } = await supabase.rpc('replace_product_image', {
      p_product_id: pickerProduct.product_id,
      p_store_id: STORE_ID,
      p_new_image_url: imageUrl,
    });
    if (error) {
      alert('Failed to save image. Please try again.');
      setSaving(false);
      return;
    }
    applyImageToProduct(pickerProduct.product_id, `${imageUrl}?v=${Date.now()}`);
    closePicker();
    setSaving(false);
  };

  const handleUploadAndSave = async () => {
    if (!pickerProduct || !uploadFile || uploading) return;
    setUploading(true);
    try {
      const cacheBustedUrl = await replaceProductImage({
        file: uploadFile,
        productId: pickerProduct.product_id,
        storeId: STORE_ID,
      });
      applyImageToProduct(pickerProduct.product_id, cacheBustedUrl);
      closePicker();
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = async (product: Product) => {
    if (!confirm(`Remove image from "${product.product_title}"?`)) return;
    const supabase = getSupabase();
    await supabase.from('products').update({ image_url: null, image_main: null })
      .eq('id', product.product_id);
    setProducts(prev =>
      prev.map(p => p.product_id === product.product_id ? { ...p, image_url: null } : p)
    );
  };

  const handleFileSelect = (file: File) => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setPickerTab('upload');
  };

  const filteredBucket = bucketSearch.trim()
    ? bucketImages.filter(img => img.name.toLowerCase().includes(bucketSearch.toLowerCase()))
    : bucketImages;

  const withImages    = products.filter(p => p.image_url).length;
  const withoutImages = products.filter(p => !p.image_url).length;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Product Images</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${total.toLocaleString()} products`}
            {!loading && (
              <span className="ml-2">
                <span className="text-green-600 font-medium">{withImages} with image</span>
                {withoutImages > 0 && (
                  <span className="text-amber-600 font-medium ml-1.5">{withoutImages} missing</span>
                )}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name, brand..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 bg-white"
          />
        </form>
        <label className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
          <input
            type="checkbox"
            checked={filterNoImage}
            onChange={e => { setFilterNoImage(e.target.checked); setPage(1); }}
            className="accent-amber-500"
          />
          Missing image only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-14">Image</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Product</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">Stock</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-48 animate-pulse" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 bg-gray-100 rounded w-24 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-12 ml-auto animate-pulse" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-3 bg-gray-100 rounded w-10 ml-auto animate-pulse" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No products found</td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative ${product.image_url ? 'bg-gray-100' : 'bg-amber-50 border border-amber-200'}`}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="w-full h-full object-contain p-0.5"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                          </div>
                        )}
                        {savedIds.has(product.product_id) && (
                          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-1">{product.product_title}</p>
                      {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{product.category ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-medium text-gray-900">
                        {product.price > 0 ? `£${product.price.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                      <span className={`text-xs font-medium ${product.stock > 0 ? 'text-green-700' : 'text-red-500'}`}>
                        {product.stock > 0 ? product.stock : 'Out'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openPicker(product)}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                            product.image_url
                              ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                              : 'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100'
                          }`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          {product.image_url ? 'Change' : 'Set Image'}
                        </button>
                        {product.image_url && (
                          <button
                            onClick={() => clearImage(product)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} — {total.toLocaleString()} products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      {pickerProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="font-semibold text-gray-900 text-sm">Set Product Image</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{pickerProduct.product_title}</p>
                {pickerProduct.brand && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{pickerProduct.brand}</p>
                )}
              </div>
              {pickerProduct.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 mr-3">
                  <img src={pickerProduct.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                </div>
              )}
              <button
                onClick={closePicker}
                disabled={saving || uploading}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-40 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setPickerTab('browse')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${pickerTab === 'browse' ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Browse Bucket
              </button>
              <button
                onClick={() => setPickerTab('upload')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${pickerTab === 'upload' ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Upload New
              </button>
            </div>

            {/* Browse tab */}
            {pickerTab === 'browse' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={bucketSearch}
                      onChange={e => setBucketSearch(e.target.value)}
                      placeholder="Search images by filename..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {bucketLoading ? 'Loading...' : `${filteredBucket.length} image${filteredBucket.length !== 1 ? 's' : ''} — click to apply`}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {bucketLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      <p className="text-xs text-gray-400">Loading images...</p>
                    </div>
                  ) : filteredBucket.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No images found.{' '}
                      <button onClick={() => setPickerTab('upload')} className="text-green-600 underline">
                        Upload one
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {filteredBucket.map(img => (
                        <button
                          key={img.name}
                          onClick={() => selectImage(img.url)}
                          disabled={saving}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-transparent hover:border-green-400 transition-all focus:outline-none disabled:opacity-60"
                          title={img.name.split('/').pop()}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-[9px] leading-tight truncate">{img.name.split('/').pop()}</p>
                          </div>
                          {saving && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Upload tab */}
            {pickerTab === 'upload' && (
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                />
                {!uploadFile ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false);
                      const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
                      if (f) handleFileSelect(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
                      dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                    }`}
                  >
                    <FolderOpen className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-green-500' : 'text-gray-300'}`} />
                    <p className="text-sm font-medium text-gray-700">Drop an image here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 10 MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                      {uploadPreview && (
                        <img src={uploadPreview} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <button
                        onClick={() => {
                          if (uploadPreview) URL.revokeObjectURL(uploadPreview);
                          setUploadFile(null);
                          setUploadPreview(null);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Choose a different file
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {saving && <span className="text-blue-600 font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
                {uploading && <span className="text-blue-600 font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closePicker}
                  disabled={saving || uploading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                {pickerTab === 'upload' && uploadFile && (
                  <button
                    onClick={handleUploadAndSave}
                    disabled={uploading || saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <Upload className="w-3.5 h-3.5" />
                    Upload & Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
