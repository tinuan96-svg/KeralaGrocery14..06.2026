'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader as Loader2, CircleAlert as AlertCircle, Image as ImageIcon, GripVertical } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  show_on_homepage: boolean;
  sort_order: number;
}

type FormState = {
  name: string;
  display_name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  show_on_homepage: boolean;
  sort_order: string;
};

const emptyForm = (): FormState => ({
  name: '',
  display_name: '',
  description: '',
  image_url: '',
  is_active: true,
  show_on_homepage: false,
  sort_order: '0',
});

function slugify(text: string) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('categories')
      .select('id, name, slug, display_name, description, image_url, is_active, show_on_homepage, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (err) setError(err.message);
    else setCategories((data ?? []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
    setUploadFile(null);
    setUploadPreview(null);
    setModalMode('create');
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({
      name: cat.name,
      display_name: cat.display_name ?? '',
      description: cat.description ?? '',
      image_url: cat.image_url ?? '',
      is_active: cat.is_active,
      show_on_homepage: cat.show_on_homepage,
      sort_order: String(cat.sort_order ?? 0),
    });
    setFormError(null);
    setUploadFile(null);
    setUploadPreview(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setModalMode(null);
    setEditTarget(null);
    setUploadFile(null);
    setUploadPreview(null);
  };

  const handleFileSelect = (file: File) => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (categoryId: string): Promise<string | null> => {
    if (!uploadFile) return form.image_url || null;
    setUploading(true);
    try {
      const supabase = getSupabase();
      const ext = uploadFile.name.split('.').pop() ?? 'jpg';
      const path = `categories/${categoryId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, uploadFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Category name is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const supabase = getSupabase();
      const slug = slugify(form.name);

      if (modalMode === 'create') {
        const { data: created, error: iErr } = await supabase
          .from('categories')
          .insert({
            name: form.name.trim(),
            slug,
            display_name: form.display_name.trim() || null,
            description: form.description.trim() || null,
            image_url: form.image_url.trim() || null,
            is_active: form.is_active,
            show_on_homepage: form.show_on_homepage,
            sort_order: parseInt(form.sort_order) || 0,
          })
          .select('id')
          .single();
        if (iErr) throw new Error(iErr.message);

        // Upload image if selected
        if (uploadFile && created?.id) {
          const imgUrl = await uploadImage(created.id);
          if (imgUrl) {
            await supabase.from('categories').update({ image_url: imgUrl }).eq('id', created.id);
          }
        }

        showToast('Category created');
      } else if (modalMode === 'edit' && editTarget) {
        let imgUrl = form.image_url.trim() || null;
        if (uploadFile) imgUrl = await uploadImage(editTarget.id);

        const { error: uErr } = await supabase
          .from('categories')
          .update({
            name: form.name.trim(),
            slug,
            display_name: form.display_name.trim() || null,
            description: form.description.trim() || null,
            image_url: imgUrl,
            is_active: form.is_active,
            show_on_homepage: form.show_on_homepage,
            sort_order: parseInt(form.sort_order) || 0,
          })
          .eq('id', editTarget.id);
        if (uErr) throw new Error(uErr.message);
        showToast('Category updated');
      }

      closeModal();
      await loadCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = getSupabase();

    // Check if any products use this category
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', deleteTarget.id)
      .eq('is_deleted', false);

    if ((count ?? 0) > 0) {
      showToast(`Cannot delete: ${count} product${count !== 1 ? 's' : ''} use this category`, 'err');
      setDeleteTarget(null);
      setDeleting(false);
      return;
    }

    const { error: dErr } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
    if (dErr) showToast(dErr.message, 'err');
    else { showToast('Category deleted'); await loadCategories(); }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const effectiveImage = uploadPreview ?? (form.image_url || null);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Categories</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage product categories shown on the storefront</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-10">Img</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Description</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-20">Order</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-20">Status</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3"><div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-32 animate-pulse" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 bg-gray-100 rounded w-48 animate-pulse" /></td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                  No categories yet. Click &quot;New Category&quot; to add one.
                </td>
              </tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    {cat.display_name && cat.display_name !== cat.name && (
                      <p className="text-xs text-gray-400">{cat.display_name}</p>
                    )}
                    <p className="text-[10px] text-gray-300 font-mono">{cat.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <p className="text-xs text-gray-500 line-clamp-2">{cat.description ?? '—'}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-xs text-gray-500">{cat.sort_order ?? 0}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {cat.is_active ? 'active' : 'inactive'}
                      </span>
                      {cat.show_on_homepage && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          homepage
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && categories.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modalMode === 'create' ? 'New Category' : `Edit: ${editTarget?.name}`}
              </h2>
              <button onClick={closeModal} disabled={saving} className="text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rice & Grains"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
                {form.name && (
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">slug: {slugify(form.name)}</p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Display Name <span className="font-normal text-gray-400">(optional override)</span>
                </label>
                <input
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="Shown on storefront if different from Name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of this category"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category Image</label>

                {effectiveImage && (
                  <div className="mb-2 flex justify-center">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={effectiveImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />

                {!uploadFile ? (
                  <>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setDragOver(false);
                        const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
                        if (f) handleFileSelect(f);
                      }}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                        dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                      }`}
                    >
                      <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-gray-300" />
                      <p className="text-xs font-medium text-gray-600">Drop image or click to browse</p>
                    </div>
                    <div className="mt-2">
                      <input
                        value={form.image_url}
                        onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                        placeholder="Or paste image URL"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{uploadFile.name}</span>
                    </div>
                    <button
                      onClick={() => { if (uploadPreview) URL.revokeObjectURL(uploadPreview); setUploadFile(null); setUploadPreview(null); }}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Lower = shown first</p>
                </div>
                <div className="flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_on_homepage}
                      onChange={e => setForm(f => ({ ...f, show_on_homepage: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm text-gray-700">Show on homepage</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={closeModal}
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
                {modalMode === 'create' ? 'Create Category' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="font-bold text-gray-900 mb-2">Delete category?</h3>
            <p className="text-sm text-gray-600 mb-4">
              &quot;{deleteTarget.name}&quot; will be permanently deleted. Products in this category will have no category assigned.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 inline-flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
