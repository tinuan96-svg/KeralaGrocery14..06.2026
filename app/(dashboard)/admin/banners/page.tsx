'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import {
  fetchAllBanners, fetchBannerStats, upsertBanner, deleteBanner,
  uploadBannerImage, BANNER_TYPE_META,
  type PromoBanner, type BannerType, type BannerStats,
} from '@/lib/services/bannerService';
import { Plus, Trash2, Eye, EyeOff, Loader as Loader2, CreditCard as Edit2, ChartBar as BarChart2, Image as ImageIcon, Upload, X, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';

// ── Banner type options ───────────────────────────────────────────────────────

const BANNER_TYPES: BannerType[] = [
  'product_promotion','flash_deal','cashback_promotion',
  'free_delivery','seasonal','new_arrivals','brand_promotion',
  'marketing_strip',
  'marketing_square',
];

const GRADIENT_PRESETS = [
  { label: 'Deep Green',  value: 'linear-gradient(135deg, #064e3b 0%, #0B5D3B 55%, #065f46 100%)' },
  { label: 'Flash Red',   value: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #b91c1c 100%)' },
  { label: 'Royal Blue',  value: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #1e40af 100%)' },
  { label: 'Amber',       value: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #92400e 100%)' },
  { label: 'Teal',        value: 'linear-gradient(135deg, #042f2e 0%, #0f766e 55%, #115e59 100%)' },
  { label: 'Charcoal',    value: 'linear-gradient(135deg, #111827 0%, #374151 55%, #1f2937 100%)' },
];

// ── Empty form ────────────────────────────────────────────────────────────────

const emptyForm = (): Partial<PromoBanner> => ({
  title:       '',
  subtitle:    '',
  cta_text:    'Shop Now',
  cta_link:    '/products',
  bg_color:    '#0B5D3B',
  bg_gradient: GRADIENT_PRESETS[0].value,
  text_color:  'light',
  banner_type: 'product_promotion',
  display_order: 0,
  start_date:  null,
  end_date:    null,
  is_active:   true,
  image_url:   null,
  image_alt:   null,
  mobile_image_url: null,
});

// ── Mini preview ──────────────────────────────────────────────────────────────

function BannerPreview({ form }: { form: Partial<PromoBanner> }) {
  const bg = form.bg_gradient ?? form.bg_color ?? '#0B5D3B';
  const isDark = form.text_color === 'dark';
  return (
    <div
      className="rounded-xl overflow-hidden flex items-center gap-4 px-4 py-3 mb-4"
      style={{ background: bg, minHeight: 72 }}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-extrabold leading-tight truncate ${isDark ? 'text-gray-900' : 'text-white'}`}>
          {form.title || 'Banner Title'}
        </p>
        {form.subtitle && (
          <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-gray-700' : 'text-white/80'}`}>
            {form.subtitle}
          </p>
        )}
        <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isDark ? 'bg-black/10 text-gray-800' : 'bg-white/20 text-white'
        }`}>
          {form.cta_text || 'CTA'}
          <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>
      {form.image_url && (
        <div className="relative w-14 h-14 flex-shrink-0">
          <Image src={form.image_url} alt="preview" fill className="object-contain" unoptimized />
        </div>
      )}
    </div>
  );
}

// ── Edit/Create modal ─────────────────────────────────────────────────────────

function BannerModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<PromoBanner>;
  onSave: (b: PromoBanner) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<PromoBanner>>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof PromoBanner, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadBannerImage(file);
    if (url) set('image_url', url);
    else setError('Image upload failed');
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { setError('Title is required'); return; }
    if (!form.cta_link?.trim()) { setError('CTA link is required'); return; }
    setError(null);
    setSaving(true);
    const result = await upsertBanner({
      ...form,
      title:    form.title!,
      cta_text: form.cta_text || 'Shop Now',
      cta_link: form.cta_link!,
    });
    setSaving(false);
    if (result) onSave(result);
    else setError('Save failed — please try again');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10 rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-base font-extrabold text-gray-900">
            {initial.id ? 'Edit Banner' : 'New Banner'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Live preview */}
          <BannerPreview form={form} />

          {/* Title */}
          <Field label="Banner Title *">
            <input
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Flash Deals This Week"
              className={INPUT_CLS}
            />
          </Field>

          {/* Subtitle */}
          <Field label="Subtitle">
            <input
              value={form.subtitle ?? ''}
              onChange={e => set('subtitle', e.target.value)}
              placeholder="e.g. Save up to 30% on selected products"
              className={INPUT_CLS}
            />
          </Field>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA Text">
              <input
                value={form.cta_text ?? ''}
                onChange={e => set('cta_text', e.target.value)}
                placeholder="Shop Now"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="CTA Link *">
              <input
                value={form.cta_link ?? ''}
                onChange={e => set('cta_link', e.target.value)}
                placeholder="/products"
                className={INPUT_CLS}
              />
            </Field>
          </div>

          {/* Banner type */}
          <Field label="Banner Type">
            <select
              value={form.banner_type ?? 'product_promotion'}
              onChange={e => set('banner_type', e.target.value as BannerType)}
              className={INPUT_CLS}
            >
              {BANNER_TYPES.map(t => (
                <option key={t} value={t}>{BANNER_TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>

          {/* Background */}
          <Field label="Background Gradient">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {GRADIENT_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('bg_gradient', p.value)}
                  className={`h-8 rounded-lg transition-all border-2 ${form.bg_gradient === p.value ? 'border-gray-900 scale-105' : 'border-transparent'}`}
                  style={{ background: p.value }}
                  title={p.label}
                />
              ))}
            </div>
            <input
              value={form.bg_gradient ?? ''}
              onChange={e => set('bg_gradient', e.target.value)}
              placeholder="Custom CSS gradient or leave blank to use color"
              className={`${INPUT_CLS} font-mono text-[11px]`}
            />
          </Field>

          {/* Fallback color + text color */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fallback Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.bg_color ?? '#0B5D3B'}
                  onChange={e => set('bg_color', e.target.value)}
                  className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  value={form.bg_color ?? '#0B5D3B'}
                  onChange={e => set('bg_color', e.target.value)}
                  className={`${INPUT_CLS} flex-1`}
                />
              </div>
            </Field>
            <Field label="Text Color">
              <select
                value={form.text_color ?? 'light'}
                onChange={e => set('text_color', e.target.value as 'light' | 'dark')}
                className={INPUT_CLS}
              >
                <option value="light">Light (white text)</option>
                <option value="dark">Dark (dark text)</option>
              </select>
            </Field>
          </div>

          {/* Image upload */}
          <Field label="Banner Image">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  value={form.image_url ?? ''}
                  onChange={e => set('image_url', e.target.value)}
                  placeholder="https://... or upload below"
                  className={INPUT_CLS}
                />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
            </div>
            {form.image_url && (
              <div className="mt-2 flex gap-3 items-start">
                <div className="relative w-20 h-20 border rounded-xl overflow-hidden bg-gray-50">
                  <Image src={form.image_url} alt="preview" fill className="object-contain" unoptimized />
                  <button
                    onClick={() => set('image_url', null)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] uppercase font-bold text-gray-400">Image SEO Alt Text</Label>
                  <input
                    value={form.image_alt ?? ''}
                    onChange={e => set('image_alt', e.target.value)}
                    placeholder="e.g. Best Kerala Banana Chips UK"
                    className={`${INPUT_CLS} mt-1`}
                  />
                </div>
              </div>
            )}
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date (optional)">
              <input
                type="date"
                value={form.start_date ?? ''}
                onChange={e => set('start_date', e.target.value || null)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="End Date (optional)">
              <input
                type="date"
                value={form.end_date ?? ''}
                onChange={e => set('end_date', e.target.value || null)}
                className={INPUT_CLS}
              />
            </Field>
          </div>

          {/* Display order */}
          <Field label="Display Order">
            <input
              type="number"
              value={form.display_order ?? 0}
              onChange={e => set('display_order', parseInt(e.target.value) || 0)}
              className={INPUT_CLS}
            />
          </Field>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-[#0B5D3B] hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Saving…' : (initial.id ? 'Save Changes' : 'Create Banner')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-green-500 bg-white';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BannersPage() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [stats, setStats]     = useState<Map<string, BannerStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PromoBanner> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, s] = await Promise.all([fetchAllBanners(), fetchBannerStats()]);
    setBanners(b);
    const m = new Map<string, BannerStats>();
    s.forEach(x => m.set(x.banner_id, x));
    setStats(m);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (banner: PromoBanner) => {
    setToggling(banner.id);
    await upsertBanner({ ...banner, is_active: !banner.is_active });
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner permanently?')) return;
    setDeleting(id);
    await deleteBanner(id);
    setBanners(prev => prev.filter(b => b.id !== id));
    setDeleting(null);
  };

  const handleMove = async (banner: PromoBanner, dir: 'up' | 'down') => {
    const idx  = banners.findIndex(b => b.id === banner.id);
    const swap = dir === 'up' ? banners[idx - 1] : banners[idx + 1];
    if (!swap) return;
    await Promise.all([
      upsertBanner({ ...banner, display_order: swap.display_order }),
      upsertBanner({ ...swap,   display_order: banner.display_order }),
    ]);
    const next = [...banners];
    next[dir === 'up' ? idx - 1 : idx + 1] = { ...banner, display_order: swap.display_order };
    next[idx] = { ...swap, display_order: banner.display_order };
    setBanners(next);
  };

  const handleSaved = (saved: PromoBanner) => {
    setBanners(prev => {
      const existing = prev.findIndex(b => b.id === saved.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setEditing(null);
  };

  const totalViews  = Array.from(stats.values()).reduce((s, x) => s + x.views,  0);
  const totalClicks = Array.from(stats.values()).reduce((s, x) => s + x.clicks, 0);
  const overallCtr  = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotional Banners</h1>
          <p className="text-gray-400 text-sm mt-1">Manage the homepage carousel banners</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(v => !v)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold transition-colors ${
              showStats ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" /> Analytics
          </button>
          <button
            onClick={() => setEditing(emptyForm())}
            className="flex items-center gap-1.5 px-4 h-9 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> New Banner
          </button>
        </div>
      </div>

      {/* Analytics overview */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Views',  value: totalViews.toLocaleString() },
            { label: 'Total Clicks', value: totalClicks.toLocaleString() },
            { label: 'Overall CTR',  value: `${overallCtr}%` },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Banner list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No banners yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, idx) => {
            const st  = stats.get(banner.id);
            const bg  = banner.bg_gradient ?? banner.bg_color;
            const meta = BANNER_TYPE_META[banner.banner_type];

            return (
              <div
                key={banner.id}
                className={`bg-gray-900 border rounded-2xl overflow-hidden transition-opacity ${
                  banner.is_active ? 'border-gray-700' : 'border-gray-800 opacity-60'
                }`}
              >
                <div className="flex gap-0">
                  {/* Color swatch */}
                  <div className="w-2 flex-shrink-0 rounded-l-2xl" style={{ background: bg }} />

                  <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleMove(banner, 'up')}
                        disabled={idx === 0}
                        className="w-5 h-4 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-20 text-[10px]"
                      >▲</button>
                      <button
                        onClick={() => handleMove(banner, 'down')}
                        disabled={idx === banners.length - 1}
                        className="w-5 h-4 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-20 text-[10px]"
                      >▼</button>
                    </div>

                    {/* Image thumbnail */}
                    {banner.image_url ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ background: bg }}>
                        <Image src={banner.image_url} alt="" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: bg }} />
                    )}

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{banner.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {banner.subtitle && (
                          <p className="text-[11px] text-gray-400 truncate max-w-[240px]">{banner.subtitle}</p>
                        )}
                        {(banner.start_date || banner.end_date) && (
                          <p className="text-[10px] text-gray-500">
                            {banner.start_date ?? '∞'} → {banner.end_date ?? '∞'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    {showStats && st && (
                      <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-500 flex-shrink-0">
                        <span>{st.views.toLocaleString()} views</span>
                        <span>{st.clicks.toLocaleString()} clicks</span>
                        <span className="text-emerald-400 font-bold">{st.ctr}% CTR</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggle(banner)}
                        disabled={toggling === banner.id}
                        title={banner.is_active ? 'Deactivate' : 'Activate'}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        {toggling === banner.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          : banner.is_active
                            ? <Eye className="h-4 w-4 text-emerald-400" />
                            : <EyeOff className="h-4 w-4 text-gray-500" />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => setEditing(banner)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-gray-300" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={deleting === banner.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-900/60 transition-colors"
                      >
                        {deleting === banner.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                          : <Trash2 className="h-4 w-4 text-red-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4 text-center">
        {banners.filter(b => b.is_active).length} of {banners.length} banners active · carousel rotates every 5s
      </p>

      {/* Modal */}
      {editing && (
        <BannerModal
          initial={editing}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
