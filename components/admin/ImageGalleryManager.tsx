'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, GripVertical, Wand as Wand2, Check, Loader as Loader2,
  TriangleAlert as AlertTriangle, Star, Trash2, RefreshCw,
  Image as ImageIcon, Info, Library, Sparkles,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import type { GalleryImage } from '@/lib/types/database';
import MediaPicker from './MediaPicker';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FieldValidation {
  value: string;
  matched: string;
  similarity: number;
  passed: boolean;
}

interface ValidationReport {
  brand: FieldValidation;
  productName: FieldValidation;
  weight: FieldValidation;
}

interface ApiDiagnostics {
  endpoint: string;
  model: string;
  params: Record<string, string | number>;
  responseStatus: number;
  errorMessage: string | null;
}

/**
 * Pipeline stages:
 *   idle        → file selected, local preview only, not yet uploaded
 *   uploading   → PUT to Supabase Storage in progress
 *   uploaded    → confirmed public Supabase Storage URL, ready for enhancement
 *   enhancing   → edge function running
 *   done        → enhanced (or original preserved after OCR pass)
 *   ocr_warning → enhanced but text changed 5–20%, admin must choose
 *   ocr_failed  → text changed >20%, enhancement rejected, original kept
 *   failed      → error at a specific stage (see slot.failedStage + slot.error)
 */
type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'enhancing'
  | 'done'
  | 'ocr_warning'
  | 'ocr_failed'
  | 'failed';

type FailedStage = 'preview' | 'upload' | 'storage' | 'enhancement' | 'ocr';

export interface GallerySlot {
  dbRow: GalleryImage | null;
  localId: string;
  /** blob URL from URL.createObjectURL — only valid for newly added files */
  previewUrl: string | null;
  /** browser-renderable file, null for rows loaded from DB */
  file: File | null;
  position: number;
  stage: PipelineStage;
  failedStage: FailedStage | null;
  error: string | null;
  /**
   * Confirmed public Supabase Storage URL — set after a successful upload.
   * MUST start with https:// and contain /storage/v1/object/public/ to be
   * eligible for AI enhancement.
   */
  uploadedUrl: string | null;
  enhancedUrl: string | null;
  /** Per-field critical text validation from the edge function */
  validation: ValidationReport | null;
  /** API call diagnostics returned from the edge function */
  diagnostics: ApiDiagnostics | null;
  activeChoice: 'original' | 'enhanced';
}

interface Props {
  productId: string;
  initial: GalleryImage[];
  onChange?: (slots: GallerySlot[]) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_IMAGES = 20;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_EXTS = /\.(jpg|jpeg|png|webp)$/i;
const HEIC_EXTS = /\.(heic|heif)$/i;

/** Only these URL schemes are reachable from Supabase Edge Functions */
const PUBLIC_STORAGE_RE = /^https?:\/\/.+\/storage\/v1\/object\/public\//i;

function isPublicStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('blob:')) return false;
  if (url.startsWith('data:')) return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|sandbox|webcontainer|\.local\b/i.test(url)) return false;
  return PUBLIC_STORAGE_RE.test(url);
}

function isHeic(file: File) {
  return HEIC_EXTS.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
}

