'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Search, Upload, Trash2, Copy, Check, Loader as Loader2, X, FolderOpen, Sparkles, CircleAlert as AlertCircle } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BATCH_SIZE = 100;

interface BucketFile {
  name: string;
  url: string;
  size: number;
}

interface UploadItem {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  uploadedUrl?: string;
  error?: string;
}

function bucketUrl(path: string) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${encoded}`;
}

function buildUploadPath(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const base = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return `products/uncategorised/${base}-${Date.now()}.${ext}`;
}

async function triggerProcessing(filePath: string, fileUrl: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    await fetch(`${SUPABASE_URL}/functions/v1/auto-process-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath, url: fileUrl }),
    });
  } catch {
    // non-blocking — processing happens in background
  }
}

async function listFolder(supabase: ReturnType<typeof getSupabase>, prefix: string): Promise<BucketFile[]> {
  const all: BucketFile[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(prefix, { limit: BATCH_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data || data.length === 0) break;
    const batch = data
      .filter(f => f.name !== '.emptyFolderPlaceholder' && f.metadata != null)
      .map(f => {
        const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
        return { name: fullPath, url: bucketUrl(fullPath), size: (f.metadata as any)?.size ?? 0 };
      });
    all.push(...batch);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  return all;
}

async function listAllFiles(): Promise<BucketFile[]> {
  const supabase = getSupabase();

  try {
    // 1. Get root items to find folders
    const { data: rootItems } = await supabase.storage.from('product-images').list('', { limit: 100 });
    const topFolders = (rootItems ?? [])
      .filter(item => item.metadata === null && item.name !== '.emptyFolderPlaceholder')
      .map(item => item.name);

    // 2. Discover common subfolders dynamically
    let subFolders: string[] = [];
    if (topFolders.includes('products')) {
      const { data: pItems } = await supabase.storage.from('product-images').list('products', { limit: 100 });
      const pSubs = (pItems ?? [])
        .filter(item => item.metadata === null && item.name !== '.emptyFolderPlaceholder')
        .map(item => `products/${item.name}`);
      subFolders = [...subFolders, ...pSubs];
    }

    // Always ensure we check uncategorised even if not found in first page of list
    if (!subFolders.includes('products/uncategorised')) {
      subFolders.push('products/uncategorised');
    }

    const foldersToScan = ['', ...topFolders, ...subFolders];
    const results = await Promise.all(
      foldersToScan.map(folder => listFolder(supabase, folder))
    );

    const all = results.flat();
    const unique = new Map<string, BucketFile>();
    // Store in map to deduplicate and prefer deeper paths if names collide
    all.forEach(f => unique.set(f.name, f));

    return Array.from(unique.values()).sort((a, b) => b.name.localeCompare(a.name));
  } catch (err) {
    console.error('Error listing all files:', err);
    return [];
  }
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<BucketFile[]>([]);
  const [filtered, setFiltered] = useState<BucketFile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [processAll, setProcessAll] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [processingSelected, setProcessingSelected] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const files = await listAllFiles();
    setImages(files);
    setFiltered(files);
    setLoading(false);
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(images); return; }
    setFiltered(images.filter(img => img.name.toLowerCase().includes(search.toLowerCase())));
  }, [search, images]);

  const addFilesToQueue = (files: File[]) => {
    const items: UploadItem[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setUploadQueue(prev => [...prev, ...items]);
    setShowUpload(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFilesToQueue(files);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) addFilesToQueue(files);
  };

  const removeFromQueue = (idx: number) => {
    setUploadQueue(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const startUpload = async () => {
    const pending = uploadQueue.filter(item => item.status === 'pending');
    if (!pending.length) return;
    setUploading(true);
    const supabase = getSupabase();

    for (let i = 0; i < uploadQueue.length; i++) {
      if (uploadQueue[i].status !== 'pending') continue;

      setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

      const filePath = buildUploadPath(uploadQueue[i].file.name);

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, uploadQueue[i].file, {
          upsert: true,
          cacheControl: '3600',
          contentType: uploadQueue[i].file.type || 'image/jpeg',
        });

      if (error) {
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ));
        continue;
      }

      const publicUrl = bucketUrl(filePath);

      setUploadQueue(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'processing', uploadedUrl: publicUrl } : item
      ));

      // Fire AI processing in background (non-blocking)
      triggerProcessing(filePath, publicUrl).finally(() => {
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'done' } : item
        ));
      });
    }

    setUploading(false);
    await loadImages();
  };

  const toggleSelectImage = (name: string) => {
    const next = new Set(selectedImages);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedImages(next);
  };

  const handleProcessSelected = async () => {
    if (selectedImages.size === 0) return;
    if (!confirm(`Queue ${selectedImages.size} selected images for AI enhancement?`)) return;

    setProcessingSelected(true);
    const supabase = getSupabase();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const imagesToProcess = images.filter(img => selectedImages.has(img.name));

      for (const img of imagesToProcess) {
        // Find if this image is already linked to a product to get product_id
        const { data: product } = await supabase
          .from('products')
          .select('id, brand, name')
          .eq('image_url', img.url)
          .maybeSingle();

        await fetch(`${SUPABASE_URL}/functions/v1/process-product-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_image_path: img.name,
            source_image_url: img.url,
            product_id: product?.id,
            seo_name: product ? [product.brand, product.name].filter(Boolean).join(' ') : undefined,
            force: true, // Force re-processing if manually selected
          }),
        });
      }

      setSelectedImages(new Set());
      alert('Selected images have been queued for processing.');
    } catch (err) {
      console.error('Error processing selected images:', err);
      alert('Failed to queue some images for processing.');
    } finally {
      setProcessingSelected(false);
    }
  };

  const handleProcessAll = async () => {
    if (!confirm('This will queue all unprocessed images for AI enhancement. Continue?')) return;
    setProcessAll(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/bulk-process-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 50 }),
      });
    } catch { /* non-blocking */ }
    setProcessAll(false);
  };

  const closeUpload = () => {
    uploadQueue.forEach(item => URL.revokeObjectURL(item.preview));
    setUploadQueue([]);
    setShowUpload(false);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(name);
    const supabase = getSupabase();
    await supabase.storage.from('product-images').remove([name]);
    setImages(prev => prev.filter(f => f.name !== name));
    setDeleting(null);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const doneCount = uploadQueue.filter(i => i.status === 'done' || i.status === 'processing').length;
  const errorCount = uploadQueue.filter(i => i.status === 'error').length;
  const pendingCount = uploadQueue.filter(i => i.status === 'pending').length;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Image Bucket</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${filtered.length} of ${images.length} files`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedImages.size > 0 && (
            <button
              onClick={handleProcessSelected}
              disabled={processingSelected}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors animate-in fade-in slide-in-from-right-2"
            >
              {processingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Process Selected ({selectedImages.size})
            </button>
          )}
          <button
            onClick={handleProcessAll}
            disabled={processAll}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            title="Run AI processing on all unprocessed product images"
          >
            {processAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Process All
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-[#0B5D3B] hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Images uploaded here are automatically queued for AI enhancement.
          Processed images are stored in <strong>product-images-clean</strong> and linked to products automatically.
          Use <strong>Process All</strong> to re-run on existing unprocessed images.
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 bg-white"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <p className="text-xs text-gray-400">Loading all images…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No images found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(img => {
            const isSelected = selectedImages.has(img.name);
            return (
              <div
                key={img.name}
                onClick={() => toggleSelectImage(img.name)}
                className={`group relative bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'
                }`}
              >
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  <picture>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200 ${
                        isSelected ? 'opacity-75' : ''
                      }`}
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/placeholder.webp';
                      }}
                    />
                  </picture>

                  {/* Selection indicator */}
                  <div className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-xs text-gray-700 font-medium truncate leading-snug" title={img.name}>
                    {img.name.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{img.size ? `${(img.size / 1024).toFixed(0)} KB` : ''}</p>
                </div>
                <div
                  className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => copyUrl(img.url)}
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-lg shadow flex items-center justify-center text-gray-600 hover:text-green-600 transition-colors"
                    title="Copy URL"
                  >
                    {copiedUrl === img.url ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(img.name)}
                    disabled={deleting === img.name}
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-lg shadow flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    {deleting === img.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Upload Product Images</h2>
                <p className="text-xs text-gray-400 mt-0.5">Images are automatically enhanced with AI after upload</p>
              </div>
              <button onClick={closeUpload} disabled={uploading} className="text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop zone */}
            <div className="px-5 pt-4">
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInput.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none ${
                  dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                }`}
              >
                <input ref={fileInput} type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" />
                <FolderOpen className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-green-500' : 'text-gray-300'}`} />
                <p className="text-sm font-medium text-gray-700">Drop images here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — multiple files supported</p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI enhancement runs automatically
                </div>
              </div>
            </div>

            {/* Queue */}
            {uploadQueue.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">
                    {uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''} selected
                  </p>
                  {!uploading && doneCount === 0 && (
                    <button onClick={() => setUploadQueue([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 max-h-56">
                  {uploadQueue.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.file.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {(item.file.size / 1024).toFixed(0)} KB
                          {item.status === 'processing' && (
                            <span className="ml-2 text-amber-500 font-semibold">AI processing…</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'pending' && !uploading && (
                          <button onClick={() => removeFromQueue(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {item.status === 'processing' && <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />}
                        {item.status === 'done' && <Check className="w-4 h-4 text-green-500" />}
                        {item.status === 'error' && (
                          <span className="text-[10px] text-red-500 font-medium" title={item.error}>Failed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {doneCount > 0 && <span className="text-green-600 font-medium">{doneCount} uploaded</span>}
                {errorCount > 0 && <span className="text-red-500 font-medium ml-2">{errorCount} failed</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeUpload}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
                >
                  {doneCount > 0 ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={startUpload}
                  disabled={uploading || pendingCount === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0B5D3B] hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {uploading ? 'Uploading…' : `Upload ${pendingCount > 0 ? pendingCount + ' ' : ''}Image${pendingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