function isAccepted(file: File) {
  if (isHeic(file)) return false;
  return ACCEPTED_MIME.includes(file.type) || ACCEPTED_EXTS.test(file.name);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Stage pill ─────────────────────────────────────────────────────────────────

const STAGE_STYLE: Record<PipelineStage, { dot: string; label: string; pill: string }> = {
  idle:        { dot: 'bg-gray-300',                      label: 'Ready',      pill: 'bg-gray-100 text-gray-500' },
  uploading:   { dot: 'bg-yellow-400 animate-pulse',      label: 'Uploading',  pill: 'bg-yellow-50 text-yellow-700' },
  uploaded:    { dot: 'bg-blue-400',                      label: 'Uploaded',   pill: 'bg-blue-50 text-blue-700' },
  enhancing:   { dot: 'bg-emerald-400 animate-pulse',     label: 'Enhancing',  pill: 'bg-emerald-50 text-emerald-700' },
  done:        { dot: 'bg-green-500',                     label: 'Enhanced',   pill: 'bg-green-100 text-green-700' },
  ocr_warning: { dot: 'bg-amber-400',                     label: 'Review',     pill: 'bg-amber-50 text-amber-700' },
  ocr_failed:  { dot: 'bg-red-400',                       label: 'OCR Failed', pill: 'bg-red-50 text-red-600' },
  failed:      { dot: 'bg-red-500',                       label: 'Failed',     pill: 'bg-red-50 text-red-600' },
};

function StagePill({ stage }: { stage: PipelineStage }) {
  const s = STAGE_STYLE[stage];
  // Don't show a pill for idle — it just means "ready to upload"
  if (stage === 'idle') return null;
  return (
    <span className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${s.pill}`}>
      {(stage === 'uploading' || stage === 'enhancing')
        ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
        : <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  );
}

// ── Log helper ─────────────────────────────────────────────────────────────────

async function logUpload(entry: {
  product_id: string | null;
  filename: string;
  file_type: string;
  file_size_bytes?: number;
  storage_path?: string;
  public_url?: string;
  stage: string;
  status: 'success' | 'failed';
  error_message?: string;
}) {
  try {
    const supabase = getSupabase();
    await supabase.from('image_upload_logs').insert(entry);
  } catch {
    // logging must never throw
  }
}

// ── Derive initial slot state from a DB row ────────────────────────────────────

function slotFromDbRow(row: GalleryImage, index: number): GallerySlot {
  const uploadedUrl = row.image_url ?? null;
  const enhancedUrl = row.enhanced_image_url ?? null;
  const displayUrl = enhancedUrl ?? uploadedUrl;

  // Determine stage based on what the DB row contains
  let stage: PipelineStage;
  if (enhancedUrl) {
    stage = 'done';
  } else if (uploadedUrl && isPublicStorageUrl(uploadedUrl)) {
    // Valid public URL and no enhanced version — ready to enhance
    stage = 'uploaded';
  } else if (uploadedUrl) {
    // URL exists but is not a reachable public URL — treat as uploaded but
    // enhancement will be blocked until re-uploaded
    stage = 'uploaded';
  } else {
    // No URL at all
    stage = 'idle';
  }

  return {
    dbRow: row,
    localId: uid(),
    previewUrl: displayUrl,
    file: null,
    position: index,
    stage,
    failedStage: null,
    error: null,
    uploadedUrl,
    enhancedUrl,
    validation: null,
    diagnostics: null,
    activeChoice: enhancedUrl ? 'enhanced' : 'original',
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ImageGalleryManager({ productId, initial, onChange }: Props) {
  const [slots, setSlots] = useState<GallerySlot[]>(() =>
    initial
      .sort((a, b) => a.position - b.position)
      .map((row, i) => slotFromDbRow(row, i))
  );

  const [dragOver, setDragOver] = useState(false);
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const emit = useCallback((updated: GallerySlot[]) => onChange?.(updated), [onChange]);

  const updateSlot = useCallback((localId: string, patch: Partial<GallerySlot>) => {
    setSlots(prev => {
      const next = prev.map(s => s.localId === localId ? { ...s, ...patch } : s);
      slotsRef.current = next;
      // Emit to parent after the state update cycle
      setTimeout(() => emit(next), 0);
      return next;
    });
  }, [emit]);

  // ── STEP 1 — File selection → immediate local preview ─────────────────────────

  const ingestFiles = (rawFiles: File[]) => {
    const remaining = MAX_IMAGES - slotsRef.current.length;
    if (remaining <= 0) return;

    const toAdd: Array<{ file: File; isHeicBlocked: boolean }> = [];

    for (const f of rawFiles) {
      if (toAdd.length >= remaining) break;
      if (isHeic(f)) {
        toAdd.push({ file: f, isHeicBlocked: true });
        continue;
      }
      if (!isAccepted(f)) continue;
      if (f.size > MAX_BYTES) continue;
      toAdd.push({ file: f, isHeicBlocked: false });
    }

    if (!toAdd.length) return;

    const newSlots: GallerySlot[] = toAdd.map(({ file, isHeicBlocked }, i) => {
      let previewUrl: string | null = null;
      let stage: PipelineStage = 'idle';
      let error: string | null = null;
      let failedStage: FailedStage | null = null;

      if (isHeicBlocked) {
        stage = 'failed';
        failedStage = 'preview';
        error = 'HEIC support coming soon. Please export as JPG and try again.';
      } else {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (e) {
          stage = 'failed';
          failedStage = 'preview';
          error = `Preview failed: ${e instanceof Error ? e.message : 'Could not read file'}`;
        }
      }

      console.log('[ImageGallery] Ingested file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        stage,
        previewUrl: previewUrl ? previewUrl.slice(0, 60) : null,
      });

      return {
        dbRow: null,
        localId: uid(),
        previewUrl,
        file: isHeicBlocked ? null : file,
        position: slotsRef.current.length + i,
        stage,
        failedStage,
        error,
        uploadedUrl: null,
        enhancedUrl: null,
        validation: null,
    diagnostics: null,
        activeChoice: 'original' as const,
      };
    });

    const updatedSlots = [...slotsRef.current, ...newSlots];
    setSlots(updatedSlots);
    slotsRef.current = updatedSlots;
    setTimeout(() => emit(updatedSlots), 0);

    // Auto-trigger enhancement with a slight staggered delay to prevent overwhelming the browser
    newSlots.forEach((s, idx) => {
      if (s.stage === 'idle' && s.file) {
        setTimeout(() => enhanceSlot(s.localId), idx * 800);
      }
    });
  };

  const handleMediaSelect = async (url: string, filename: string) => {
    setShowMediaPicker(false);

    const newSlot: GallerySlot = {
      dbRow: null,
      localId: uid(),
      previewUrl: url,
      file: null,
      position: slotsRef.current.length,
      stage: 'uploaded', // Since it's already in storage
      failedStage: null,
      error: null,
      uploadedUrl: url,
      enhancedUrl: null,
      validation: null,
      diagnostics: null,
      activeChoice: 'original',
    };

    // Auto-save to DB as we already have the URL
    const supabase = getSupabase();
    const { data: dbRow } = await supabase
      .from('product_gallery_images')
      .insert({
        product_id: productId,
        image_url: url,
        original_image_url: url,
        position: newSlot.position,
        is_primary: newSlot.position === 0,
        image_processing_status: 'pending',
      })
      .select()
      .maybeSingle();

    if (dbRow) {
      newSlot.dbRow = dbRow as GalleryImage;
    }

    const updatedSlots = [...slotsRef.current, newSlot];
    setSlots(updatedSlots);
    slotsRef.current = updatedSlots;
    setTimeout(() => emit(updatedSlots), 0);

    // Auto-trigger enhancement for selected media
    enhanceSlot(newSlot.localId);
  };

  // ── STEP 2+3 — Upload to Supabase Storage, obtain verified public URL ─────────

  const uploadSlot = async (localId: string): Promise<string | null> => {
    const slot = slotsRef.current.find(s => s.localId === localId);
    if (!slot) return null;

    // Already have a valid public URL — skip re-upload
    if (slot.uploadedUrl && isPublicStorageUrl(slot.uploadedUrl)) {
      console.log('[ImageGallery] Upload skipped — already have public URL:', slot.uploadedUrl);
      return slot.uploadedUrl;
    }

    if (!slot.file) {
      updateSlot(localId, { stage: 'failed', failedStage: 'upload', error: 'Upload Failed: no file selected' });
      return null;
    }

    updateSlot(localId, { stage: 'uploading', error: null, failedStage: null });

    const supabase = getSupabase();
    const ts = Date.now();
    const safeName = slot.file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const storagePath = `products/${productId}/${ts}-${safeName}`;
    const contentType = slot.file.type || 'image/jpeg';

    console.log('[ImageGallery] Uploading file:', {
      filename: slot.file.name,
      contentType,
      storagePath,
      sizeBytes: slot.file.size,
    });

    try {
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(storagePath, slot.file, { contentType, upsert: false });

      if (uploadErr) {
        const msg = `Upload Failed: ${uploadErr.message}`;
        console.error('[ImageGallery] Storage upload error:', uploadErr);
        updateSlot(localId, { stage: 'failed', failedStage: 'upload', error: msg });
        await logUpload({
          product_id: productId,
          filename: slot.file.name,
          file_type: contentType,
          file_size_bytes: slot.file.size,
          storage_path: storagePath,
          stage: 'upload',
          status: 'failed',
          error_message: uploadErr.message,
        });
        return null;
      }

      // Retrieve and verify public URL — must be https://...supabase.co/storage/...
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl ?? null;

      console.log('[ImageGallery] Storage upload result:', { storagePath, publicUrl });

      if (!publicUrl || !isPublicStorageUrl(publicUrl)) {
        const msg = `Storage Failed: could not retrieve a valid public URL (got: ${publicUrl ?? 'null'})`;
        console.error('[ImageGallery]', msg);
        updateSlot(localId, { stage: 'failed', failedStage: 'storage', error: msg });
        await logUpload({
          product_id: productId,
          filename: slot.file.name,
          file_type: contentType,
          storage_path: storagePath,
          stage: 'storage',
          status: 'failed',
          error_message: msg,
        });
        return null;
      }

      // Upsert gallery DB row with the confirmed URL
      const rowPayload = {
        product_id: productId,
        image_url: publicUrl,
        original_image_url: publicUrl,
        position: slot.position,
        is_primary: slot.position === 0,
        image_processing_status: 'pending' as const,
      };

      let dbRow: GalleryImage | null = slot.dbRow;
      if (dbRow?.id) {
        const { data } = await supabase
          .from('product_gallery_images')
          .update(rowPayload)
          .eq('id', dbRow.id)
          .select()
          .maybeSingle();
        if (data) dbRow = data as GalleryImage;
      } else {
        const { data } = await supabase
          .from('product_gallery_images')
          .insert(rowPayload)
          .select()
          .maybeSingle();
        if (data) dbRow = data as GalleryImage;
      }

      updateSlot(localId, {
        stage: 'uploaded',
        uploadedUrl: publicUrl,
        // Preserve the local blob preview — it's still valid for display
        previewUrl: slot.previewUrl ?? publicUrl,
        dbRow,
        error: null,
        failedStage: null,
      });

      await logUpload({
        product_id: productId,
        filename: slot.file.name,
        file_type: contentType,
        file_size_bytes: slot.file.size,
        storage_path: storagePath,
        public_url: publicUrl,
        stage: 'upload',
        status: 'success',
      });

      return publicUrl;
    } catch (err) {
      const msg = `Upload Failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[ImageGallery] Upload exception:', err);
      updateSlot(localId, { stage: 'failed', failedStage: 'upload', error: msg });
      await logUpload({
        product_id: productId,
        filename: slot.file?.name ?? '',
        file_type: contentType,
        storage_path: storagePath,
        stage: 'upload',
        status: 'failed',
        error_message: msg,
      });
      return null;
    }
  };

  // ── STEP 4+5 — AI Enhancement ─────────────────────────────────────────────────
  // Only runs against confirmed https://...supabase.co/storage/... URLs.
  // If uploadedUrl is a blob/local/sandbox URL, triggers re-upload first.

  const enhanceSlot = async (localId: string) => {
    const slot = slotsRef.current.find(s => s.localId === localId);
    if (!slot) return;

    // We need a public URL. If we have one already, use it. Otherwise upload.
    let imageUrl = slot.uploadedUrl;

    if (!imageUrl || !isPublicStorageUrl(imageUrl)) {
      // Blob URL or missing URL — must upload first
      if (!slot.file) {
        updateSlot(localId, {
          stage: 'failed',
          failedStage: 'enhancement',
          error: 'Please upload the image first before running AI enhancement.',
        });
        return;
      }
      console.log('[ImageGallery] Uploading before enhancement (no valid public URL yet)');
      imageUrl = await uploadSlot(localId);
      if (!imageUrl) return; // uploadSlot already set the error
    }

    // Final safety check — never send a non-public URL to the edge function
    if (!isPublicStorageUrl(imageUrl)) {
      updateSlot(localId, {
        stage: 'failed',
        failedStage: 'enhancement',
        error: 'Enhancement blocked: image URL is not a public Supabase Storage URL. Please re-upload the image.',
      });
      return;
    }

    const freshSlot = slotsRef.current.find(s => s.localId === localId);
    const galleryRowId = freshSlot?.dbRow?.id;

    if (!galleryRowId) {
      updateSlot(localId, {
        stage: 'failed',
        failedStage: 'enhancement',
        error: 'Enhancement Failed: gallery record not found — upload the image first.',
      });
      return;
    }

    updateSlot(localId, { stage: 'enhancing', error: null, failedStage: null });

    console.log('[ImageGallery] Starting AI enhancement:', {
      galleryRowId,
      imageUrl,
      galleryMode: true,
    });

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enhance-product-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: galleryRowId,
            imageUrl,
            galleryMode: true,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const json = await res.json();
      console.log('[ImageGallery] Enhancement response:', json);

      if (json.unreachableUrl) {
        // This should not happen since we validated the URL above, but handle it defensively
        updateSlot(localId, {
          stage: 'failed',
          failedStage: 'enhancement',
          error: 'Enhancement Failed: image URL is not publicly reachable. Please re-upload the image.',
        });
        return;
      }

      if (json.ocrFailed) {
        const failedFields: string[] = json.failedFields ?? [];
        const report: ValidationReport | null = json.validation ?? null;
        const diag: ApiDiagnostics | null = json.diagnostics ?? null;
        const errMsg = `Critical text changed: ${failedFields.join(', ')}. Original image preserved.`;
        updateSlot(localId, {
          stage: 'ocr_failed',
          failedStage: 'ocr',
          validation: report,
          diagnostics: diag,
          error: errMsg,
        });
        await supabase.from('product_gallery_images')
          .update({ image_processing_status: 'failed' })
          .eq('id', galleryRowId);
        await logUpload({
          product_id: productId,
          filename: freshSlot?.file?.name ?? '',
          file_type: '',
          stage: 'ocr',
          status: 'failed',
          error_message: json.message,
        });
        return;
      }

      if (!json.success) {
        const diag: ApiDiagnostics | null = json.diagnostics ?? null;
        const errMsg = json.error ?? 'Enhancement returned an unknown error';
        updateSlot(localId, {
          stage: 'failed',
          failedStage: 'enhancement',
          diagnostics: diag,
          error: `Enhancement Failed: ${errMsg}`,
        });
        await logUpload({ product_id: productId, filename: '', file_type: '', stage: 'enhancement', status: 'failed', error_message: errMsg });
        return;
      }

      const enhanced = json.enhancedUrl as string;
      const report: ValidationReport | null = json.validation ?? null;
      const diag: ApiDiagnostics | null = json.diagnostics ?? null;
      const finalUrl = enhanced;

      console.log('[ImageGallery] Enhancement successful:', { enhanced, validation: report, diagnostics: diag });

      await supabase.from('product_gallery_images').update({
        enhanced_image_url: enhanced,
        image_url: finalUrl,
        image_processing_status: 'completed',
        image_processed_at: new Date().toISOString(),
      }).eq('id', galleryRowId);

      updateSlot(localId, {
        stage: 'done',
        enhancedUrl: enhanced,
        validation: report,
        diagnostics: diag,
        activeChoice: 'enhanced',
        previewUrl: finalUrl,
        file: null,
        error: null,
        failedStage: null,
        dbRow: {
          ...(freshSlot?.dbRow ?? {} as GalleryImage),
          enhanced_image_url: enhanced,
          image_url: finalUrl,
          image_processing_status: 'completed',
        } as GalleryImage,
      });
    } catch (err) {
      const msg = `Enhancement Failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[ImageGallery] Enhancement exception:', err);
      updateSlot(localId, { stage: 'failed', failedStage: 'enhancement', error: msg });
      await logUpload({
        product_id: productId,
        filename: '',
        file_type: '',
        stage: 'enhancement',
        status: 'failed',
        error_message: msg,
      });
    }
  };

  const uploadOnly = async (localId: string) => {
    await uploadSlot(localId);
  };

  // ── Batch: upload all pending then enhance all uploaded ────────────────────────

  const uploadAll = async () => {
    const pending = slotsRef.current.filter(s => s.stage === 'idle' && s.file);
    if (!pending.length) return;

    setBatchProgress({ current: 0, total: pending.length });

    // Upload in parallel
    const CONCURRENCY = 6;
    const queue = [...pending];
    let completed = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const slot = queue.shift();
        if (!slot) break;
        try {
          await uploadSlot(slot.localId);
        } finally {
          completed++;
          setBatchProgress(prev => prev ? { ...prev, current: completed } : null);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }).map(worker));
    setBatchProgress(null);
  };

  const enhanceAll = async () => {
    const enhanceable = slotsRef.current.filter(
      s => s.stage === 'idle' || s.stage === 'uploaded' || (s.stage === 'failed' && s.file)
    );
    if (!enhanceable.length) return;

    setBatchProgress({ current: 0, total: enhanceable.length });

    // Process in parallel with a concurrency limit of 4.
    // This is significantly faster than sequential processing.
    const CONCURRENCY = 4;
    const queue = [...enhanceable];
    let completed = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const slot = queue.shift();
        if (!slot) break;
        try {
          await enhanceSlot(slot.localId);
        } catch (err) {
          console.error(`[ImageGallery] Failed to enhance slot ${slot.localId}:`, err);
        } finally {
          completed++;
          setBatchProgress(prev => prev ? { ...prev, current: completed } : null);
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, enhanceable.length) }).map(worker);
    await Promise.all(workers);

    setBatchProgress(null);
  };

  // ── OCR choice commit ──────────────────────────────────────────────────────────

  const commitChoice = async (localId: string, choice: 'original' | 'enhanced') => {
    const slot = slotsRef.current.find(s => s.localId === localId);
    if (!slot?.dbRow?.id) return;
    const finalUrl = choice === 'enhanced'
      ? (slot.enhancedUrl ?? slot.uploadedUrl ?? slot.dbRow.image_url)
      : (slot.uploadedUrl ?? slot.dbRow.original_image_url ?? slot.dbRow.image_url);
    const supabase = getSupabase();
    await supabase.from('product_gallery_images').update({ image_url: finalUrl }).eq('id', slot.dbRow.id);
    updateSlot(localId, { activeChoice: choice, previewUrl: finalUrl, stage: 'done', error: null, failedStage: null });
    if (expandedSlot === localId) setExpandedSlot(null);
  };

  // ── Reorder ────────────────────────────────────────────────────────────────────

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setSlots(prev => {
      const next = [...prev];
      const fi = next.findIndex(s => s.localId === fromId);
      const ti = next.findIndex(s => s.localId === toId);
      if (fi === -1 || ti === -1) return prev;
      const [moved] = next.splice(fi, 1);
      next.splice(ti, 0, moved);
      const reindexed = next.map((s, i) => ({ ...s, position: i }));
      slotsRef.current = reindexed;
      emit(reindexed);
      const supabase = getSupabase();
      reindexed.forEach(s => {
        if (s.dbRow?.id) {
          supabase.from('product_gallery_images')
            .update({ position: s.position, is_primary: s.position === 0 })
            .eq('id', s.dbRow.id);
        }
      });
      return reindexed;
    });
  };

  // ── Delete ─────────────────────────────────────────────────────────────────────

  const deleteSlot = async (localId: string) => {
    const slot = slotsRef.current.find(s => s.localId === localId);
    if (!slot) return;
    if (slot.previewUrl && slot.file) URL.revokeObjectURL(slot.previewUrl);
    if (slot.dbRow?.id) {
      const supabase = getSupabase();
      await supabase.from('product_gallery_images').delete().eq('id', slot.dbRow.id);
    }
    setSlots(prev => {
      const next = prev.filter(s => s.localId !== localId).map((s, i) => ({ ...s, position: i }));
      slotsRef.current = next;
      emit(next);
      return next;
    });
    setSelected(prev => { const n = new Set(prev); n.delete(localId); return n; });
    if (expandedSlot === localId) setExpandedSlot(null);
  };

  const deleteSelected = async () => {
    for (const id of Array.from(selected)) await deleteSlot(id);
    setSelected(new Set());
  };

  // ── Set primary ────────────────────────────────────────────────────────────────

  const setPrimary = (localId: string) => {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.localId === localId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      const reindexed = next.map((s, i) => ({ ...s, position: i }));
      slotsRef.current = reindexed;
      emit(reindexed);
      const supabase = getSupabase();
      reindexed.forEach(s => {
        if (s.dbRow?.id) {
          supabase.from('product_gallery_images')
            .update({ position: s.position, is_primary: s.position === 0 })
            .eq('id', s.dbRow.id);
        }
      });
      return reindexed;
    });
  };

  // ── Drag ───────────────────────────────────────────────────────────────────────

  const onDragEnd = () => {
    if (dragSlot && dragTarget) reorder(dragSlot, dragTarget);
    setDragSlot(null);
    setDragTarget(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────────

  const canAddMore = slots.length < MAX_IMAGES;
  const primarySlot = slots[0] ?? null;
  const gallerySlots = slots.slice(1);
  const hasUploadable = slots.some(s => s.stage === 'idle' && s.file);
  const hasEnhanceable = slots.some(s => (s.stage === 'uploaded' || s.stage === 'idle') && !s.enhancedUrl);

  return (
    <div className="space-y-5">
      {/* Quick Actions Header */}
      {slots.length > 0 && (
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {slots.length} {slots.length === 1 ? 'Image' : 'Images'}
          </h3>
          <div className="flex gap-2">
            {hasEnhanceable && !batchProgress && (
              <button
                type="button"
                onClick={enhanceAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md shadow-emerald-600/10 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Process & Enhance All
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMediaPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <Library className="w-3.5 h-3.5 text-emerald-600" />
              Media Library
            </button>
          </div>
        </div>
      )}

      {/* Batch progress */}
      {batchProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              Processing image {batchProgress.current} of {batchProgress.total}
            </span>
            <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload drop zone */}
      {canAddMore && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); ingestFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all select-none ${
            dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'
          }`}
        >
          <Upload className={`w-6 h-6 mx-auto mb-1.5 ${dragOver ? 'text-emerald-500' : 'text-gray-300'}`} />
          <p className="text-sm font-medium text-gray-700">Drop images or click to browse</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP — up to {MAX_IMAGES} images, max 20 MB each</p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-gray-100" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or</span>
            <div className="h-px w-8 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMediaPicker(true);
            }}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Library className="w-4 h-4 text-emerald-600" />
            Select from Media
          </button>

          <p className="text-[11px] text-amber-600 mt-3">HEIC support coming soon — please export as JPG</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={e => { ingestFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
          />
        </div>
      )}

      {/* Image count recommendation */}
      {slots.length > 0 && (
        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs border ${
          slots.length < 3 ? 'bg-amber-50 border-amber-200' :
          slots.length >= 4 ? 'bg-green-50 border-green-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <Info className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${slots.length < 3 ? 'text-amber-500' : 'text-green-600'}`} />
          <span className={slots.length < 3 ? 'text-amber-700' : 'text-green-700'}>
            {slots.length < 3
              ? `${slots.length} of ${MAX_IMAGES} — add at least 3. Listings with 4+ images convert significantly better.`
              : slots.length >= 4
              ? `${slots.length} images — great! Recommended: Front, Back, Ingredients, Nutrition, Close-up, Lifestyle.`
              : `${slots.length} images — add 1 more to reach the recommended minimum.`}
          </span>
        </div>
      )}

      {/* Primary image */}
      {primarySlot && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Primary Image</p>
          <SlotCard
            slot={primarySlot}
            isPrimary
            isExpanded={expandedSlot === primarySlot.localId}
            isSelected={selected.has(primarySlot.localId)}
            isDragTarget={dragTarget === primarySlot.localId}
            onToggleSelect={() => setSelected(p => { const n = new Set(p); n.has(primarySlot.localId) ? n.delete(primarySlot.localId) : n.add(primarySlot.localId); return n; })}
            onExpand={() => setExpandedSlot(p => p === primarySlot.localId ? null : primarySlot.localId)}
            onDelete={() => deleteSlot(primarySlot.localId)}
            onUpload={() => uploadOnly(primarySlot.localId)}
            onEnhance={() => enhanceSlot(primarySlot.localId)}
            onCommit={c => commitChoice(primarySlot.localId, c)}
            onDragStart={() => setDragSlot(primarySlot.localId)}
            onDragEnter={() => setDragTarget(primarySlot.localId)}
            onDragEnd={onDragEnd}
          />
        </section>
      )}

      {/* Gallery images */}
      {gallerySlots.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gallery Images</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallerySlots.map(slot => (
              <SlotCard
                key={slot.localId}
                slot={slot}
                isPrimary={false}
                isExpanded={expandedSlot === slot.localId}
                isSelected={selected.has(slot.localId)}
                isDragTarget={dragTarget === slot.localId}
                onToggleSelect={() => setSelected(p => { const n = new Set(p); n.has(slot.localId) ? n.delete(slot.localId) : n.add(slot.localId); return n; })}
                onExpand={() => setExpandedSlot(p => p === slot.localId ? null : slot.localId)}
                onDelete={() => deleteSlot(slot.localId)}
                onUpload={() => uploadOnly(slot.localId)}
                onEnhance={() => enhanceSlot(slot.localId)}
                onCommit={c => commitChoice(slot.localId, c)}
                onSetPrimary={() => setPrimary(slot.localId)}
                onDragStart={() => setDragSlot(slot.localId)}
                onDragEnter={() => setDragTarget(slot.localId)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> Drag to reorder
          </p>
        </section>
      )}

      {/* Batch actions */}
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {canAddMore && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Add Images
              </button>
              <button type="button" onClick={() => setShowMediaPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Library className="w-3.5 h-3.5 text-emerald-600" /> Select from Media
              </button>
            </>
          )}

          {hasUploadable && !batchProgress && (
            <button type="button" onClick={uploadAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Upload All
            </button>
          )}

          {hasEnhanceable && !batchProgress && (
            <button type="button" onClick={enhanceAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 active:scale-95">
              <Sparkles className="w-3.5 h-3.5" /> Process & Enhance All
            </button>
          )}

          {gallerySlots.length > 0 && (
            <button type="button" onClick={() => gallerySlots[0] && setPrimary(gallerySlots[0].localId)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Star className="w-3.5 h-3.5" /> Set First As Primary
            </button>
          )}

          {selected.size > 0 && (
            <button type="button" onClick={deleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selected.size})
            </button>
          )}
        </div>
      )}
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

// ── ValidationReportPanel ─────────────────────────────────────────────────────

function FieldRow({ label, field }: { label: string; field: FieldValidation }) {
  return (
    <div className="flex items-start justify-between gap-2 text-[11px]">
      <span className="text-gray-500 font-medium w-24 flex-shrink-0">{label}</span>
      <span className={`flex-1 truncate font-mono ${field.passed ? 'text-gray-700' : 'text-red-700'}`}>
        {field.value || <span className="italic text-gray-300">not detected</span>}
        {!field.passed && field.matched && (
          <span className="text-red-400"> → {field.matched}</span>
        )}
      </span>
      {field.passed ? (
        <span className="flex items-center gap-0.5 text-green-600 font-semibold flex-shrink-0">
          <Check className="w-3 h-3" /> Protected
        </span>
      ) : (
        <span className="flex items-center gap-0.5 text-red-600 font-semibold flex-shrink-0">
          <AlertTriangle className="w-3 h-3" /> Changed
        </span>
      )}
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

function ValidationReportPanel({ validation, passed }: { validation: ValidationReport; passed: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${
      passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
        passed ? 'text-green-700' : 'text-red-700'
      }`}>
        {passed ? 'Enhancement Approved — Critical Text Protected' : 'Enhancement Rejected — Critical Text Changed'}
      </p>
      <FieldRow label="Brand" field={validation.brand} />
      <FieldRow label="Product Name" field={validation.productName} />
      <FieldRow label="Weight" field={validation.weight} />
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

// ── DiagnosticsPanel ──────────────────────────────────────────────────────────

function DiagnosticsPanel({ diag }: { diag: ApiDiagnostics }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 text-[10px]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="font-semibold uppercase tracking-wider">API Diagnostics</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-2.5 py-2 space-y-1 font-mono">
          <Row label="Endpoint" value={diag.endpoint} />
          <Row label="Model" value={diag.model} />
          <Row label="Status" value={String(diag.responseStatus)} highlight={diag.responseStatus >= 400 ? 'red' : 'green'} />
          {Object.entries(diag.params)
            .filter(([k]) => k !== 'prompt')
            .map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
          {diag.errorMessage && <Row label="Error" value={diag.errorMessage} highlight="red" />}
        </div>
      )}
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 w-16 flex-shrink-0">{label}</span>
      <span className={`break-all ${highlight === 'red' ? 'text-red-600' : highlight === 'green' ? 'text-green-600' : 'text-gray-700'}`}>
        {value}
      </span>
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

// ── SlotCard ───────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: GallerySlot;
  isPrimary: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isDragTarget: boolean;
  onToggleSelect: () => void;
  onExpand: () => void;
  onDelete: () => void;
  onUpload: () => void;
  onEnhance: () => void;
  onCommit: (choice: 'original' | 'enhanced') => void;
  onSetPrimary?: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function SlotCard({
  slot, isPrimary, isExpanded, isSelected, isDragTarget,
  onToggleSelect, onExpand, onDelete, onUpload, onEnhance, onCommit,
  onSetPrimary, onDragStart, onDragEnter, onDragEnd,
}: SlotCardProps) {
  const busy = slot.stage === 'uploading' || slot.stage === 'enhancing';

  // Upload button: show when file is selected and not yet uploaded
  const canUpload = slot.stage === 'idle' && !!slot.file;

  // Enhance button: show when we have a valid public URL and no enhanced version yet,
  // OR when enhance failed and we can retry.
  // Also show for 'done' as a reprocess option.
  const hasPublicUrl = isPublicStorageUrl(slot.uploadedUrl);
  const canEnhance = (slot.stage === 'uploaded' && hasPublicUrl && !slot.enhancedUrl)
    || (slot.stage === 'idle' && !!slot.file); // will auto-upload then enhance
  const canReprocess = slot.stage === 'done';
  const canRetry = slot.stage === 'failed' || slot.stage === 'ocr_failed';

  // Show "Please upload first" hint when trying to enhance without a public URL
  const showUploadFirst = slot.stage === 'idle' && !slot.file && !hasPublicUrl;

  return (
    <div
      draggable={!busy}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      className={`relative rounded-2xl border bg-white overflow-hidden transition-all ${
        isDragTarget ? 'border-emerald-500 shadow-lg scale-[1.02]' :
        isSelected   ? 'border-emerald-400 shadow-md' :
        isPrimary    ? 'border-gray-200 shadow-sm' :
        'border-gray-200'
      } ${isPrimary ? 'col-span-full' : ''}`}
    >
      {/* Drag handle */}
      {!busy && (
        <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Select checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        className={`absolute top-2 right-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white/90 border-gray-300 hover:border-emerald-400'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute top-2 left-8 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          <Star className="w-2.5 h-2.5" /> Primary
        </div>
      )}

      {/* Image area */}
      <div
        className={`relative bg-gray-50 cursor-pointer ${isPrimary ? 'h-52' : 'aspect-square'}`}
        onClick={onExpand}
      >
        {slot.previewUrl ? (
          <img
            src={slot.previewUrl}
            alt=""
            className="w-full h-full object-contain p-3"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[10px] font-medium">No preview</span>
          </div>
        )}

        <StagePill stage={slot.stage} />

        {busy && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-3 space-y-2.5">
          {/* Pipeline stage indicator */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 flex-wrap">
            {(['idle','uploading','uploaded','enhancing','done'] as PipelineStage[]).map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`${
                  slot.stage === s ? 'text-gray-700' :
                  isAfterStage(slot.stage, s) ? 'text-emerald-600' : ''
                }`}>
                  {stageLabel(s)}
                </span>
                {i < arr.length - 1 && <span className="text-gray-200">›</span>}
              </span>
            ))}
          </div>

          {/* Error message */}
          {slot.error && (
            <div className="flex items-start gap-1.5 text-xs bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 break-words">{slot.error}</span>
            </div>
          )}

          {/* "Upload first" hint */}
          {showUploadFirst && (
            <div className="flex items-start gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
              <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">Please upload the image first before running AI enhancement.</span>
            </div>
          )}

          {/* URL info */}
          {slot.uploadedUrl && (
            <div className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-1 font-mono truncate">
              {slot.uploadedUrl.length > 60 ? '…' + slot.uploadedUrl.slice(-55) : slot.uploadedUrl}
            </div>
          )}

      {/* OCR choice commit buttons — only for ocr_failed or done with ocr_warning */}
          {slot.stage === 'ocr_failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-2">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Enhancement Rejected</p>
              <p className="text-xs text-red-600">{slot.error}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => commitChoice(slot.localId, 'original')}
                  className="flex-1 px-3 py-1.5 text-[10px] font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Keep Original
                </button>
                <button
                  type="button"
                  onClick={() => onEnhance()}
                  className="px-3 py-1.5 text-[10px] font-bold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Retry AI
                </button>
              </div>
            </div>
          )}

          {/* Validation report — shown for done and ocr_failed */}
          {(slot.stage === 'done' || slot.stage === 'ocr_failed') && slot.validation && (
            <ValidationReportPanel validation={slot.validation} passed={slot.stage === 'done'} />
          )}

          {/* API diagnostics — shown when diagnostics are available */}
          {slot.diagnostics && (
            <DiagnosticsPanel diag={slot.diagnostics} />
          )}

          {/* Action row */}
          <div className="flex gap-1.5 flex-wrap">
            {canUpload && (
              <button type="button" onClick={onUpload}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                <Upload className="w-3 h-3" /> Upload
              </button>
            )}
            {canEnhance && (
              <button type="button" onClick={onEnhance}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                <Sparkles className="w-3 h-3" /> {slot.stage === 'idle' ? 'Upload & Process' : 'Process & Enhance'}
              </button>
            )}
            {canReprocess && (
              <button type="button" onClick={onEnhance}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                <RefreshCw className="w-3 h-3" /> Reprocess
              </button>
            )}
            {canRetry && (
              <button type="button"
                onClick={slot.failedStage === 'upload' || slot.failedStage === 'storage' || slot.failedStage === 'preview'
                  ? onUpload
                  : onEnhance}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
            {!isPrimary && onSetPrimary && (
              <button type="button" onClick={onSetPrimary}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors">
                <Star className="w-3 h-3" /> Set Primary
              </button>
            )}
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Collapsed quick actions */}
      {!isExpanded && !busy && (
        <div className="px-2 pb-2 pt-1.5 flex gap-1">
          {canUpload && (
            <button type="button" onClick={e => { e.stopPropagation(); onUpload(); }}
              className="flex-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-1 hover:bg-blue-100 transition-colors">
              Upload
            </button>
          )}
          {canEnhance && (
            <button type="button" onClick={e => { e.stopPropagation(); onEnhance(); }}
              className="flex-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1 hover:bg-emerald-100 transition-colors">
              {slot.stage === 'idle' ? 'Process' : 'Process'}
            </button>
          )}
          {canReprocess && (
            <button type="button" onClick={e => { e.stopPropagation(); onEnhance(); }}
              className="flex-1 text-[10px] font-semibold text-gray-600 border border-gray-200 rounded-lg py-1 hover:bg-gray-50 transition-colors">
              Reprocess
            </button>
          )}
          {slot.stage === 'uploaded' && !canEnhance && (
            <span className="flex-1 text-center text-[10px] font-semibold text-blue-600 flex items-center justify-center gap-0.5 py-1">
              <Check className="w-2.5 h-2.5" /> Uploaded
            </span>
          )}
          {slot.stage === 'done' && !canReprocess && (
            <span className="flex-1 text-center text-[10px] font-semibold text-green-600 flex items-center justify-center gap-0.5 py-1">
              <Check className="w-2.5 h-2.5" /> Enhanced
            </span>
          )}
          {slot.stage === 'ocr_warning' && (
            <button type="button" onClick={e => { e.stopPropagation(); onExpand(); }}
              className="flex-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1 hover:bg-amber-100 transition-colors">
              Review
            </button>
          )}
          {canRetry && (
            <button type="button"
              onClick={e => {
                e.stopPropagation();
                slot.failedStage === 'upload' || slot.failedStage === 'storage' ? onUpload() : onEnhance();
              }}
              className="flex-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg py-1 hover:bg-red-100 transition-colors">
              Retry
            </button>
          )}
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      {showMediaPicker && (
        <MediaPicker
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_ORDER: PipelineStage[] = ['idle', 'uploading', 'uploaded', 'enhancing', 'done'];

function isAfterStage(current: PipelineStage, reference: PipelineStage) {
  return STAGE_ORDER.indexOf(current) > STAGE_ORDER.indexOf(reference);
}

function stageLabel(s: PipelineStage): string {
  const labels: Record<PipelineStage, string> = {
    idle: 'Ready', uploading: 'Upload', uploaded: 'Uploaded',
    enhancing: 'Enhance', done: 'Done', ocr_warning: 'Review',
    ocr_failed: 'OCR', failed: 'Failed',
  };
  return labels[s];
}
